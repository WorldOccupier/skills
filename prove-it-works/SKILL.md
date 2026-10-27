---
name: prove-it-works
description: Prove a change actually works before calling it done. Use after completing any code change and before reporting success, e.g. after implementing a feature, fixing a bug, refactoring, or changing config. Use it even for changes that look trivial.
---

Before reporting a change as done, prove it works.

## Verify the change

- Check that the change actually does what it should. Pick the method that fits the project: run the tests, check it visually (UI, rendered output, screenshots), do both, or use another direct check such as calling the endpoint or running the CLI.
- Observe the real behavior. "It compiles" or "it should work" is not proof.
- If verification fails, fix the change and verify again before reporting.

## Give the user a script

- Write a script the user can run to verify the change themselves.
- Keep it short and deterministic. It should exit non-zero on failure and print what it checked.
- Tell the user where the script is and how to run it.
