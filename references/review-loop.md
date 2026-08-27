# Bounded review loop

After the interview has converged, run an independent, read-only, limited review of the locked result. It attacks only the weak points that could change the decision — it never reopens every question.

## When to enable

Only when the user explicitly asks for a review, or the decision is simultaneously high-cost, hard to reverse, and high-risk. Ordinary questions skip review.

## Execution

1. Form a locked result containing at least: goal, key decisions, rationale, constraints, risks, open items, and next step.
2. If the environment offers an independent reviewer or second model, have it read only the material and hunt fatal assumptions, missed options, broken evidence, boundary conflicts, and simpler alternatives. It must not implement.
3. With no independent reviewer, re-check from a fresh angle yourself and say plainly this is same-model review.
4. The reviewer gives, per finding: impact, rationale, minimal fix; then a single verdict — `pass`, `modify`, or `block`.
5. You decide whether each finding stands: applied fixes get written back into the locked result; rejected ones get their reason recorded.
6. Default to at most 2 rounds. If substantive disagreement remains after two rounds, list the disagreements and let the user adjudicate — don't manufacture a pass.

## Per-route review focus

- **Engineering**: security, permissions, data migration, concurrency, failure recovery, compatibility, tests, observability.
- **Research**: does the question match the evidence; alternative explanations, measurement and identification, feasibility, reproducibility, overclaimed contribution.
- **Decision**: value ordering, opportunity cost, irreversibility, base rates, second-order effects, exit conditions.
- **Thinking**: equivocation, evidence grade, hidden premises, strongest opposing view, overreach on psychological inference.

The user makes the final call after review.
