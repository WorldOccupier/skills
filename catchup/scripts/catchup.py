"""Print the end of the previous Claude Code session for this directory, so a new session can pick up from it."""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# Keep __pycache__ folders out of the installed skill.
sys.dont_write_bytecode = True

from entries import SUMMARY, USER  # noqa: E402
from sessions import modified, past_sessions  # noqa: E402
from tail import TailLimits, edited_files, render, select_tail  # noqa: E402
from transcript import read_entries  # noqa: E402

PROJECTS_DIR = Path.home() / ".claude" / "projects"
LIST_LIMIT = 10
EDITED_FILES_SHOWN = 15
PREVIEW_LENGTH = 90


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", default=os.getcwd(), help="project directory the session ran in")
    parser.add_argument("--list", action="store_true", help="list recent past sessions instead of printing one")
    parser.add_argument("--pick", type=int, default=1, help="which past session to print, 1 = most recent")
    parser.add_argument("--session", type=Path, help="print this transcript file instead")
    parser.add_argument("--prompts", type=int, default=3, help="how many of the last user prompts to include")
    parser.add_argument("--chars", type=int, default=12000, help="rough character budget for the tail")
    return parser.parse_args()


def stamp(transcript: Path) -> str:
    return datetime.fromtimestamp(modified(transcript)).strftime("%Y-%m-%d %H:%M")


def last_prompt_preview(transcript: Path) -> str:
    prompts = [entry.text for entry in read_entries(transcript) if entry.role == USER]
    return " ".join(prompts[-1].split())[:PREVIEW_LENGTH] if prompts else "(no prompts)"


def print_list(transcripts: list[Path]) -> None:
    for number, transcript in enumerate(transcripts[:LIST_LIMIT], start=1):
        print(f"{number}. {stamp(transcript)}  {transcript}\n   last prompt: {last_prompt_preview(transcript)}")


def print_tail(transcript: Path, limits: TailLimits) -> None:
    entries = list(read_entries(transcript))
    tail = select_tail(entries, limits)
    total_prompts = sum(entry.role == USER for entry in entries)
    shown_prompts = sum(entry.role == USER for entry in tail)
    print(f"Session: {transcript}  (last active {stamp(transcript)})")
    since_summary = " since the latest compaction summary" if tail and tail[0].role == SUMMARY else ""
    print(f"Showing the last {shown_prompts} of {total_prompts} user prompts{since_summary}. Tool output is left out.\n")
    print(render(tail))
    files = edited_files(entries)
    if files:
        earlier = len(files) - EDITED_FILES_SHOWN
        print("\nFiles edited during the session, most recent last:")
        if earlier > 0:
            print(f"(+{earlier} edited earlier)")
        print("\n".join(f"- {path}" for path in files[-EDITED_FILES_SHOWN:]))


def main() -> None:
    args = parse_args()
    if args.session:
        print_tail(args.session.expanduser(), TailLimits(args.prompts, args.chars))
        return
    sessions = past_sessions(PROJECTS_DIR, args.cwd)
    if not sessions:
        raise SystemExit(f"No past sessions found for {args.cwd}")
    if args.list:
        print_list(sessions)
        return
    if not 1 <= args.pick <= len(sessions):
        raise SystemExit(f"--pick must be between 1 and {len(sessions)}")
    print_tail(sessions[args.pick - 1], TailLimits(args.prompts, args.chars))


if __name__ == "__main__":
    main()
