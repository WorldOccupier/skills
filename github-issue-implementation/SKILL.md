---
name: github-issue-implementation
description: Implement and verify a GitHub issue with gh, then commit, push, and close it only after explicit approval. Use when asked to implement, fix, complete, or work on a GitHub issue or issue number.
---

# GitHub issue implementation

Take one GitHub issue from inspection through verified implementation. Keep publishing as a separate, user-approved step.

## Read the issue and repository

1. Check `git status --short` before changing anything. Do not overwrite, stage, revert, or commit unrelated work.
2. Read the requested issue with `gh issue view <number> --comments`. If the user did not provide a number, use `gh issue list --state open` and ask before choosing among materially different candidates.
3. Read repository instructions, the relevant code, its tests, and its callers.
4. Ask only questions whose answers change the implementation. Include a concrete recommended answer for each.
5. Stay within the issue. Mention useful follow-up work instead of quietly expanding the scope.

## Implement

1. Make the smallest complete change that satisfies the issue.
2. Add or update tests that fail without the changed behavior when practical.
3. Update user-facing documentation, examples, fixtures, and demo commands affected by the change.
4. Format changed files with the repository's formatter.
5. Preserve backward compatibility unless the issue calls for a breaking change.

## Verify

1. Run focused tests while working.
2. Run the repository's required final test command. Use `make test`, `make check`, or the documented equivalent when available.
3. Run formatting, lint, and `git diff --check` when the repository supports them.
4. Exercise commands and APIs through their real interface with representative input.
5. If visible behavior changed, test it visually before asking the user to verify:
   - Use Herdr for terminal and Neovim interfaces.
   - Open the real UI in a Herdr pane.
   - Read the rendered pane and perform the changed keys or actions.
   - Close the test pane when finished.
6. Do not claim a check passed unless it ran successfully. Report any blocked or unavailable check plainly.

## Request verification

After implementation and checks, give the user a short report containing:

- the issue number and title
- the behavior changed
- automated checks run
- the manual or Herdr visual check, when applicable
- anything incomplete

Ask the user to verify the result. Do not commit, push, close the issue, assign it, or post progress comments yet.

## Publish only after approval

Require explicit permission before committing, pushing, or closing the issue. Approval such as "commit, push and close" authorizes that exact sequence for the verified changes.

After approval:

1. Recheck `git status --short` and `git diff --check`.
2. Stage only files belonging to the issue.
3. Create one focused commit with an imperative message.
4. Push the current branch unless the user requested another branch.
5. Close the issue with `gh issue close <number> --comment <message>`. Name the commit and summarize the verification in the comment.
6. Confirm the issue is closed and report the final working-tree state.

Never close an issue when tests fail or the implementation is incomplete. If one publishing step succeeds and a later step fails, report the partial result. Do not repeat a destructive or ambiguous action blindly.
