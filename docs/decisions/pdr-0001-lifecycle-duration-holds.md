# Product Decision Request: Should Segment lifecycle actions support explicit duration holds?

- **Status:** Decided
- **Date raised:** 2026-08-09
- **Decision owner:** Showflow product owner
- **Requested by:** Codex after packaged Segment UX validation
- **Needed by:** Sprint 12A, before Sprint 13
- **Sprint / Subtask:** Sprint 12A, Subtasks 12A.1–12A.9
- **Controlling specification:** Architecture PRD v1.3 §14, revised by Architecture PRD v1.4 §14
- **Related OSI / ADR:** None

## Decision needed

Should Showflow add an explicit duration-hold action to Enter and Exit lifecycle choreography before implementing Host Cues?

## Why this is needed now

The Sprint 12 action model could wait for animation or media completion but could not express “keep this Layout visible for three seconds.” The packaged Segment walkthrough therefore could not configure a required Enter hold or a timed image outro through the UX. Sprint 13 also depends on the same deterministic clock and cancellation foundation for fixed-duration Host Cues.

## Product constraints

- Every Segment retains the fixed Prepare, Enter, Active, Exit, and Cleanup lifecycle.
- Active remains manual and cannot be advanced by a duration hold.
- Preview and rehearsal share deterministic, cancellable execution logic.
- The action must not introduce a timeline, keyframes, conditions, branching, scripting, or automatic triggers.
- Reduced-motion preferences must not shorten an intentional production hold.

## Documented MVP default

None. Architecture PRD v1.3 §14 supported only immediate, animation-completion, media-completion, and manual Active completion policies.

## Options

| Option                             | User experience and product effect                                                                                   | Tradeoffs and risks                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A — Add an explicit hold           | Adds a plain-language `Hold for` action to ordered Enter/Exit choreography and executes it through the shared clock. | Adds a new validated action variant and timing UI, but remains bounded and engine neutral.     |
| B — Reuse animation or media waits | Requires users to create incidental animation or media solely to create dwell time.                                  | Hides intent, fails for static Layouts, and makes timing dependent on unrelated configuration. |
| C — Defer timing                   | Leaves the tested three-second Enter and Exit flow impossible before Host Cues.                                      | Preserves less scope now but carries a known workflow gap and duplicates timing work later.    |

## Recommendation

Approve Option A. It expresses the production intent directly, reuses the Sprint 12 clock and cancellation model, and stays below the boundary of a general automation or timeline system.

## Impact while open

- **Affected work that must stop:** Exact duration-based Enter/Exit choreography and Sprint 13 fixed-duration Cue implementation.
- **Safe interim handling:** Animation and media completion waits remain available; no fake duration control is shown.
- **Replaceable boundary:** Duration is one engine-neutral action and instruction variant executed through the existing clock.
- **Unrelated work that may continue:** Existing Sprint 12 lifecycle preview, Layout activation, animation, and media-completion behavior.

## Approval record

- **Decision:** Add an explicit, deterministic duration hold to Enter and Exit lifecycle actions as part of a required pre-Sprint-13 bridge Sprint.
- **Approved option:** Option A — Add an explicit hold
- **Approver:** Showflow product owner
- **Approval date:** 2026-08-09
- **Rationale:** The product owner requested timing and the packaged UX improvements in a pre-13 Sprint after confirming the exact Segment flow was not possible through the current UX.

## Required follow-up

- [x] Update the Architecture, UX, and Technical specifications and their version references.
- [x] Add Sprint 12A acceptance criteria, tests, and compatibility guidance to the implementation plan.
- [x] Preserve the no-timeline and manual-Active invariants in the decision and specifications.
- [ ] Implement Sprint 12A and record any migration or implementation ADR only if the chosen persistence or runtime boundary materially changes.
