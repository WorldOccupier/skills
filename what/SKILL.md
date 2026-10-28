---
name: what
description: Give a short, focused answer to a "what" question about the current codebase. Use whenever the user asks a "what" question about the code or repo, e.g. "what calls X", "what is the caller for X", "what will fix this", "what does X return", "what sets X", or "what file owns X". Use it even for questions that look simple. Answer only what was asked, and check the answer against the code before giving it.
---

Answer the user's question in as few words as the right answer needs. Base every claim on code you have read, not on names or guesses. A short wrong answer is worse than a slightly longer right one.

## Investigate

- Pin down exactly what the question asks. Answer that, not the topic around it.
- Find the answer in the code. Search for the name and also for its aliases, re-exports, overrides, and string forms such as routes, config keys, and reflection.
- Check the answer before giving it. Open the code you are about to cite and confirm it says what you claim. For "what calls X", confirm each caller really calls this X. For "what will fix this", confirm the fix addresses the root cause, not just the symptom.
- Stop once the answer is confirmed. Don't explore further.

## Risky fixes

When the answer is a change, such as "what will fix this", decide whether the change is risky. It is risky if it touches a signature, shared state, a public API, a schema, config, or code with many callers. If it is, load and follow the `side-effect` skill on the proposed change and fold its verdict into the answer in one line. Don't make the change unless the user asks.

## Answer

- Open with one sentence that answers the question directly. Name the file and line, e.g. `src/cache/store.ts:42`.
- Load and follow the `visualize` skill and show the single smallest visual that supports the answer: a short call tree for callers, a focused diff for a fix, a small flowchart for a path. Highlight the thing asked about. Skip the visual when a file path alone answers the question.
- Add at most a few bullets for what the user needs to act on, such as a caveat or the `side-effect` verdict.
- Say what you couldn't confirm, such as dynamic lookups or callers outside the repo.
- Leave out background, alternatives, and anything the question didn't ask for. If the user wants more, they will ask.
