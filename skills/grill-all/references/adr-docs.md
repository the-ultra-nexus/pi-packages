# Architecture decision records

An ADR records "what important decision was made, and why". It is not a meeting log, a task list, or a full design doc.

## When to create one

Create an ADR only when all three hold:

1. **Hard to reverse** — changing it later costs noticeable migration, coordination, or replacement.
2. **Confusing without context** — a future maintainer reading only the code would likely misread it or try to "fix" it.
3. **Real tradeoff** — at least one credible alternative was rejected for a concrete reason.

If any one fails, don't create an ADR. Reversible implementation details belong in the plan, spec, code, or commit message.

## Common targets

- Architecture shape and context boundaries;
- cross-context integration;
- database, messaging, auth, or deployment choices with real lock-in;
- data ownership and explicit scope exclusions;
- deliberate deviations from the conventional approach;
- compliance, performance, or external-contract constraints invisible in code;
- rejected options whose rationale isn't obvious and will likely be proposed again.

## Files & numbering

- Put system-level ADRs in `docs/adr/` at the root; follow an existing context-level convention if there is one.
- Create the directory only on first need.
- Scan the existing highest four-digit number, add one, and name it `NNNN-short-slug.md`.
- Don't reuse a superseded ADR's number. To change an old decision, write a new ADR and mark the supersession in status.

## Content

Write the background, decision, and rationale in one to three sentences. Add these sections only where they earn their place:

- `Status`: proposed, accepted, superseded, replaced by ADR-NNNN;
- `Options considered`: rejected options and why, when worth keeping for the future;
- `Consequences`: non-obvious downstream effects or maintenance costs.

In live-doc maintenance, write the ADR only after the tradeoff is clear and the user confirms it. After writing, link the ADR from the locked design and check the design's terms match the corresponding `CONTEXT.md`.
