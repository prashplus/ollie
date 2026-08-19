"""
Ollie — SQLite database for family notes and reminders.
Uses standard library sqlite3 for thread-safe, fast synchronous operations
accessible from LangChain tools and FastAPI handlers alike.
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from backend.config import settings

DB_PATH = settings.database_path


def _get_connection() -> sqlite3.Connection:
    """Get a SQLite connection configured with row factory."""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS family_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT NOT NULL DEFAULT 'Family',
                content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'general',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                trigger_time TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.commit()


# ── Family Notes ─────────────────────────────────────────────

def add_note(content: str, author: str = "Family", category: str = "general") -> int:
    """Add a family note. Returns the new note ID."""
    with _get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO family_notes (author, content, category) VALUES (?, ?, ?)",
            (author, content, category),
        )
        conn.commit()
        return cursor.lastrowid


def get_notes(category: str | None = None, limit: int = 50) -> list[dict]:
    """Retrieve family notes, optionally filtered by category."""
    with _get_connection() as conn:
        if category:
            cursor = conn.execute(
                "SELECT * FROM family_notes WHERE category = ? ORDER BY created_at DESC LIMIT ?",
                (category, limit),
            )
        else:
            cursor = conn.execute(
                "SELECT * FROM family_notes ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def delete_note(note_id: int) -> bool:
    """Delete a note by ID. Returns True if a row was deleted."""
    with _get_connection() as conn:
        cursor = conn.execute("DELETE FROM family_notes WHERE id = ?", (note_id,))
        conn.commit()
        return cursor.rowcount > 0


# ── Reminders ────────────────────────────────────────────────

def add_reminder(message: str, minutes_from_now: int) -> dict:
    """Create a reminder that triggers N minutes from now."""
    trigger_time = datetime.now() + timedelta(minutes=minutes_from_now)
    trigger_str = trigger_time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO reminders (message, trigger_time) VALUES (?, ?)",
            (message, trigger_str),
        )
        conn.commit()
        return {
            "id": cursor.lastrowid,
            "message": message,
            "trigger_time": trigger_str,
        }


def get_active_reminders() -> list[dict]:
    """Get all active (not yet dismissed) reminders."""
    with _get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM reminders WHERE active = 1 ORDER BY trigger_time ASC"
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_due_reminders() -> list[dict]:
    """Get reminders whose trigger time has passed and are still active."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with _get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM reminders WHERE active = 1 AND trigger_time <= ?",
            (now,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def dismiss_reminder(reminder_id: int) -> bool:
    """Mark a reminder as inactive."""
    with _get_connection() as conn:
        cursor = conn.execute(
            "UPDATE reminders SET active = 0 WHERE id = ?", (reminder_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
