#!/usr/bin/env bash
set -e
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

echo ""
echo " ============================================================"
echo "  🏠  Ollie Home Assistant — Launcher  (uv powered)"
echo " ============================================================"
echo ""

# ── Check prerequisites ────────────────────────────────────
echo " [1/6] Checking prerequisites..."

if ! command -v uv &> /dev/null; then
    echo " ❌ uv not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo " ❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

echo " ✅ uv and Node.js found."

# ── Check Ollama ───────────────────────────────────────────
echo ""
echo " [2/6] Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo " ⚠️  Ollama is NOT running at http://localhost:11434"
    echo "    Start Ollama first, then re-run this script."
    echo "    Required models: llama3.1:8b, llava:7b, nomic-embed-text"
    exit 1
fi
echo " ✅ Ollama is running."

# ── Install Python dependencies with uv ────────────────────
echo ""
echo " [3/6] Syncing Python dependencies (uv)..."
uv sync
echo " ✅ Python dependencies ready."

# ── Generate SSL certificates ──────────────────────────────
echo ""
echo " [4/6] Checking SSL certificates..."
uv run python backend/scripts/generate_certs.py

# ── Build frontend ─────────────────────────────────────────
echo ""
echo " [5/6] Building frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent 2>/dev/null
fi
npm run build --silent 2>/dev/null
cd ..
echo " ✅ Frontend built."

# ── Start server ───────────────────────────────────────────
echo ""
echo " [6/6] Starting Ollie..."

# Copy .env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null
    echo " 📝 Created .env from .env.example"
fi

# Print URL and QR code
uv run python backend/scripts/print_url.py

# Start the server
uv run python -m backend.main
