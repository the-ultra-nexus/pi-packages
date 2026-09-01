# Research-first phase (engineering / research / decision routes)

Before the first grilling round, run a **research phase**: surface the external
facts the decision depends on — especially the broad landscape of **same-type
products** — then present a summary for the user to confirm before grilling.

## When

Default-on for the **engineering**, **research** (academic), and **decision**
routes. Skip or go shallow when the subject is internal-only, already fully
specified by the user's material, or the user asks to move on. The **thinking**
route never runs it.

"Same-type" adapts to the route:
- Engineering → competing products, alternatives, reference implementations.
- Decision → comparable choices others faced, archetypes, benchmarks.
- Research (academic) → related work, prior art, closest approaches.

## How to run it

Dispatch in-session subagents doing **broad web searches, in parallel** (no file
writes), at least two angles:
1. **The subject itself** — what it is, current state, key facts, known issues.
2. **Same-type products** — who else does this, direct competitors,
   adjacent/alternative approaches, reference implementations.
3. **Industry baselines & best practices** — benchmarks, data, common patterns.

Finding facts is your job, never the user's; don't ask for anything you can look up.

## The summary

Assemble a tight **调研摘要** and show it before grilling:
- One-line subject.
- Who else does this / closest analogs (short comparison: each player, how it
  does it, where it differs).
- Industry baselines / best practices relevant to the decision.
- Gaps, risks, or angles this landscape opens that are worth grilling on.

Get the user's confirmation or correction (is the landscape right? missing
players? wrong emphasis?) through the grilling answers, **not** in a separate
exchange: same message carries the 调研摘要 *and* the round's 2–4 questions.
Treat the confirmed summary as the settled fact base; inject its facts into the
frontier questions instead of re-asking them.

**Handoff is mandatory, not advisory.** Research is never an end state. The
moment you have a summary, you must move into the first grilling round *in the
same message*: show the 调研摘要, then immediately the round's 2–4 questions.
A message that shows research output but asks zero grilling questions is a bug —
unless the user explicitly asked for research output only.

## Output

Capture the confirmed 调研摘要 in the locked result (see output-templates) so the
decision is traceable to the landscape it was made against. It counts as
confirmed only once the user has answered grilling questions that refer to it.