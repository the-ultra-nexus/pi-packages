# Domain context docs

Use `CONTEXT.md` to pin down the domain language, and `CONTEXT-MAP.md` to describe multiple contexts and their relationships. They serve conceptual consistency only — not specs, plans, or implementation records.

## Discover the structure

1. Root has `CONTEXT-MAP.md`: locate which context the topic belongs to and its `CONTEXT.md` via the map.
2. Only a root `CONTEXT.md`: treat as a single-context project.
3. Neither exists: create a root `CONTEXT.md` lazily, and only once the project's first distinctive terms are locked and live-doc maintenance is enabled.
4. When a term's context ownership is ambiguous, ask first; never write one term into multiple contexts.

## Recording rules

- Keep `CONTEXT.md` a glossary. Specs, tasks, API fields, and implementation decisions each live in their own document.
- Pick one standard term per concept; list look-alike names under `_avoid_`.
- Each definition is one or two sentences — what the concept is and its boundary, not a list of implementation behaviour.
- Record only project-domain concepts. Timeouts, error types, utilities, and other generic engineering words don't belong in a glossary.
- When natural clusters of concepts form, use subheadings; a single domain stays flat.
- When a new term collides with an existing definition, point it out and settle which meaning holds with a concrete scenario.
- When the user's description conflicts with code behaviour, show the evidence and ask them to adjudicate; don't rewrite docs or code before that.

## Multi-context map

Only once the project genuinely has several independent domain contexts, record:
- each context's responsibility and doc location;
- communication direction and mechanism between contexts;
- explicitly shared types or contracts;
- key ownership boundaries.

For hard-to-reverse architecture tradeoffs in relations or boundaries, decide per [`adr-docs.md`](adr-docs.md) whether an ADR is warranted.
