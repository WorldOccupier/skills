---
name: side-effect
description: Find what a change to a piece of code would break and give a verdict on whether it is safe. Use whenever the user asks what a change or a piece of code could impact, e.g. "what uses X", "what breaks if I change X", "what's the blast radius of X", "who depends on X", "is it safe to change X", or "what does X touch". Use it before risky changes even when the user doesn't ask.
---

Find what a change would break and decide whether it is safe to make. Base every claim on code you have read, not on names or guesses.

## Pin down the change

- Name the exact target: a function, class, field, config key, schema, endpoint, or file.
- Find out what kind of change is planned: signature, behavior, return value, or removal. Each one affects different code.

## Trace inward: who depends on it

- Find every direct caller, importer, and reference. Search for the name and also for its aliases, re-exports, and string forms such as reflection, routes, config keys, and serialized field names.
- Follow the callers outward until the effect stops spreading. Stop at a caller that only passes the value along without depending on its shape or behavior.
- Check the places search misses: dynamic dispatch, interfaces and overrides, dependency injection, event handlers, generated code, and other repos or services that consume an API or schema.

## Trace outward: what it touches

- List what the target changes outside itself: shared state, globals, caches, databases, files, network calls, queues, logs, and metrics.
- For each one, find who else reads it.

## Decide what breaks

For each affected place, decide whether the change breaks it, makes it risky, or changes its behavior in a way nobody intended. Drop every place that keeps working the same way. Don't report safe places.

- **Breaks:** fails to compile, throws, returns wrong data, or fails a test.
- **Risky:** might break depending on input, timing, data, or callers you couldn't see.
- **Unintended:** keeps working but behaves differently than before, and the change wasn't meant to do that.

Note whether tests cover each place you keep.

## Follow it to the user

For each place you keep, trace it up to what a user would see or do: a screen, a button, a page, an API response, a CLI command, an email, or a background job whose result they rely on.

- Describe the effect in user terms, e.g. "the checkout button does nothing" or "exported CSVs lose the date column".
- Say which users hit it and when: everyone, a feature-flagged group, an admin, or only on an edge case.
- If a place never reaches a user, say what it affects instead: data, other services, or developers.

## Report

- Open with the verdict:
  - **Safe:** nothing breaks and nothing behaves differently by accident.
  - **Safe with fixes:** the change can go ahead as planned once some callers are patched. List the fixes.
  - **Unsafe:** the plan itself has to change, or the risk can't be checked. Say what the plan should change to.
- Follow with one sentence on the worst user-facing effect.
- Load and follow the `visualize` skill to draw the change at the center with only the risky, breaking, and unintended places around it, each linked to the user experience it affects. Use these colors every time and include a legend:
  - The changed code: yellow (`fill:#f9d71c,stroke:#333,stroke-width:3px,color:#000`)
  - Breaks: red (`fill:#ffd6d6,stroke:#c0392b,color:#000`)
  - Risky: orange (`fill:#ffe1c4,stroke:#d97a1e,color:#000`)
  - Unintended: purple (`fill:#e8d9ff,stroke:#7b4fd1,color:#000`)
  - User-facing effects: blue (`fill:#cfe8ff,stroke:#1e6fd9,color:#000`)
- List each problem with its file path, its category, its user-facing effect, and whether tests would catch it. Put the worst first.
- Call out anything you couldn't confirm, such as callers from outside the repo or dynamic lookups. Treat them as risky, not safe.
