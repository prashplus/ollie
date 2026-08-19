# Ollie Tools Package
from backend.tools.family_notes import save_family_note, get_family_notes, delete_family_note
from backend.tools.timer_reminder import set_reminder, list_reminders
from backend.tools.local_time_weather import get_local_time, get_weather_info
from backend.tools.search_docs import search_local_documents
from backend.tools.web_search_news import get_current_news, search_the_web

ALL_TOOLS = [
    save_family_note,
    get_family_notes,
    delete_family_note,
    set_reminder,
    list_reminders,
    get_local_time,
    get_weather_info,
    search_local_documents,
    get_current_news,
    search_the_web,
]
