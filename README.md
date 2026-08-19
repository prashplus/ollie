# 🏠 Ollie — Private Local Multimodal Home Assistant

A fully private, local multimodal home assistant web application that runs on your PC and is accessed over the local network via phone/tablet browsers. No cloud services, no data leaves your network.

![Ollie](https://img.shields.io/badge/Ollie-Home%20Assistant-blue?style=for-the-badge)
![Privacy](https://img.shields.io/badge/100%25-Private-green?style=for-the-badge)
![Local](https://img.shields.io/badge/Runs-Locally-orange?style=for-the-badge)

## ✨ Features

- **🎤 Voice Interaction** — Push-to-talk with real-time waveform visualization
- **📸 Vision / Camera** — Show Ollie something and ask about it
- **💬 Smart Chat** — Streaming text responses with tool-augmented reasoning
- **📝 Family Notes** — Shared notes board (shopping lists, todos, reminders)
- **⏰ Reminders** — Set timed reminders that notify all connected devices
- **🌤️ Weather** — Get weather info via the free Open-Meteo API
- **📄 Document Search** — Drop files in `docs/` and search them by meaning
- **🔊 Text-to-Speech** — Auto-playback of spoken responses
- **📊 LangSmith Debugging** — Optional tracing for agent debugging
- **📱 PWA** — Installable on phone/tablet home screens

## 🏗️ Architecture

```
Phone/Tablet Browser (HTTPS)
        │
        ▼
   FastAPI + WebSocket (0.0.0.0:8000)
        │
        ├── Faster-Whisper (STT)
        ├── LangGraph Agent ←── ChatOllama (llama3.1:8b) + Tools
        │        │                    │
        │        ├── FamilyNotesTool (SQLite)
        │        ├── TimerReminderTool (SQLite)
        │        ├── LocalTimeWeatherTool (Open-Meteo)
        │        └── SearchLocalDocsTool (ChromaDB)
        │
        ├── ChatOllama (llava:7b) ← Vision queries
        ├── Piper TTS
        └── LangSmith (optional tracing)
```

## 📋 Prerequisites

1. **uv** (Python package manager) — `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"` or `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. **Node.js 18+** — [nodejs.org](https://nodejs.org)
3. **Ollama** — [ollama.com](https://ollama.com)
4. **ffmpeg** (optional, for audio conversion) — [ffmpeg.org](https://ffmpeg.org)

> **Note:** Python is managed automatically by `uv` — no manual Python install needed.

### Pull Required Ollama Models

```bash
ollama pull llama3.1:8b
ollama pull llava:7b
ollama pull nomic-embed-text
```

## 🚀 Quick Start

### Windows
```bash
start.bat
```

### Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

The launcher will:
1. ✅ Check prerequisites (uv, Node, Ollama)
2. 🔒 Generate self-signed SSL certificates (required for mic/camera on mobile)
3. 📦 Install dependencies (`uv sync` + `npm install`)
4. 🏗️ Build the frontend
5. 📱 Print a QR code with the network URL
6. 🚀 Start the server

### Open on Your Phone
1. Scan the QR code or navigate to `https://<your-pc-ip>:8000`
2. Accept the self-signed certificate warning
3. Start talking to Ollie!

## ⚙️ Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key settings:
| Variable | Default | Description |
|---|---|---|
| `OLLIE_TEXT_MODEL` | `llama3.1:8b` | Ollama model for text/tools |
| `OLLIE_VISION_MODEL` | `llava:7b` | Ollama model for image analysis |
| `OLLIE_WHISPER_MODEL` | `base` | Faster-Whisper model size |
| `OLLIE_TTS_VOICE` | `en_US-amy-medium` | Piper TTS voice |
| `LANGSMITH_TRACING` | `false` | Enable LangSmith debugging |
| `TAVILY_API_KEY` | `""` | Optional Tavily AI search key (free 1,000 queries/mo) |

## 🌐 Web Search & Live News

Ollie supports two web search modes:
- **Zero-config (Default)**: Uses LangChain DuckDuckGo Search + Google News RSS (100% free, no key needed).
- **Tavily AI Search (Optional, Recommended)**: Sign up at [tavily.com](https://tavily.com) for a free API key (1,000 searches/mo) and paste it into `.env`:
  ```
  TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxx
  ```

## 📊 LangSmith Integration

For debugging agent behavior:

1. Sign up at [smith.langchain.com](https://smith.langchain.com) (free tier available)
2. Set in `.env`:
   ```
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=your-api-key
   LANGSMITH_PROJECT=ollie-home-assistant
   ```
3. All agent runs, tool calls, and model invocations will appear in your LangSmith dashboard

## 📂 Project Structure

```
ollie/
├── backend/
│   ├── main.py              # FastAPI server + WebSocket handler
│   ├── agent.py             # LangGraph agent with dual-model routing
│   ├── audio_service.py     # Faster-Whisper STT + Piper TTS
│   ├── config.py            # Centralized settings
│   ├── database.py          # SQLite async access
│   ├── tools/               # Agent tools
│   │   ├── family_notes.py
│   │   ├── timer_reminder.py
│   │   ├── local_time_weather.py
│   │   └── search_docs.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks (WebSocket, Audio, Camera)
│   │   └── utils/           # Helper functions
│   ├── vite.config.js
│   └── package.json
├── certs/                   # SSL certs (auto-generated)
├── data/                    # SQLite DB + ChromaDB (auto-created)
├── docs/                    # Drop documents here for search
├── start.bat                # Windows launcher
├── start.sh                 # Linux/Mac launcher
└── .env.example             # Configuration template
```

## 📄 Document Search

Drop `.txt`, `.md`, or `.csv` files into the `docs/` folder. Ollie automatically indexes them using ChromaDB with local Ollama embeddings. Ask questions about your documents naturally:

> "What does my lease agreement say about pets?"

## 🔒 Security Notes

- **Self-signed SSL**: Required for mobile browser mic/camera access. Accept the certificate warning on first visit.
- **LAN Only**: Ollie binds to `0.0.0.0` for LAN access but is NOT designed for public internet exposure.
- **No Cloud**: All processing happens locally — STT, LLM, TTS, embeddings, and storage.

## 📝 License

MIT
