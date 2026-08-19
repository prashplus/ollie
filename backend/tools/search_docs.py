"""
Ollie Tool — Search Local Documents (ChromaDB + Ollama Embeddings).
Indexes files from the docs/ directory and provides semantic search.
"""

import asyncio
import logging
from pathlib import Path
from langchain_core.tools import tool

logger = logging.getLogger("ollie.search_docs")

# Global vector store reference
_vector_store = None
_indexed_files: set[str] = set()


def _get_vector_store():
    """Lazily initialize the ChromaDB vector store with Ollama embeddings."""
    global _vector_store
    if _vector_store is None:
        from langchain_chroma import Chroma
        from langchain_ollama import OllamaEmbeddings
        from backend.config import settings

        embeddings = OllamaEmbeddings(
            model=settings.ollie_embedding_model,
            base_url=settings.ollama_base_url,
        )
        _vector_store = Chroma(
            collection_name="ollie_docs",
            embedding_function=embeddings,
            persist_directory=settings.chroma_persist_dir,
        )
        logger.info("ChromaDB vector store initialized at %s", settings.chroma_persist_dir)
    return _vector_store


def index_documents() -> int:
    """
    Index any new documents from the docs/ directory into ChromaDB.
    Supports: .txt, .md, .pdf, .csv files.
    Returns the number of newly indexed documents.
    """
    global _indexed_files
    from backend.config import settings
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    docs_dir = Path(settings.docs_dir)
    if not docs_dir.exists():
        docs_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Created docs directory at %s", docs_dir)
        return 0

    # Supported file extensions
    extensions = {".txt", ".md", ".csv"}
    files = [f for f in docs_dir.rglob("*") if f.suffix.lower() in extensions and f.is_file()]

    if not files:
        logger.info("No documents found in %s", docs_dir)
        return 0

    store = _get_vector_store()

    # Check which files are already indexed (by filename metadata)
    try:
        existing = store.get()
        if existing and existing.get("metadatas"):
            _indexed_files = {
                m.get("source", "") for m in existing["metadatas"] if m
            }
    except Exception:
        _indexed_files = set()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )

    new_count = 0
    for file_path in files:
        source_key = str(file_path)
        if source_key in _indexed_files:
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            if not content.strip():
                continue

            # Split into chunks
            from langchain_core.documents import Document
            doc = Document(
                page_content=content,
                metadata={"source": source_key, "filename": file_path.name},
            )
            chunks = text_splitter.split_documents([doc])

            # Add to vector store
            store.add_documents(chunks)
            _indexed_files.add(source_key)
            new_count += len(chunks)
            logger.info("Indexed %s (%d chunks)", file_path.name, len(chunks))

        except Exception as e:
            logger.error("Failed to index %s: %s", file_path, e)

    logger.info("Indexing complete. %d new chunks added.", new_count)
    return new_count


@tool
def search_local_documents(query: str) -> str:
    """Search through locally stored documents for relevant information.

    Use this tool when someone asks about information that might be in their
    personal documents, files, or knowledge base. Documents are stored in
    the local 'docs/' folder.

    Args:
        query: The search query describing what information to find.

    Returns:
        Top matching document excerpts with source filenames.
    """
    try:
        store = _get_vector_store()
        results = store.similarity_search(query, k=3)

        if not results:
            return (
                "📄 No relevant documents found. "
                "Add files to the 'docs/' folder to enable document search."
            )

        lines = [f"📄 Found {len(results)} relevant document excerpts:"]
        for i, doc in enumerate(results, 1):
            source = doc.metadata.get("filename", "unknown")
            excerpt = doc.page_content[:500].strip()
            lines.append(f"\n--- Result {i} (from {source}) ---\n{excerpt}")

        return "\n".join(lines)

    except Exception as e:
        logger.error("Document search failed: %s", e)
        return f"📄 Document search error: {e}"
