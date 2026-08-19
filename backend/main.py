"""
Ollie — FastAPI Main Server.

Serves the frontend, handles WebSocket interactions,
and provides REST API endpoints for health checks and notes.
"""

import asyncio
import base64
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure UTF-8 output encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend import database as db
from backend import agent as ollie_agent
from backend import audio_service
from backend.tools.search_docs import index_documents

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ollie.server")


# ── Lifespan (startup / shutdown) ────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, clean up on shutdown."""
    logger.info("=" * 60)
    logger.info("  🏠 Ollie Home Assistant — Starting up...")
    logger.info("=" * 60)

    # Ensure directories exist
    settings.ensure_directories()

    # Configure LangSmith tracing if enabled
    settings.configure_langsmith()
    if settings.langsmith_tracing.lower() == "true":
        logger.info("📊 LangSmith tracing ENABLED (project: %s)", settings.langsmith_project)
    else:
        logger.info("📊 LangSmith tracing disabled")

    # Initialize database
    db.init_db()
    logger.info("💾 Database initialized at %s", settings.database_path)

    # Check Ollama health
    health = await ollie_agent.check_ollama_health()
    if health["ollama_running"]:
        logger.info("🦙 Ollama is running. Available models: %s", health["models"])
        if not health["text_model_available"]:
            logger.warning("⚠️  Text model '%s' not found! Run: ollama pull %s",
                          settings.ollie_text_model, settings.ollie_text_model)
        if not health["vision_model_available"]:
            logger.warning("⚠️  Vision model '%s' not found! Run: ollama pull %s",
                          settings.ollie_vision_model, settings.ollie_vision_model)
    else:
        logger.error("❌ Ollama is NOT running at %s", settings.ollama_base_url)

    # Index documents (non-blocking)
    try:
        count = index_documents()
        logger.info("📄 Indexed %d new document chunks from %s", count, settings.docs_dir)
    except Exception as e:
        logger.warning("📄 Document indexing skipped: %s", e)

    # Preload Whisper model in background
    asyncio.get_event_loop().run_in_executor(None, audio_service.get_whisper_model)
    logger.info("🎤 Whisper STT model loading in background...")

    # Start reminder checker
    reminder_task = asyncio.create_task(_reminder_checker())

    logger.info("=" * 60)
    logger.info("  ✅ Ollie is ready at https://%s:%d", settings.host, settings.port)
    logger.info("=" * 60)

    yield

    # Shutdown
    reminder_task.cancel()
    logger.info("👋 Ollie shutting down...")


# ── FastAPI App ──────────────────────────────────────────────

app = FastAPI(
    title="Ollie Home Assistant",
    description="A fully private, local multimodal home assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for development (Vite dev server on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Background Tasks ────────────────────────────────────────

# Store active WebSocket connections for broadcasting reminders
active_connections: list[WebSocket] = []


async def _reminder_checker():
    """Periodically check for due reminders and broadcast them."""
    while True:
        try:
            await asyncio.sleep(30)  # Check every 30 seconds
            due = db.get_due_reminders()
            for reminder in due:
                msg = {
                    "type": "reminder",
                    "content": f"⏰ Reminder: {reminder['message']}",
                }
                for ws in list(active_connections):
                    await _safe_send(ws, msg)
                db.dismiss_reminder(reminder["id"])
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Reminder checker error: %s", e)


# ── WebSocket Handler ────────────────────────────────────────

@app.websocket("/ws/interact")
async def websocket_interact(websocket: WebSocket):
    """
    Main bidirectional WebSocket for all interactions.

    Client → Server messages:
      { "type": "text",  "content": "..." }
      { "type": "audio", "data": "<base64>" }
      { "type": "image", "data": "<base64>", "prompt": "..." }

    Server → Client messages:
      { "type": "text_chunk",    "content": "..." }
      { "type": "text_complete", "content": "..." }
      { "type": "audio_chunk",   "data": "<base64>" }
      { "type": "transcript",    "content": "..." }
      { "type": "status",        "content": "..." }
      { "type": "reminder",      "content": "..." }
      { "type": "error",         "content": "..." }
    """
    await websocket.accept()
    active_connections.append(websocket)
    client_id = id(websocket)
    logger.info("🔌 WebSocket connected (client %d)", client_id)

    # Session state for this connection
    session_image: str | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "content": "Invalid JSON message",
                }))
                continue

            msg_type = message.get("type", "")
            logger.info("📨 Received %s message from client %d", msg_type, client_id)

            try:
                if msg_type == "text":
                    await _handle_text(websocket, message, session_image)
                    session_image = None  # Clear after use

                elif msg_type == "audio":
                    transcript = await _handle_audio(websocket, message)
                    if transcript and transcript not in ("[no speech detected]", "[STT unavailable]"):
                        # Auto-process the transcript as text
                        await _handle_text(
                            websocket,
                            {"type": "text", "content": transcript},
                            session_image,
                        )
                        session_image = None
                    else:
                        await _safe_send(websocket, {
                            "type": "error",
                            "content": "No clear speech detected. Please tap to speak again.",
                        })

                elif msg_type == "image":
                    session_image = message.get("data", "")
                    prompt = message.get("prompt", "")
                    if prompt:
                        await _handle_text(
                            websocket,
                            {"type": "text", "content": prompt},
                            session_image,
                        )
                        session_image = None
                    else:
                        await _safe_send(websocket, {
                            "type": "status",
                            "content": "📸 Image captured. Send a message to ask about it.",
                        })

                else:
                    await _safe_send(websocket, {
                        "type": "error",
                        "content": f"Unknown message type: {msg_type}",
                    })

            except Exception as e:
                logger.error("Error processing %s: %s", msg_type, e, exc_info=True)
                await _safe_send(websocket, {
                    "type": "error",
                    "content": f"Processing error: {str(e)}",
                })

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket disconnected (client %d)", client_id)
    except Exception as e:
        logger.error("WebSocket error (client %d): %s", client_id, e)
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)


async def _safe_send(websocket: WebSocket, data: dict) -> bool:
    """Safely send JSON message to client if connection is active."""
    try:
        if websocket in active_connections:
            await websocket.send_text(json.dumps(data))
            return True
    except (WebSocketDisconnect, RuntimeError, Exception) as e:
        logger.debug("Client send skipped (disconnected): %s", e)
        if websocket in active_connections:
            active_connections.remove(websocket)
        return False
    return False


async def _handle_text(websocket: WebSocket, message: dict, image_base64: str | None):
    """Process a text message through the agent pipeline."""
    content = message.get("content", "").strip()
    if not content:
        await _safe_send(websocket, {"type": "status", "content": ""})
        return

    # Status: thinking
    await _safe_send(websocket, {
        "type": "status",
        "content": "🤔 Thinking...",
    })

    try:
        # Run agent
        response = await ollie_agent.run_agent(
            text=content,
            image_base64=image_base64,
        )

        # Send complete text response
        await _safe_send(websocket, {
            "type": "text_complete",
            "content": response,
        })
    except Exception as e:
        logger.error("Agent error: %s", e)
        await _safe_send(websocket, {
            "type": "error",
            "content": f"Sorry, could not process request: {str(e)}",
        })
        await _safe_send(websocket, {"type": "status", "content": ""})
        return

    # Generate TTS audio
    await _safe_send(websocket, {
        "type": "status",
        "content": "🔊 Generating speech...",
    })

    try:
        audio_bytes = await audio_service.synthesize_speech(response)
        if audio_bytes:
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            await _safe_send(websocket, {
                "type": "audio_chunk",
                "data": audio_b64,
            })
    except Exception as e:
        logger.warning("TTS failed: %s", e)

    # Clear status
    await _safe_send(websocket, {
        "type": "status",
        "content": "",
    })


async def _handle_audio(websocket: WebSocket, message: dict) -> str | None:
    """Process an audio message through the STT pipeline."""
    audio_data = message.get("data", "")
    if not audio_data:
        return None

    await _safe_send(websocket, {
        "type": "status",
        "content": "🎤 Transcribing...",
    })

    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_data)

        # Convert WebM to WAV if needed
        audio_bytes = await audio_service.convert_webm_to_wav(audio_bytes)

        # Transcribe
        transcript = await audio_service.transcribe_audio(audio_bytes)

        # If transcription failed or returned no speech
        if not transcript or transcript.startswith("[transcription error:"):
            logger.warning("Transcription output: %s", transcript)
            await _safe_send(websocket, {
                "type": "status",
                "content": "",
            })
            return None

        # Send transcript back
        await _safe_send(websocket, {
            "type": "transcript",
            "content": transcript,
        })

        return transcript

    except Exception as e:
        logger.error("STT failed: %s", e)
        await _safe_send(websocket, {
            "type": "error",
            "content": f"Transcription failed: {str(e)}",
        })
        return None


# ── REST API Endpoints ───────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint — verifies Ollama and service status."""
    ollama_health = await ollie_agent.check_ollama_health()
    return JSONResponse({
        "status": "ok",
        "ollama": ollama_health,
        "text_model": settings.ollie_text_model,
        "vision_model": settings.ollie_vision_model,
        "whisper_model": settings.ollie_whisper_model,
        "tts_voice": settings.ollie_tts_voice,
        "langsmith_enabled": settings.langsmith_tracing.lower() == "true",
    })


@app.get("/api/notes")
async def list_notes(category: str | None = None):
    """List family notes."""
    notes = db.get_notes(category)
    return JSONResponse({"notes": notes})


@app.post("/api/notes")
async def create_note(content: str, author: str = "Family", category: str = "general"):
    """Create a new family note via REST."""
    note_id = db.add_note(content, author, category)
    return JSONResponse({"id": note_id, "status": "created"})


@app.get("/api/models")
async def get_models():
    """List available Ollama models and active configuration."""
    models = await ollie_agent.get_available_models()
    return JSONResponse({
        "models": models,
        "active_text_model": settings.ollie_text_model,
        "active_vision_model": settings.ollie_vision_model,
    })


@app.post("/api/models")
async def switch_model(payload: dict):
    """Dynamically switch active LLM or Vision models."""
    text_model = payload.get("text_model")
    vision_model = payload.get("vision_model")
    updated = ollie_agent.set_active_models(text_model, vision_model)
    return JSONResponse({
        "status": "updated",
        "active_text_model": updated["text_model"],
        "active_vision_model": updated["vision_model"],
    })


@app.get("/api/config")
async def get_config():
    """Return safe configuration info for the frontend."""
    return JSONResponse({
        "text_model": settings.ollie_text_model,
        "vision_model": settings.ollie_vision_model,
        "whisper_model": settings.ollie_whisper_model,
        "tts_voice": settings.ollie_tts_voice,
    })


# ── Static file serving (production) ────────────────────────

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Serve index.html for SPA routing
    from starlette.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the SPA — try static file first, then fall back to index.html."""
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    logger.info("📦 Serving frontend from %s", frontend_dist)


# ── Entry point ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    ssl_kwargs = {}
    cert_path = Path(settings.ssl_certfile)
    key_path = Path(settings.ssl_keyfile)

    if cert_path.exists() and key_path.exists():
        ssl_kwargs["ssl_certfile"] = str(cert_path)
        ssl_kwargs["ssl_keyfile"] = str(key_path)
        logger.info("🔒 SSL enabled with %s", cert_path)
    else:
        logger.warning(
            "⚠️  No SSL certs found. Run start.bat to generate them.\n"
            "   Mobile browsers REQUIRE HTTPS for camera/mic access."
        )

    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        **ssl_kwargs,
    )
