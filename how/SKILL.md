---
name: how
description: Explain how something works in the current codebase. Start with a breadth-first overview at the right level, then go deeper only when the user asks.
---

Help the user understand how something works in this codebase. Investigate the code first. Base every claim on code you have read, not on names or guesses.

## Breadth first

Start with a high-level overview. Cover every piece the user needs to follow the answer, but don't go deep into any one of them. Go deeper only when the user asks a follow-up question.

## Match the level to the question

- For an architecture question, explain at the architecture level: components, boundaries, and how they talk to each other.
- For a question about a class or function, explain at the class level: what gets called, how the pieces relate, and which package or module each one lives in.
- Don't mix levels. Leave out detail the question doesn't need.

## Visualize the investigation

Once you have investigated, load and follow the `visualize` skill before you write the answer. Do not draw diagrams without it. The diagrams are the answer. The user should be able to understand how it works from them alone.

- Draw what you found at the level you picked: the architecture, the classes involved, or the flow between them.
- Use more than one diagram when that helps. For example, show the structure in one and the flow in another.
- Highlight the thing the user asked about.
- If you are about to write a paragraph that explains structure or flow, draw it instead.

## Answer

- Open with one sentence that answers the question directly.
- Show the diagrams from `visualize`.
- Name the key files or modules so the user can find them.
