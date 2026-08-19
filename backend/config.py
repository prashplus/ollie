"""
Ollie — Centralized configuration via environment variables.
Uses pydantic-settings to load from .env file automatically.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root is one level up from backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """All Ollie configuration, loaded from .env or environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Ollama ───────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollie_text_model: str = "llama3.1:8b"
    ollie_vision_model: str = "llava:7b"

    # ── Whisper STT ──────────────────────────────────────────
    ollie_whisper_model: str = "base"
    ollie_whisper_device: str = "auto"          # "auto", "cpu", "cuda"
    ollie_whisper_compute_type: str = "int8"

    # ── Piper TTS ────────────────────────────────────────────
    ollie_tts_voice: str = "en_US-amy-medium"
    ollie_tts_data_dir: str = str(PROJECT_ROOT / "data" / "piper_voices")

    # ── Database / Storage ───────────────────────────────────
    database_path: str = str(PROJECT_ROOT / "data" / "ollie.db")
    chroma_persist_dir: str = str(PROJECT_ROOT / "data" / "chroma_db")
    docs_dir: str = str(PROJECT_ROOT / "docs")

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    ssl_certfile: str = str(PROJECT_ROOT / "certs" / "cert.pem")
    ssl_keyfile: str = str(PROJECT_ROOT / "certs" / "key.pem")

    # ── LangSmith (optional debugging) ───────────────────────
    langsmith_tracing: str = "false"
    langsmith_api_key: str = ""
    langsmith_project: str = "ollie-home-assistant"

    # ── Embeddings ───────────────────────────────────────────
    ollie_embedding_model: str = "nomic-embed-text"

    # ── Web Search / Tavily (optional) ───────────────────────
    tavily_api_key: str = ""

    def configure_langsmith(self) -> None:
        """Push LangSmith env vars so LangChain auto-detects them."""
        if self.langsmith_tracing.lower() == "true" and self.langsmith_api_key:
            os.environ["LANGSMITH_TRACING"] = "true"
            os.environ["LANGSMITH_API_KEY"] = self.langsmith_api_key
            os.environ["LANGSMITH_PROJECT"] = self.langsmith_project

    def ensure_directories(self) -> None:
        """Create required data directories if they don't exist."""
        for dir_path in [
            self.ollie_tts_data_dir,
            Path(self.database_path).parent,
            self.chroma_persist_dir,
            self.docs_dir,
            Path(self.ssl_certfile).parent,
        ]:
            Path(dir_path).mkdir(parents=True, exist_ok=True)


# Singleton instance
settings = Settings()
