# Docs & live-document mode

Constrain the grilling with existing material — code, project docs, research notes, papers, data dictionaries, citations, transcripts, specs, decision records — to avoid repeat questions and unsupported inference.

## Pick the write level

- **Read-only verify** (default): read and cite the material, point out conflicts, rewrite nothing.
- **Live-doc maintenance**: enabled only when the user explicitly asks you to maintain, sync, supplement, or record against documents. Write back each batch of locked content as it converges — don't wait for the whole interview.

Material existing is not authorization to write. State the current level in one sentence when you start.

## Handling order

1. Identify the material directly relevant to the current frontier; read only the necessary parts.
2. Mark the facts, definitions, prior decisions, evidence, and open questions inside the material.
3. Check for conflicts between materials, and between material and what the user says.
4. Any question the material answers, answer directly with the source; ask the user only what genuinely needs judgement, tradeoff, or missing input.
5. When material is insufficient, say plainly which is the case: "not provided", "material contradicts itself", "reasonably inferable", or "unjudgeable".
6. In live-doc maintenance, write back only what this batch actually locked (facts, terms, decisions); keep open items open, don't fill in consensus for the user.

## Per-route focus

- **Engineering**: do code behaviour, interfaces, config, tests, `CONTEXT.md`, ADR, and actual deployment constraints agree? Domain language per [`context-docs.md`](context-docs.md); architecture decisions per [`adr-docs.md`](adr-docs.md).
- **Research**: do the primary sources, research notes, data description, codebook, and analysis code agree with the claims?
- **Decision**: are verifiable facts (time, resources, commitments, rules) cleanly separated from personal forecasts?
- **Thinking**: are quotes, context, the paraphrase chain, and interpretation kept distinct?

After any write-back, re-read the touched fragment and confirm the standard terms, code facts, decision rationale, and this round's conclusion line up. Final output lists which files were updated; in read-only verify, list the conflicts and open items found.
