# Open Specification Issue: Bound Segment field deletion

- **Status:** Open
- **Specification label:** DECISION REQUIRED
- **Date raised:** 2026-08-08
- **Owner:** Product
- **Sprint / Subtask:** Sprint 11, Subtask 11.4 and Test 11.T14
- **Controlling specification:** Implementation Plan v1.1, D11.4 — Deleting a Bound Segment Field
- **Related PDR / ADR:** None

> [!CAUTION]
> This record documents a blocker; it does not authorize a permanent product or
> technical choice. Stop the affected portion and continue only unrelated work.

## Exact unresolved question

When a Segment field is referenced by one or more Layout bindings, should
deletion remain blocked until those bindings are removed, or should deletion
proceed and leave explicit validation errors at every affected placement?

## Specification evidence

- **Source:** Implementation Plan v1.1, Sprint 11 D11.4 and Decision Register P-03
- **Label or conflicting text:** `[DECISION REQUIRED]`; the plan recommends blocking and listing usages as temporary MVP behavior.
- **Authority analysis:** The implementation plan identifies the unresolved product behavior and supplies only a temporary recommendation. No higher-authority specification resolves destructive bound-field deletion.

## Affected scope

- **Work that must stop:** Permanent destructive behavior for deleting a Segment field while Layout bindings reference its stable key.
- **What the issue blocks:** Finalizing deletion semantics beyond the safe Sprint 11 boundary.
- **Unrelated work that may continue:** Binding creation and resolution, usage discovery, compatibility validation, Component rendering, and deletion of unbound fields.

## Safe interim handling

- **Documented MVP default:** Block deletion and list usages, from Implementation Plan v1.1 D11.4 and P-03.
- **Temporary treatment:** The application command rejects deletion with a conflict and names each affected Layout, Component, and property.
- **Replaceable boundary:** Usage discovery is isolated behind `SegmentDataFieldUsageRepository`; the destructive policy remains in `DeleteSegmentDataFieldCommand`.
- **Assumptions explicitly prohibited:** Do not cascade-delete bindings, silently orphan bindings, or treat the temporary block as permanent product policy.

## Resolution required

- **Decision-maker:** Product owner
- **Resolution criteria:** Specify deletion behavior, confirmation and recovery UX, resulting validation state, undo expectations, and treatment of existing Episode content.
- **Target:** Before destructive bound-field editing is finalized for MVP release
- **Decision record:** Pending

## Resolution record

- **Resolved behavior:** Pending
- **Approved by:** Pending
- **Resolution date:** Pending
- **Specification update:** Pending
- **Implementing ADR / pull request:** Pending

## Required follow-up

- [ ] Link the approved PDR or ADR when applicable.
- [ ] Update and version the controlling specification when required.
- [ ] Replace or remove temporary handling.
- [ ] Add or update tests, migrations, and compatibility guidance.
- [ ] Confirm no prohibited assumption became permanent while the issue was open.
