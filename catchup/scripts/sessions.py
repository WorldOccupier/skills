"""Finds past Claude Code sessions for a working directory."""

import os
import re
import time
from pathlib import Path

CURRENT_SESSION_ENV_VAR = "CLAUDE_CODE_SESSION_ID"
# Without the env var, a transcript written this recently is assumed to be the live session.
LIVE_SESSION_SECONDS = 120


def project_dir(projects_dir: Path, cwd: str) -> Path:
    return projects_dir / re.sub(r"[^A-Za-z0-9]", "-", cwd)


def past_sessions(projects_dir: Path, cwd: str, environ=os.environ) -> list[Path]:
    """Transcripts for cwd, newest first, without the session that is running right now."""
    transcripts = sorted(project_dir(projects_dir, cwd).glob("*.jsonl"), key=modified, reverse=True)
    current_id = environ.get(CURRENT_SESSION_ENV_VAR)
    if current_id:
        return [path for path in transcripts if path.stem != current_id]
    if transcripts and time.time() - modified(transcripts[0]) < LIVE_SESSION_SECONDS:
        return transcripts[1:]
    return transcripts


def modified(path: Path) -> float:
    return path.stat().st_mtime
