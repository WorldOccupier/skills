"""The short form a transcript is reduced to: who said what, and one line per tool call."""

from __future__ import annotations

from dataclasses import dataclass

USER = "user"
ASSISTANT = "assistant"
TOOL = "tool"
SUMMARY = "summary"

FILE_EDITING_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
FILE_PATH_KEYS = ("file_path", "notebook_path")
TOOL_DETAIL_KEYS = (*FILE_PATH_KEYS, "path", "description", "command", "pattern", "query", "url")
TOOL_DETAIL_LIMIT = 100


@dataclass(frozen=True)
class Entry:
    role: str
    text: str
    edited_file: str | None = None


def tool_entry(name: str, arguments: dict) -> Entry:
    detail = next((str(arguments[key]) for key in TOOL_DETAIL_KEYS if arguments.get(key)), "")
    detail = " ".join(detail.split())[:TOOL_DETAIL_LIMIT]
    edited_file = next((arguments[key] for key in FILE_PATH_KEYS if arguments.get(key)), None)
    return Entry(TOOL, f"{name} {detail}".strip(), edited_file if name in FILE_EDITING_TOOLS else None)


def is_injected_text(text: str) -> bool:
    """Harness-added context (reminders, slash-command echoes) starts with a tag."""
    return text.lstrip().startswith("<")
