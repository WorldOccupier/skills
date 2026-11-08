"""Picks the end of a conversation that is worth reading and renders it compactly."""

from dataclasses import dataclass

from entries import ASSISTANT, SUMMARY, TOOL, USER, Entry

TEXT_LIMITS = {USER: 2000, ASSISTANT: 1500, SUMMARY: 6000}
TOOLS_SHOWN_PER_RUN = 6
LABELS = {USER: "USER", ASSISTANT: "AGENT", SUMMARY: "EARLIER SUMMARY"}


@dataclass(frozen=True)
class TailLimits:
    user_prompts: int
    characters: int


def select_tail(entries: list[Entry], limits: TailLimits) -> list[Entry]:
    """Walk back from the end until enough user prompts, the character budget, or a compaction summary."""
    selected, prompts_seen, characters = [], 0, 0
    for entry in reversed(entries):
        if prompts_seen >= limits.user_prompts or characters >= limits.characters:
            break
        selected.append(entry)
        characters += min(len(entry.text), TEXT_LIMITS.get(entry.role, len(entry.text)))
        prompts_seen += entry.role == USER
        if entry.role == SUMMARY:
            break
    return list(reversed(selected))


def truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n[... {len(text) - limit} more characters cut]"


def render_tool_run(tools: list[Entry]) -> str:
    shown = "; ".join(tool.text for tool in tools[:TOOLS_SHOWN_PER_RUN])
    hidden = len(tools) - TOOLS_SHOWN_PER_RUN
    return f"  (tools: {shown}{f'; +{hidden} more' if hidden > 0 else ''})"


def render(entries: list[Entry]) -> str:
    blocks, tool_run = [], []
    for entry in entries:
        if entry.role == TOOL:
            tool_run.append(entry)
            continue
        if tool_run:
            blocks.append(render_tool_run(tool_run))
            tool_run = []
        blocks.append(f"{LABELS[entry.role]}: {truncate(entry.text, TEXT_LIMITS[entry.role])}")
    if tool_run:
        blocks.append(render_tool_run(tool_run))
    return "\n\n".join(blocks)


def edited_files(entries: list[Entry]) -> list[str]:
    """Each edited file once, ordered by when it was last edited, most recent last."""
    newest_first = dict.fromkeys(entry.edited_file for entry in reversed(entries) if entry.edited_file)
    return list(reversed(newest_first))
