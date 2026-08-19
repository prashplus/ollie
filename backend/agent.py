"""
Ollie — LangGraph Agent with dual-model routing.

Architecture:
  1. If an image is attached → send to vision model (llava) for description
  2. Feed text (+ optional image description) to the agentic model (llama3.1)
     with tools bound via create_react_agent
  3. Return the final response text

Uses LangGraph's create_react_agent for the ReAct tool-calling loop.
LangSmith tracing is auto-enabled when env vars are set.
"""

import base64
import logging
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from backend.config import settings
from backend.tools import ALL_TOOLS

logger = logging.getLogger("ollie.agent")

# ── System prompt ────────────────────────────────────────────
SYSTEM_PROMPT = """You are Ollie, a smart, helpful, and friendly local family home assistant.

CORE INSTRUCTIONS:
1. ALWAYS provide the actual factual findings from tools in your response. For news, list the top 3-4 headlines clearly with bullet points. For weather, provide the temperature, city, and conditions. For notes, show the actual note texts.
2. NEVER respond with vague placeholders like "Here is the news, want me to summarize?" without actually presenting the information first.
3. Keep answers concise, clear, and natural.
4. Use tools whenever appropriate:
   - News & current events (e.g., "tell me current news", "what's happening today", "tech news", "sports news", "headlines"): use get_current_news.
   - Web search & online facts (e.g., "who is...", "what is...", "search for...", definitions, recipes, lookups): use search_the_web.
   - Weather queries (e.g., "weather in blr", "is it raining?", "weather in London"): use get_weather_info.
   - Time/date queries (e.g., "what time is it", "what is today's date"): use get_local_time.
   - Notes/lists (e.g., "save note...", "add to shopping list", "what are my notes", "delete note 1"): use save_family_note, get_family_notes, or delete_family_note.
   - Reminders/timers (e.g., "remind me in 10 mins to check oven", "list reminders"): use set_reminder or list_reminders.
   - Document search: use search_local_documents.
   - Camera/visual queries: describe or answer based on the visual context provided.
"""

# ── Singleton model instances ────────────────────────────────
_text_model = None
_vision_model = None
_agent = None
_checkpointer = None


def _get_text_model() -> ChatOllama:
    """Get or create the text/agentic model."""
    global _text_model
    if _text_model is None:
        _text_model = ChatOllama(
            model=settings.ollie_text_model,
            base_url=settings.ollama_base_url,
            temperature=0.3,
            num_predict=512,
        )
        logger.info("Text model initialized: %s", settings.ollie_text_model)
    return _text_model


def _get_vision_model() -> ChatOllama:
    """Get or create the vision model."""
    global _vision_model
    if _vision_model is None:
        _vision_model = ChatOllama(
            model=settings.ollie_vision_model,
            base_url=settings.ollama_base_url,
            temperature=0.5,
        )
        logger.info("Vision model initialized: %s", settings.ollie_vision_model)
    return _vision_model


def _get_agent():
    """Get or create the LangGraph ReAct agent."""
    global _agent, _checkpointer
    if _agent is None:
        _checkpointer = MemorySaver()
        model = _get_text_model()
        _agent = create_react_agent(
            model,
            ALL_TOOLS,
            checkpointer=_checkpointer,
            prompt=SYSTEM_PROMPT,
        )
        logger.info("LangGraph agent created with %d tools.", len(ALL_TOOLS))
    return _agent


# ── Vision processing ───────────────────────────────────────

async def describe_image(image_base64: str, user_prompt: str = "") -> str:
    """
    Send an image to the vision model and get a description.

    Args:
        image_base64: Base64-encoded JPEG image.
        user_prompt: Optional user prompt about the image.

    Returns:
        Text description of the image.
    """
    import asyncio

    vision_model = _get_vision_model()

    prompt_text = user_prompt or "Describe what you see in this image in detail."

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt_text},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
            },
        ]
    )

    def _invoke():
        return vision_model.invoke([message])

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, _invoke)
    description = response.content
    logger.info("Vision description: %s", description[:100])
    return description


# ── Main agent invocation ───────────────────────────────────

async def run_agent(
    text: str,
    image_base64: str | None = None,
    thread_id: str = "family-room",
) -> str:
    """
    Run the Ollie agent with text input and optional image.

    Processing flow:
    1. If image is present → get description from vision model
    2. Combine text + image description
    3. Run through LangGraph ReAct agent with tools

    Args:
        text: User's text input.
        image_base64: Optional base64-encoded image.
        thread_id: Session thread ID for memory persistence.

    Returns:
        Agent's text response.
    """
    import asyncio

    # Step 1: Process image if present
    augmented_text = text
    if image_base64:
        try:
            image_desc = await describe_image(image_base64, text)
            augmented_text = (
                f"{text}\n\n"
                f"[I can see the following in the camera image: {image_desc}]"
            )
            logger.info("Augmented prompt with vision description.")
        except Exception as e:
            logger.error("Vision processing failed: %s", e)
            augmented_text = f"{text}\n\n[Note: Image was provided but could not be processed: {e}]"

    # Step 2: Run through the agent
    agent = _get_agent()
    config = {"configurable": {"thread_id": thread_id}}

    def _invoke():
        result = agent.invoke(
            {"messages": [HumanMessage(content=augmented_text)]},
            config=config,
        )
        # Extract the last AI message content
        messages = result.get("messages", [])
        if messages:
            return messages[-1].content
        return "I'm sorry, I couldn't process that request."

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, _invoke)
    logger.info("Agent response: %s", response[:100])
    return response


def set_active_models(text_model: str | None = None, vision_model: str | None = None) -> dict:
    """Dynamically switch active text and/or vision models."""
    global _text_model, _vision_model, _agent
    if text_model and text_model != settings.ollie_text_model:
        logger.info("Switching text model: %s -> %s", settings.ollie_text_model, text_model)
        settings.ollie_text_model = text_model
        _text_model = None
        _agent = None  # Re-create agent with new model
    if vision_model and vision_model != settings.ollie_vision_model:
        logger.info("Switching vision model: %s -> %s", settings.ollie_vision_model, vision_model)
        settings.ollie_vision_model = vision_model
        _vision_model = None
    return {
        "text_model": settings.ollie_text_model,
        "vision_model": settings.ollie_vision_model,
    }


async def get_available_models() -> list[dict]:
    """Retrieve detailed list of available models installed in local Ollama."""
    import urllib.request
    import json

    try:
        url = f"{settings.ollama_base_url}/api/tags"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            models = []
            for m in data.get("models", []):
                size_gb = round(m.get("size", 0) / (1024 ** 3), 1)
                models.append({
                    "name": m.get("name"),
                    "size_gb": size_gb,
                    "modified_at": m.get("modified_at", ""),
                    "family": m.get("details", {}).get("family", ""),
                    "parameter_size": m.get("details", {}).get("parameter_size", ""),
                })
            return models
    except Exception as e:
        logger.warning("Failed to fetch Ollama models: %s", e)
        return []


async def check_ollama_health() -> dict:
    """Check if Ollama is running and required models are available."""
    import urllib.request
    import json

    result = {
        "ollama_running": False,
        "text_model_available": False,
        "vision_model_available": False,
        "embedding_model_available": False,
        "models": [],
    }

    try:
        url = f"{settings.ollama_base_url}/api/tags"
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            result["ollama_running"] = True
            model_names = [m["name"] for m in data.get("models", [])]
            result["models"] = model_names

            # Check for required models (match by prefix)
            text_base = settings.ollie_text_model.split(":")[0]
            vision_base = settings.ollie_vision_model.split(":")[0]
            embed_base = settings.ollie_embedding_model.split(":")[0]

            result["text_model_available"] = any(
                m.startswith(text_base) for m in model_names
            )
            result["vision_model_available"] = any(
                m.startswith(vision_base) for m in model_names
            )
            result["embedding_model_available"] = any(
                m.startswith(embed_base) for m in model_names
            )
    except Exception as e:
        logger.warning("Ollama health check failed: %s", e)

    return result
