# Engineering route

Goal: converge "I want to build something" into an implementable, verifiable, maintainable engineering decision. Work the frontier along the highest-risk open branch, not as a checklist.

## Frontier branches (in risk order)

1. **Problem and user** — who hits what problem; which observable behaviour or result changes once it works.
2. **Scope** — what the first version must do; what it explicitly won't; which existing behaviour must be preserved.
3. **System facts** — what the existing code, dependencies, data, deployment, and constraints actually are. Check the codebase before asking.
4. **Design choice** — compare the minimal viable option against the main alternatives: complexity, reversibility, long-term cost.
5. **Boundaries and interfaces** — module responsibility, input/output, state ownership, error semantics, external dependencies.
6. **Data and concurrency** — data lifecycle, consistency, permissions, migration, idempotency, races, recovery.
7. **Verification and operations** — test layers, observability, performance bar, release, rollback, ownership.

## Mandatory probes

- Put the abstract feature into one real user scenario; grill the happy path _and_ the most dangerous failure path.
- Rewrite words like flexible, easy, stable, smart, automatic into observable behaviour or a metric.
- For hard-to-reverse decisions, grill migration and exit cost; take reasonable defaults on reversible details.
- If the "research tool" is really a one-off analysis script, engineer it to the script's real lifetime — don't force product-grade ceremony onto a throwaway.

## Frontier completion

You can state: who it's for and what problem, first-version boundaries, chosen design and why, key interfaces and data flow, main failure modes, verification method, and release/delivery condition.
