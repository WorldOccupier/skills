---
name: visualize
description: Help the user understand the current topic visually with concise diagrams, code-shape sketches, and focused diffs.
---

Help the user understand the current topic of conversation visually. Skip the preamble and keep prose brief. Pick the smallest view that makes the key point clear.

## Code shapes

- Show straight-line logic as pseudocode. Mark what matters with `◀` notes:

```text
on(save)
  if content is unchanged
    return cached result
  write new content          ◀ side effect: disk
  invalidate cache           ◀ async, not awaited
  return fresh result
```

- Show runtime control flow as a call tree:

```text
submitForm
  createSession
    persistPrompt
    launchAgent
  navigateToSession
```

- Show UI structure as a component tree, including state and module boundaries that matter:

```tsx
<SessionPage> (apps/example/src/routes/session.tsx)
  useSessionEvents()
  <SessionToolbar>
    <RunSkillButton> (packages/ui)
```

- Show file responsibility or a broad refactor as a shallow file tree:

```text
src/
├── commands/       # parses user actions
├── sessions/       # owns session state
└── transport/      # sends API requests
```

## Diagrams

Draw every diagram as a Mermaid block. Never draw boxes, arrows, or flows by hand with text characters. Label nodes and arrows with real names from the code.

- Show architecture as a flowchart. Group nodes into subgraphs by package or module so ownership is visible:

```mermaid
flowchart LR
  subgraph app
    Main
  end
  subgraph core/di
    Locator --> Registry
    Registry --> Factory
  end
  Main -->|get UserService| Locator
  Factory -->|creates| UserService
```

- Show classes with a class diagram. Include only the key fields, methods, and relationships:

```mermaid
classDiagram
  class Locator {
    -Registry registry
    +get(type) T
  }
  class Factory {
    <<interface>>
    +create() T
  }
  Locator --> Registry : uses
  Registry o-- Factory : holds
  Factory <|.. SingletonFactory
```

- Show interactions between components as a sequence diagram with `autonumber`, so the text can refer to steps:

```mermaid
sequenceDiagram
  autonumber
  participant Main
  participant Locator
  participant Registry
  Main->>Locator: get(UserService)
  Locator->>Registry: resolve(UserService)
  Registry-->>Locator: factory
  Locator-->>Main: instance
```

- Show lifecycles and state machines as a state diagram, and data models as an ER diagram:

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Running : start()
  Running --> Succeeded : done
  Running --> Failed : error
```

```mermaid
erDiagram
  USER ||--o{ SESSION : has
  SESSION ||--|{ MESSAGE : contains
```

- Show logic with branches as a decision flowchart. Color the happy path and the edge cases differently when edge cases matter:

```mermaid
flowchart TD
  classDef happy fill:#d8f5d0,stroke:#2e8b2e,color:#000
  classDef edge fill:#ffe1c4,stroke:#d97a1e,color:#000
  A([on save]):::happy --> B{unchanged?}
  B -->|no| C[write content]:::happy --> D[return fresh]:::happy
  B -->|yes| E[return cached]:::edge
  C -->|write fails| F[throw SaveError]:::edge
```

- When the user needs both the exact logic and the picture, number the pseudocode steps (①②③) and use the same numbers in the flowchart nodes. Use this sparingly.

### Styling

- Highlight the thing the user asked about and mute the rest:

```mermaid
flowchart LR
  classDef focus fill:#f9d71c,stroke:#333,stroke-width:3px,color:#000
  classDef muted fill:#eee,stroke:#bbb,color:#888
  Main:::muted --> Locator:::focus --> Registry:::muted
```

- Use the same color for each layer in every diagram, and add a legend when the colors aren't obvious:

```mermaid
flowchart LR
  classDef ui fill:#cfe8ff,stroke:#1e6fd9,color:#000
  classDef domain fill:#d8f5d0,stroke:#2e8b2e,color:#000
  classDef infra fill:#ffe1c4,stroke:#d97a1e,color:#000
  classDef external fill:#eee,stroke:#888,color:#000,stroke-dasharray:4
  Page:::ui --> OrderService:::domain --> OrderRepo:::infra --> Stripe:::external
```

### Loops

- By default, put the loop body in a subgraph with a dashed "next" arrow back to the start:

```mermaid
flowchart TD
  Start([build index]) --> Loop
  subgraph Loop["🔁 for each file"]
    direction TB
    P[parse file] --> V{valid?}
    V -->|yes| I[index it]
    V -->|no| L[log + skip]
  end
  I -.->|next file| P
  L -.->|next file| P
  Loop -->|no more files| Done([return index])
```

- Show nested loops as nested subgraphs:

```mermaid
flowchart TD
  subgraph Outer["🔁 for each package"]
    direction TB
    R[read manifest] --> Inner
    subgraph Inner["🔁 for each dependency"]
      direction TB
      F[fetch version] --> C{compatible?}
      C -->|no| W[record conflict]
    end
  end
  Outer --> Out([report conflicts])
```

- When the loop is about calls between components, use a `loop` block in a sequence diagram:

```mermaid
sequenceDiagram
  participant Worker
  participant Queue
  participant DB
  loop every 5s until queue empty
    Worker->>Queue: pull batch
    loop each job
      Worker->>DB: save result
    end
  end
```

- Show retries and polling as a state diagram, with the attempt count and backoff on the arrows:

```mermaid
stateDiagram-v2
  [*] --> Trying
  Trying --> Success : 2xx
  Trying --> Waiting : error, attempts < 3
  Waiting --> Trying : backoff 2ⁿ s
  Trying --> Failed : error, attempts = 3
```

- When the exits are the interesting part, color the exit nodes:

```mermaid
flowchart TD
  classDef exit fill:#ffd6d6,stroke:#c0392b,color:#000
  A([for each item]) --> B{found match?}
  B -->|no| C[next item] --> A
  B -->|yes| D([break: return item]):::exit
  A -->|exhausted| E([return null]):::exit
```

## Diffs

Use `diff` when the point is what changes and the surrounding shape already exists.

- For a code change, start with the file path. Above the method, show the call stack within the same file with line numbers, and mark the changed method. Leave the call stack out if nothing else in the file calls it. Use `⋮` for skipped lines:

```diff
@@ src/cache/store.ts @@
# call stack in this file:
#   update()            :12
#   └─ commit()         :27
#      └─ save()        :42   ◀ changed
#   restore()           :60
#   └─ save()           :42   ◀ changed
 export function save(key: string, value: string) {
-  db.write(key, value)
+  if (cache.get(key) === value) return
+  db.write(key, value)
+  cache.set(key, value)
 }
⋮
```

- For a file-layout change:

```diff
 src/
 ├── commands/
+│   └── visualize.ts      # expands the slash command
 ├── sessions/
-└── transport.ts
+└── transport/
+    ├── client.ts
+    └── stream.ts
```

- For a call-tree change, draw the new tree and color what was added or removed:

```mermaid
flowchart TD
  classDef added fill:#d8f5d0,stroke:#2e8b2e,color:#000
  classDef removed fill:#ffd6d6,stroke:#c0392b,color:#000,stroke-dasharray:4
  submitForm --> createSession
  createSession --> persistPrompt
  createSession --> expandSkillMention:::added
  createSession --> launchAgent
  submitForm --> navigateToSession
  navigateToSession --> subscribeToEvents:::added
  navigateToSession -.-> pollStatus:::removed
```

- Show the whole block when most of it is new, when omitted context would hide ownership or order, or when the user needs a copyable target shape:

```ts
function expandSkill(command: string): string {
  const skillName = command.slice(1)
  return `use the ${skillName} skill`
}
```

## Guidance

- Use visuals as the main way to explain. Text comes second.
- Below each visual, write a short description of what it shows.
- Before presenting, re-read the visuals and descriptions. Check that they answer what the user asked. If they don't, rework them until they do.
