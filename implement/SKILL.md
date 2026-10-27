---
name: implement
description: The user's coding practices for writing and changing code. Use whenever writing, modifying, refactoring, or fixing code in any language or repo, e.g. "add X", "implement X", "fix this bug", "refactor X", "change X to Y", or "build X". Use it even for changes that look small, like a one-line fix or a rename. Load it before making the first edit.
---

Follow these practices for every code change.

## Design

- Follow SOLID and object-oriented design principles.
- Use dependency injection whenever possible. Pass collaborators in through constructors or parameters instead of creating them inside the class.
- Split changes across multiple files by responsibility. Each file should have one clear purpose.

## Writing code

- Give identifiers descriptive names that say what they hold or do.
- Keep methods to 40 lines or fewer. If a method grows past that, extract well-named helper methods.
- Keep it DRY: once the same value or logic appears a second time, extract it into a named constant or helper.

## Comments

- Add a comment only when the behavior is not obvious from the code. Don't comment code that already explains itself.

## Testing

- Add only the minimum tests needed to cover the change. Don't add tests for trivial or already-covered behavior.
