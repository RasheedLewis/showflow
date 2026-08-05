# ADR 0009: Decision Record Governance

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.11

## Context

Showflow already records accepted technical choices as ADRs, but it had no
defined artifacts for requesting product decisions or tracking specification
gaps. The documentation governance rules require agents to stop affected work at
`OPEN SPECIFICATION` and `DECISION REQUIRED` boundaries without preventing
unrelated progress.

Without distinct record types, an option, recommendation, or temporary MVP
default could be mistaken for an approved decision. The repository also needs a
durable register and validation that keeps its decision process discoverable.

## Decision

- Keep accepted technical and architectural choices in monotonically numbered
  ADRs named `NNNN-kebab-case-title.md`.
- Introduce separately numbered Product Decision Requests (`pdr-NNNN-*`) for
  choices owned by product decision-makers.
- Introduce separately numbered Open Specification Issues (`osi-NNNN-*`) for
  incomplete, contradictory, or explicitly open specification sections.
- Treat proposals, recommendations, open records, and documented MVP defaults as
  nonapproval. Only a completed approval or resolution record changes that state.
- Preserve historical records by marking replacements as superseded and linking
  both directions instead of deleting or renumbering them.
- Keep decision records subordinate to the documented specification authority
  order. Update the controlling specification when an approval materially changes
  its contract.
- Validate the template set, required governance sections, sequential ADR
  numbering, and register coverage with the unit test suite.

## Consequences

- Contributors can distinguish implementation choices, product questions, and
  specification blockers without inferring authorization.
- Open issues explicitly identify stopped work, safe interim behavior,
  replaceable boundaries, and unrelated work that may continue.
- Decision history stays reviewable as requirements and architecture evolve.
- New record types or status lifecycles require a deliberate governance update
  and corresponding test changes.
