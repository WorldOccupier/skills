### Skills

This repo contains a bunch of skills that I have found myself using frequently. Each folder holds one skill as a `SKILL.md` file, following the Agent Skills format, so they work with Claude Code, Codex, Cursor, pi, and other agents that support it.

### Install

```sh
npx skills add WorldOccupier/skills -g
```

To update later:

```sh
npx skills update -g
```

### What's inside

| Skill | What it does |
| --- | --- |
| `bro` | Restates the last message in plain language, with no jargon. |
| `code-review` | Reviews changes against the `implement` practices and tries to break them. |
| `explainer-video` | Makes a short motion-graphics explainer video in code with fframes. |
| `how` | Explains how something in the codebase works, starting with an overview and going deeper on request. |
| `implement` | My coding practices for writing and changing code. |
| `nvim-agent-comments` | Reads and acts on comments left with the nvim-agent-comments Neovim plugin. |
| `prove-it-works` | Verifies a change works before calling it done, and leaves a script you can run to check it yourself. |
| `reflect` | Reviews the session and lists what could be automated with new skills. |
| `reproduce-and-fix` | Reproduces a bug, fixes the root cause, and explains the fix visually. |
| `side-effect` | Finds what a change would break, how users would notice, and gives a verdict on whether it is safe. |
| `unslop` | Cuts AI tells from writing. |
| `visualize` | Explains the current topic with diagrams, code sketches, and focused diffs. |
| `what` | Gives a short, checked answer to a "what" question about the codebase, with a minimal visual. |
