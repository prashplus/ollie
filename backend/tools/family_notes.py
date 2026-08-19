"""
Ollie Tool — Family Notes (SQLite CRUD).
Allows the LLM agent to save, read, and delete shared family notes.
"""

from langchain_core.tools import tool
from backend import database as db


@tool
def save_family_note(
    content: str,
    author: str = "Family",
    category: str = "general",
) -> str:
    """Save a new family note to the shared board.

    Use this tool when someone asks you to remember something, save a note,
    add to the shopping list, write down a reminder, etc.

    Args:
        content: The note content to save.
        author: Who is saving the note (default: 'Family').
        category: Category like 'shopping', 'todo', 'reminder', 'general'.

    Returns:
        Confirmation message with the note ID.
    """
    try:
        note_id = db.add_note(content, author, category)
        return f"Note saved successfully with ID {note_id}: '{content}' [category: {category}, by: {author}]"
    except Exception as e:
        return f"Failed to save note: {e}"


@tool
def get_family_notes(category: str = "") -> str:
    """Read family notes from the shared board.

    Use this tool when someone asks to see their notes, shopping list,
    reminders, or any saved information.

    Args:
        category: Optional category filter ('shopping', 'todo', 'reminder', 'general').
                  Leave empty to get all notes.

    Returns:
        Formatted list of notes.
    """
    try:
        cat = category if category else None
        notes = db.get_notes(cat)

        if not notes:
            return "No notes found." + (f" (category: {category})" if category else "")

        lines = [f"Family Notes ({len(notes)} found):"]
        for note in notes:
            lines.append(
                f"  • [ID {note['id']}] ({note['category']}) {note['content']} "
                f"— by {note['author']}, {note['created_at']}"
            )
        return "\n".join(lines)
    except Exception as e:
        return f"Failed to retrieve notes: {e}"


@tool
def delete_family_note(note_id: int) -> str:
    """Delete a family note by its ID.

    Use this tool when someone asks to remove or delete a specific note.

    Args:
        note_id: The ID of the note to delete.

    Returns:
        Confirmation or error message.
    """
    try:
        success = db.delete_note(note_id)
        if success:
            return f"Note {note_id} deleted successfully."
        return f"Note {note_id} not found."
    except Exception as e:
        return f"Failed to delete note: {e}"
