---
name: reflect
description: Review the current session and list what could be automated with skills. Use only when the user asks to reflect on the session.
disable-model-invocation: true
---

Go through this session and find where the user had to give input that a skill could have handled instead. Base every suggestion on something that actually happened in the session.

## Look for

- Instructions, preferences, or corrections the user gave that could become a skill rule.
- Steps or workflows the user had to describe or ask for that a skill could do on its own.
- Places where an existing skill could have covered the work but didn't trigger, or didn't go far enough.

## Report

Give a list of suggestions in two groups:

- **Update:** existing skills to change. Name the skill and say what to add or change.
- **Create:** new skills to add. Give the name and what the skill would do.

For each suggestion, say briefly what happened in the session that led to it. Leave out anything that only mattered for this one task.

Don't edit or create any skills until the user picks which suggestions to apply.
