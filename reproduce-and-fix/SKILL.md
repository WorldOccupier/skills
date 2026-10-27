---
name: reproduce-and-fix
description: Reproduce a bug, fix its root cause, and explain the fix visually. Use whenever the user reports a bug or unexpected behavior, e.g. "X is broken", "fix this bug", "X throws an error", or "X returns the wrong value". Use it even for bugs that look simple.
---

Follow these steps for every bug.

## Reproduce the bug

- Reproduce the bug before changing any code. Use a failing test, a script, or the real app, whichever fits the project.
- Confirm the reproduction shows the same symptom the user reported.
- If you can't reproduce it, tell the user what you tried and ask for more details instead of guessing at a fix.

## Fix the root cause

- Trace the symptom back to where the behavior first goes wrong.
- Fix that cause, not the place where the symptom shows up. Don't add special cases, guards, or retries that only hide the bug.
- Run the reproduction again and confirm the bug is gone.

## Explain the fix

- Use the visualize skill to show why the bug happened and how the fix resolves it.
