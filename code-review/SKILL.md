---
name: code-review
description: Review code changes against the implement skill's practices and try to break them. Use whenever the user asks for a review, e.g. "review this", "review my changes", "review this PR", "check this diff", or "what's wrong with this code". Use it even for small diffs.
---

Review only the changes. Don't comment on code the change didn't touch, unless the change breaks it.

## Find the changes

- Review what the user points at: a diff, a branch, a PR, or specific files. If they don't say, review the uncommitted changes, or the current branch against main if there are none.
- Read enough surrounding code to understand each change, but keep findings on the changed lines and what they affect.

## Check against the implement skill

- Load the implement skill and check the changes against each of its practices.
- Flag only violations the change introduces, not ones that already existed.

## Try to break it

- Look for inputs and states that make the change fail: empty, null, very large, malformed, or concurrent input, missing files, failed calls, and other edge cases.
- Check that callers of changed code still work.
- When you can, prove a break by running it, writing a failing test, or pointing at the exact path through the code. Mark a finding as unconfirmed if you can't prove it.

## Report

- List findings from most to least severe. For each, give the file and line, what's wrong, how it breaks, and a suggested fix.
- Don't pad the list. If you find nothing, say so.
- Don't change any code unless the user asks.
