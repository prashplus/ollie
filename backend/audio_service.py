"""
Ollie — Audio Service: Faster-Whisper STT + Piper TTS wrappers.

STT: Loads a WhisperModel at startup (singleton) and transcribes audio bytes.
TTS: Uses piper-tts Python library to synthesize speech to WAV bytes.
"""

import io
import wave
import tempfile
import logging
import os
import sys
import struct
from pathlib import Path

logger = logging.getLogger("ollie.audio")


def _setup_nvidia_dll_paths():
    """Ensure CUDA and cuDNN DLLs from pip wheels are discoverable on Windows."""
    if sys.platform != "win32":
        return
    try:
        venv_nvidia = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
        if venv_nvidia.is_dir():
            dll_dirs = [str(p / "bin") for p in venv_nvidia.glob("*") if (p / "bin").is_dir()]
            if dll_dirs:
                os.environ["PATH"] = ";".join(dll_dirs) + ";" + os.environ.get("PATH", "")
                for d in dll_dirs:
                    try:
                        os.add_dll_directory(d)
                    except Exception:
                        pass
    except Exception as e:
        logger.debug("Failed to configure nvidia DLL paths: %s", e)


_setup_nvidia_dll_paths()

# ── Global singletons (loaded lazily) ────────────────────────
_whisper_model = None
_piper_voice = None


def get_whisper_model():
    """Lazily load the Faster-Whisper model with GPU acceleration and CPU fallback."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        from backend.config import settings

        _setup_nvidia_dll_paths()

        device = settings.ollie_whisper_device
        if device == "auto":
            try:
                import ctranslate2
                device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
            except Exception:
                device = "cpu"

        compute_type = settings.ollie_whisper_compute_type
        if compute_type == "auto" or (compute_type == "int8" and device == "cuda"):
            compute_type = "float16" if device == "cuda" else "int8"

        logger.info(
            "Loading Whisper model '%s' on %s (compute_type=%s)...",
            settings.ollie_whisper_model, device, compute_type,
        )

        try:
            _whisper_model = WhisperModel(
                settings.ollie_whisper_model,
                device=device,
                compute_type=compute_type,
            )
            logger.info("Whisper model loaded successfully on %s.", device)
        except Exception as e:
            logger.warning("Failed to load Whisper on %s (%s). Falling back to CPU...", device, e)
            _whisper_model = WhisperModel(
                settings.ollie_whisper_model,
                device="cpu",
                compute_type="int8",
            )
            logger.info("Whisper model loaded on CPU fallback.")

    return _whisper_model


def get_piper_voice():
    """Lazily load the Piper TTS voice."""
    global _piper_voice
    if _piper_voice is None:
        from backend.config import settings
        try:
            from piper import PiperVoice

            data_dir = Path(settings.ollie_tts_data_dir)
            data_dir.mkdir(parents=True, exist_ok=True)
            voice_name = settings.ollie_tts_voice

            # Look for the voice model in the data directory
            model_path = data_dir / f"{voice_name}.onnx"
            config_path = data_dir / f"{voice_name}.onnx.json"

            if not model_path.exists():
                logger.info(
                    "Piper voice model '%s' not found. Attempting to download...",
                    voice_name,
                )
                _download_piper_voice(voice_name, data_dir)

            logger.info("Loading Piper voice from %s...", model_path)
            _piper_voice = PiperVoice.load(str(model_path), config_path=str(config_path))
            logger.info("Piper voice loaded successfully.")
        except ImportError:
            logger.warning(
                "piper-tts not installed. TTS will be unavailable. "
                "Install with: pip install piper-tts"
            )
            _piper_voice = None
        except Exception as e:
            logger.error("Failed to load Piper voice: %s", e)
            _piper_voice = None
    return _piper_voice


def _download_piper_voice(voice_name: str, data_dir: Path) -> None:
    """Download a Piper voice model from the official GitHub releases."""
    import urllib.request
    import json

    # Parse voice name: en_US-amy-medium -> en/en_US/amy/medium/
    parts = voice_name.split("-")
    lang_code = parts[0]  # en_US
    lang = lang_code.split("_")[0]  # en
    speaker = parts[1] if len(parts) > 1 else "amy"
    quality = parts[2] if len(parts) > 2 else "medium"

    base_url = (
        f"https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/"
        f"{lang}/{lang_code}/{speaker}/{quality}/"
    )

    model_url = f"{base_url}{voice_name}.onnx"
    config_url = f"{base_url}{voice_name}.onnx.json"

    model_path = data_dir / f"{voice_name}.onnx"
    config_path = data_dir / f"{voice_name}.onnx.json"

    logger.info("Downloading Piper voice model from %s ...", model_url)
    urllib.request.urlretrieve(model_url, str(model_path))

    logger.info("Downloading Piper voice config from %s ...", config_url)
    urllib.request.urlretrieve(config_url, str(config_path))

    logger.info("Piper voice '%s' downloaded to %s", voice_name, data_dir)


# ── STT: Transcribe audio ───────────────────────────────────

async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribe audio bytes (WAV or WebM) to text using Faster-Whisper.

    The audio is written to a temp file since Faster-Whisper expects a file path.
    Runs in a thread executor to avoid blocking the event loop.
    """
    import asyncio

    def _transcribe() -> str:
        model = get_whisper_model()
        if model is None:
            return "[STT unavailable]"

        # Write to temp file — Faster-Whisper handles format detection
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments, info = model.transcribe(
                tmp_path,
                beam_size=5,
                language="en",
                vad_filter=True,
            )
            text = " ".join(segment.text.strip() for segment in segments)
            logger.info(
                "Transcribed %d bytes -> '%s' (lang=%s, prob=%.2f)",
                len(audio_bytes), text, info.language, info.language_probability,
            )
            return text.strip() or "[no speech detected]"
        except Exception as e:
            logger.warning("Primary STT failed (%s), attempting CPU fallback...", e)
            try:
                global _whisper_model
                from faster_whisper import WhisperModel
                from backend.config import settings
                _whisper_model = WhisperModel(settings.ollie_whisper_model, device="cpu", compute_type="int8")
                segments, info = _whisper_model.transcribe(tmp_path, beam_size=5, language="en", vad_filter=True)
                text = " ".join(segment.text.strip() for segment in segments)
                logger.info("CPU fallback transcribed: '%s'", text)
                return text.strip() or "[no speech detected]"
            except Exception as ex:
                logger.error("CPU fallback transcription failed: %s", ex)
                return f"[transcription error: {ex}]"
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _transcribe)


# ── TTS: Synthesize speech ───────────────────────────────────

async def synthesize_speech(text: str) -> bytes | None:
    """
    Convert text to WAV audio bytes using Piper TTS.

    Returns WAV bytes or None if TTS is unavailable.
    Runs in a thread executor to avoid blocking the event loop.
    """
    import asyncio

    def _synthesize() -> bytes | None:
        voice = get_piper_voice()
        if voice is None:
            logger.warning("TTS unavailable — no Piper voice loaded.")
            return None

        try:
            # Synthesize to an in-memory WAV buffer
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, "wb") as wav_file:
                voice.synthesize(text, wav_file)

            wav_bytes = wav_buffer.getvalue()
            logger.info("Synthesized %d chars → %d bytes WAV", len(text), len(wav_bytes))
            return wav_bytes
        except Exception as e:
            logger.error("TTS synthesis failed: %s", e)
            return None

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _synthesize)


# ── Utility: Convert WebM/Opus to WAV ───────────────────────

async def convert_webm_to_wav(webm_bytes: bytes) -> bytes:
    """
    Convert WebM/Opus audio from browser MediaRecorder to WAV.
    Uses ffmpeg if available, otherwise returns raw bytes and lets
    Faster-Whisper handle the format.
    """
    import asyncio
    import subprocess
    import shutil

    def _convert() -> bytes:
        if not shutil.which("ffmpeg"):
            # If ffmpeg not available, return as-is
            # Faster-Whisper can handle many formats via its internal decoder
            logger.debug("ffmpeg not found, passing raw audio to Whisper")
            return webm_bytes

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
            tmp_in.write(webm_bytes)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".webm", ".wav")

        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", tmp_in_path,
                    "-ar", "16000", "-ac", "1", "-f", "wav",
                    tmp_out_path,
                ],
                capture_output=True,
                check=True,
                timeout=30,
            )
            with open(tmp_out_path, "rb") as f:
                return f.read()
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.warning("ffmpeg conversion failed (%s), passing raw to Whisper", e)
            return webm_bytes
        finally:
            Path(tmp_in_path).unlink(missing_ok=True)
            Path(tmp_out_path).unlink(missing_ok=True)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _convert)
