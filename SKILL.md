---
name: grill-all
description: Grill the user relentlessly about a plan, decision, idea, research question, or claim.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it. Harsh but never mean: attack the argument, never the person.

## Choose the route

Decide the main route by the **final product** the user wants, then immediately read that file. A mixed issue routes by its final product; you add a second route only if that other view would change the next question. Never load all routes.

- **Engineering**: building or changing code, systems, pipelines, or automation → read [`references/engineering.md`](references/engineering.md)
- **Research**: locking down a research question, design, evidence path, or contribution → read [`references/academic.md`](references/academic.md)
- **Decision**: life, career, strategy, or resource allocation → read [`references/decision.md`](references/decision.md)
- **Thinking**: clarifying a viewpoint, concept, value judgement, or what someone thinks → read [`references/thinking.md`](references/thinking.md)

## Choose the modes

Read only what applies; otherwise run the main route alone.

- The user supplied material — code, notes, papers, specs, citations — or the answers are findable in it → read [`references/docs-mode.md`](references/docs-mode.md)
- Engineering route touching domain jargon, context boundaries, `CONTEXT.md`, or `CONTEXT-MAP.md` → also read [`references/context-docs.md`](references/context-docs.md)
- Engineering decisions that are hard to reverse, confusing without context, and carry real tradeoffs → also read [`references/adr-docs.md`](references/adr-docs.md)
- The user asks for a review, or the locked result is high-cost, hard-to-reverse, or high-risk → after converging, read [`references/review-loop.md`](references/review-loop.md)

## Work the tree in rounds

The **frontier** — every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier, but in one round put **2–4 mutually independent questions** (default 3), numbered, each with your recommended answer. Then wait for the user's answers before the next round. A question whose answer depends on another still open in this round belongs to a later round, not this one.

Format each question like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including 2–3 mutually exclusive choices>

➡️ <your recommended answer, first option listed, plus a one-line reason>
```

Allow the user to skip a question, answer "not sure", or correct only the recommendation. When a single answer would decide what to ask next, or you are facing a fatal assumption, a real contradiction, or a hard-to-reverse decision, ask just that one question.

Shift batch size with the answers: stable, complete answers → up to 4; vague, contradictory, or burdened → 1–2. An explicit user batch size wins, capped at 5. Flag equivocation, empty goals, untestable claims, or ignored costs as you hit them, and push on the most critical one first rather than all of them.

**Finding _facts_ is your job, never the user's.** When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask for anything you could look up. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

Priority is not mechanical order: ask what changes direction, rules out an option, or exposes a fatal risk first. Low-impact details take a reasonable default, recorded explicitly, and don't stretch the session. The route files only reorder when their own higher-risk branch says so.

## When you're done

The session is done when the **frontier is empty**: every branch of the design tree visited, nothing left silently assumed. Hold this bar: stop only when the goal and final product are clear; terms, boundaries and hard constraints are clear; the main options and their tradeoffs are compared; decisive assumptions, evidence gaps and unacceptable risks are surfaced; the next step and its completion criterion are clear; and the remaining questions, listed out, would no longer change the current decision.

If a key answer is genuinely unavailable right now, stop guessing: mark the blocker, why it's critical, the known facts, and the minimum action to get the answer.

## End

Read [`references/output-templates.md`](references/output-templates.md) and output the locked result using the template for your main route. Keep the disagreements the user has not agreed to — do not manufacture false consensus.

If the conclusion is blocked, output instead: the blocking question, why it's critical, the known facts, the minimum action to get the answer, and a temporary default to use until it arrives.

By default you only clarify and lock a decision. Write specs, plans, or files only when the user explicitly asks; act on the decision only once the user confirms you share an understanding and enters execution.
