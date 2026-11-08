"""Turns a Claude Code JSONL transcript into Entries."""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from pathlib import Path

from entries import ASSISTANT, SUMMARY, USER, Entry, is_injected_text, tool_entry

# Commands sent to the agent (skills, custom commands) open with this tag. Harness-only
# commands like /clear or /model open with <command-name> instead and are left out.
AGENT_COMMAND_PREFIX = "<command-message>"
COMMAND_NAME = re.compile(r"<command-name>(.*?)</command-name>", re.DOTALL)
COMMAND_ARGS = re.compile(r"<command-args>(.*?)</command-args>", re.DOTALL)


def read_entries(path: Path) -> Iterator[Entry]:
    for record in read_records(path):
        yield from record_entries(record)


def read_records(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8", errors="replace") as lines:
        for line in lines:
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def record_entries(record: dict) -> list[Entry]:
    if record.get("isCompactSummary"):
        return [Entry(SUMMARY, content_text(record["message"]["content"]))]
    if record.get("isMeta") or record.get("isSidechain"):
        return []
    if record.get("type") == USER:
        return user_entries(content_text(record["message"]["content"]))
    if record.get("type") == ASSISTANT:
        return assistant_entries(record["message"]["content"])
    return []


def content_text(content) -> str:
    if isinstance(content, str):
        return content
    return "\n".join(block.get("text", "") for block in content if block.get("type") == "text")


def user_entries(text: str) -> list[Entry]:
    command = agent_command_prompt(text)
    return [Entry(USER, command)] if command else text_entry(USER, text)


def agent_command_prompt(text: str) -> str | None:
    """Turns a slash-command echo into the prompt the user typed, e.g. "/how does X work"."""
    name = COMMAND_NAME.search(text)
    if not text.lstrip().startswith(AGENT_COMMAND_PREFIX) or not name:
        return None
    args = COMMAND_ARGS.search(text)
    return f"{name.group(1)} {args.group(1) if args else ''}".strip()


def text_entry(role: str, text: str) -> list[Entry]:
    if not text.strip() or is_injected_text(text):
        return []
    return [Entry(role, text.strip())]


def assistant_entries(content: list) -> list[Entry]:
    found = []
    for block in content:
        if block.get("type") == "text":
            found += text_entry(ASSISTANT, block["text"])
        elif block.get("type") == "tool_use":
            found.append(tool_entry(block["name"], block.get("input") or {}))
    return found
