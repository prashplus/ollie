"""
Ollie Tool — Web Search & Live News (Tavily AI + LangChain DuckDuckGo).
Provides live real-time news headlines, web search answers, and encyclopedia summaries.
Supports Tavily API when TAVILY_API_KEY is configured, with zero-config DuckDuckGo & Google News fallbacks.
"""

import json
import logging
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from langchain_core.tools import tool
from backend.config import settings

logger = logging.getLogger("ollie.tools.web_search")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def _get_tavily_client():
    """Get TavilyClient if API key is present."""
    api_key = settings.tavily_api_key or os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from tavily import TavilyClient
        return TavilyClient(api_key=api_key)
    except Exception as e:
        logger.debug("Failed to initialize TavilyClient: %s", e)
        return None


@tool
def get_current_news(topic: str = "") -> str:
    """Get live breaking news headlines and current events.

    Use this tool when someone asks about today's news, current events,
    what's happening in the world, or news on a specific topic (e.g. tech, AI, sports, business, finance).

    Args:
        topic: Optional topic or subject to search for (e.g., 'technology', 'sports', 'India', 'AI').
               Leave empty to get general top breaking news.

    Returns:
        Formatted list of live news headlines with source and publication time.
    """
    topic_clean = topic.strip()

    # Step 1: Try Tavily News Search if API key is configured
    tavily = _get_tavily_client()
    if tavily:
        try:
            query = f"{topic_clean} latest breaking news headlines" if topic_clean else "top world breaking news headlines today"
            res = tavily.search(query=query, topic="news", max_results=5)
            results = res.get("results", [])
            if results:
                lines = [f"📰 Latest News (via Tavily){' for ' + topic_clean if topic_clean else ''}:"]
                for i, r in enumerate(results, 1):
                    title = r.get("title", "Untitled")
                    snippet = r.get("content", "")
                    url = r.get("url", "")
                    lines.append(f"{i}. **{title}**\n   {snippet}\n   Source: {url}")
                return "\n\n".join(lines)
        except Exception as e:
            logger.warning("Tavily news search failed (%s), falling back to Google News RSS...", e)

    # Step 2: Google News RSS (Fast, free, no API key required)
    try:
        if topic_clean:
            url = f"https://news.google.com/rss/search?q={urllib.parse.quote(topic_clean)}&hl=en-US&gl=US&ceid=US:en"
        else:
            url = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"

        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)
        items = root.findall(".//item")[:6]

        if not items:
            return f"No news articles found for '{topic}'."

        header = f"📰 Latest News{' for ' + topic_clean if topic_clean else ''}:"
        lines = [header]

        for i, item in enumerate(items, 1):
            title = item.find("title").text if item.find("title") is not None else "Untitled"
            pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
            source = item.find("source").text if item.find("source") is not None else ""

            date_short = pub_date[:16] if len(pub_date) >= 16 else pub_date
            source_str = f" [{source}]" if source else ""
            date_str = f" ({date_short})" if date_short else ""
            lines.append(f"{i}. {title}{source_str}{date_str}")

        return "\n".join(lines)

    except Exception as e:
        logger.error("Failed to fetch news: %s", e)
        return f"Could not retrieve news (error: {e}). Please ensure internet access is available."


@tool
def search_the_web(query: str) -> str:
    """Search the web for real-time information, answers, facts, or definitions.

    Use this tool when the user asks a question requiring current knowledge,
    facts, explanations, or lookup beyond personal notes.

    Args:
        query: The search query string.

    Returns:
        Summarized search findings from the web.
    """
    if not query.strip():
        return "Search query is empty."

    # Step 1: Try Tavily Search if API key is configured
    tavily = _get_tavily_client()
    if tavily:
        try:
            res = tavily.search(query=query, search_depth="basic", max_results=4, include_answer=True)
            answer = res.get("answer")
            results = res.get("results", [])
            lines = [f"🌐 Web Search Results for '{query}' (via Tavily):"]
            if answer:
                lines.append(f"**Direct Answer**: {answer}\n")
            for i, r in enumerate(results, 1):
                title = r.get("title", "")
                content = r.get("content", "")
                url = r.get("url", "")
                lines.append(f"• **{title}**: {content} ({url})")
            return "\n".join(lines)
        except Exception as e:
            logger.warning("Tavily search failed (%s), falling back to DuckDuckGo...", e)

    # Step 2: Try LangChain's built-in DuckDuckGoSearchRun
    try:
        from langchain_community.tools import DuckDuckGoSearchRun
        ddg_tool = DuckDuckGoSearchRun()
        result = ddg_tool.invoke(query)
        if result and len(result.strip()) > 20:
            return f"🌐 Web Search Results for '{query}':\n{result}"
    except Exception as e:
        logger.debug("LangChain DuckDuckGo tool fallback: %s", e)

    # Step 3: Fallback to DuckDuckGo Instant Answer API
    try:
        ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1&skip_disambig=1"
        req = urllib.request.Request(ddg_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8", errors="replace"))

        abstract = data.get("AbstractText", "").strip()
        source = data.get("AbstractSource", "")
        if abstract:
            return f"🌐 Web Summary ({source}):\n{abstract}"
    except Exception as e:
        logger.debug("DDG API search failed: %s", e)

    # Step 4: Fallback to Wikipedia Summary API
    try:
        wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(query)}"
        req = urllib.request.Request(wiki_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=6) as response:
            wiki_data = json.loads(response.read().decode("utf-8", errors="replace"))

        extract = wiki_data.get("extract", "").strip()
        if extract:
            title = wiki_data.get("title", query)
            return f"🌐 From Wikipedia ({title}):\n{extract}"
    except Exception as e:
        logger.debug("Wikipedia fallback failed: %s", e)

    return f"No specific web results found for '{query}'. Try rephrasing your search query."
