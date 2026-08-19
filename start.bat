@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

echo.
echo ============================================================
echo   Ollie Home Assistant - Launcher (uv powered)
echo ============================================================
echo.

REM --- Step 1: Check prerequisites ---
echo [1/6] Checking prerequisites...

where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] uv not found. Install with: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] uv and Node.js found.

REM --- Step 2: Check Ollama ---
echo.
echo [2/6] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Ollama is NOT running at http://localhost:11434
    echo           Start Ollama first, then re-run this script.
    echo           Required models: llama3.1:8b, llava:7b, nomic-embed-text
    pause
    exit /b 1
)
echo [OK] Ollama is running.

REM --- Step 3: Install Python dependencies with uv ---
echo.
echo [3/6] Syncing Python dependencies (uv)...
uv sync
if %errorlevel% neq 0 (
    echo [ERROR] uv sync failed.
    pause
    exit /b 1
)
echo [OK] Python dependencies ready.

REM --- Step 4: Generate SSL certificates ---
echo.
echo [4/6] Checking SSL certificates...
uv run python backend\scripts\generate_certs.py
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate SSL certificates.
    pause
    exit /b 1
)

REM --- Step 5: Build frontend ---
echo.
echo [5/6] Building frontend...
cd frontend
if not exist "node_modules" (
    call npm install --silent 2>nul
)
call npm run build --silent 2>nul
cd ..
echo [OK] Frontend built.

REM --- Step 6: Start server ---
echo.
echo [6/6] Starting Ollie...

REM Copy .env if not exists
if not exist ".env" (
    copy .env.example .env >nul 2>&1
    echo [INFO] Created .env from .env.example
)

REM Print URL and QR code
uv run python backend\scripts\print_url.py

REM Start the server
uv run python -m backend.main
