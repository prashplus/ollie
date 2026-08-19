"""
Ollie Tool — Local Time & Weather.
Provides the current local time/date and basic weather information.
"""

from datetime import datetime
from langchain_core.tools import tool


@tool
def get_local_time() -> str:
    """Get the current local date and time.

    Use this tool when someone asks what time it is, what day it is,
    or the current date.

    Returns:
        Formatted current date and time string.
    """
    now = datetime.now()
    return (
        f"🕐 Current local time: {now.strftime('%I:%M %p')}\n"
        f"📅 Date: {now.strftime('%A, %B %d, %Y')}\n"
        f"📆 Week: {now.strftime('Week %W of %Y')}"
    )


@tool
def get_weather_info(location: str = "") -> str:
    """Get weather information for a location.

    Use this tool when someone asks about the weather, temperature,
    or forecast. This tool attempts to use the free Open-Meteo API
    for basic weather data. Works fully offline by returning a
    helpful fallback message.

    Args:
        location: City or location name (default: uses system locale).

    Returns:
        Weather information string or fallback message.
    """
    try:
        import urllib.request
        import json

        # Use Open-Meteo's free geocoding + weather API (no API key needed)
        if not location:
            location = "New York"  # Fallback default

        # Step 1: Geocode the location
        geo_url = (
            f"https://geocoding-api.open-meteo.com/v1/search?"
            f"name={urllib.parse.quote(location)}&count=1&language=en&format=json"
        )
        import urllib.parse
        with urllib.request.urlopen(geo_url, timeout=5) as response:
            geo_data = json.loads(response.read().decode())

        if "results" not in geo_data or not geo_data["results"]:
            return f"🌤️ Could not find location '{location}'. Try a major city name."

        result = geo_data["results"][0]
        lat, lon = result["latitude"], result["longitude"]
        city_name = result.get("name", location)
        country = result.get("country", "")

        # Step 2: Fetch current weather
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
            f"&temperature_unit=celsius&wind_speed_unit=kmh"
        )
        with urllib.request.urlopen(weather_url, timeout=5) as response:
            weather_data = json.loads(response.read().decode())

        current = weather_data.get("current", {})
        temp = current.get("temperature_2m", "N/A")
        humidity = current.get("relative_humidity_2m", "N/A")
        wind = current.get("wind_speed_10m", "N/A")
        code = current.get("weather_code", -1)

        condition = _weather_code_to_text(code)

        return (
            f"🌤️ Weather in {city_name}, {country}:\n"
            f"  🌡️ Temperature: {temp}°C\n"
            f"  💧 Humidity: {humidity}%\n"
            f"  💨 Wind: {wind} km/h\n"
            f"  ☁️ Condition: {condition}"
        )

    except Exception as e:
        return (
            f"🌤️ Weather info unavailable (offline or error: {e}).\n"
            f"This feature requires internet access to the free Open-Meteo API."
        )


def _weather_code_to_text(code: int) -> str:
    """Convert WMO weather code to human-readable text."""
    codes = {
        0: "Clear sky ☀️",
        1: "Mainly clear 🌤️",
        2: "Partly cloudy ⛅",
        3: "Overcast ☁️",
        45: "Foggy 🌫️",
        48: "Rime fog 🌫️",
        51: "Light drizzle 🌦️",
        53: "Moderate drizzle 🌧️",
        55: "Dense drizzle 🌧️",
        61: "Slight rain 🌦️",
        63: "Moderate rain 🌧️",
        65: "Heavy rain 🌧️",
        71: "Slight snow 🌨️",
        73: "Moderate snow ❄️",
        75: "Heavy snow ❄️",
        80: "Slight showers 🌦️",
        81: "Moderate showers 🌧️",
        82: "Violent showers ⛈️",
        95: "Thunderstorm ⛈️",
        96: "Thunderstorm with hail ⛈️",
    }
    return codes.get(code, f"Unknown (code: {code})")
