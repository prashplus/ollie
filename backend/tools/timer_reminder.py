"""
Ollie Tool — Timer & Reminder.
Allows the LLM agent to set and list reminders stored in SQLite.
"""

from langchain_core.tools import tool
from backend import database as db


@tool
def set_reminder(message: str, minutes_from_now: int = 5) -> str:
    """Set a timed reminder that will trigger after the specified minutes.

    Use this tool when someone asks you to remind them about something,
    set a timer, or alert them in X minutes.

    Args:
        message: What to remind about (e.g., "Check the oven", "Call mom").
        minutes_from_now: Number of minutes from now to trigger (default: 5).

    Returns:
        Confirmation with the scheduled time.
    """
    try:
        result = db.add_reminder(message, minutes_from_now)
        return (
            f"Reminder set (ID {result['id']}): '{message}' "
            f"— will trigger at {result['trigger_time']} "
            f"(in {minutes_from_now} minute{'s' if minutes_from_now != 1 else ''})"
        )
    except Exception as e:
        return f"Failed to set reminder: {e}"


@tool
def list_reminders() -> str:
    """List all active (upcoming) reminders.

    Use this tool when someone asks what reminders are set,
    what timers are running, or what's coming up.

    Returns:
        Formatted list of active reminders.
    """
    try:
        reminders = db.get_active_reminders()

        if not reminders:
            return "No active reminders scheduled."

        lines = [f"Active Reminders ({len(reminders)}):"]
        for r in reminders:
            lines.append(
                f"  • [ID {r['id']}] {r['message']} — triggers at {r['trigger_time']}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Failed to list reminders: {e}"
