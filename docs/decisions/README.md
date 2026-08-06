# Showflow decision records

This directory preserves decisions and unresolved questions that affect Showflow's
product or implementation. It complements the specifications; it does not create
a second source of product authority.

> [!IMPORTANT]
> A proposal, recommendation, temporary default, or open issue is **not** an
> approved decision. Stop the affected work until the authorized decision is
> recorded, while continuing work that does not depend on it.

## Choose the right record

| Record                             | Use it when                                                                                                   | Template                                             | Approval effect                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Architecture Decision Record (ADR) | A material technical or architectural choice needs durable context and consequences                           | [ADR template](adr-template.md)                      | `Accepted` records an approved implementation choice within the specifications |
| Product Decision Request (PDR)     | Product ownership must choose between user-facing behaviors or product-model options                          | [PDR template](product-decision-request-template.md) | Only its completed approval record resolves the request                        |
| Open Specification Issue (OSI)     | A specification is incomplete, contradictory, or explicitly marked `OPEN SPECIFICATION` / `DECISION REQUIRED` | [OSI template](open-specification-issue-template.md) | Records the blocker and safe interim boundary; it does not approve behavior    |

An open specification issue may link to a product decision request when resolving
the gap requires a product choice. Once approved, update the controlling
specification when necessary and record material implementation architecture in
an ADR.

## Authority and handling

Decision records follow the authority order in the
[documentation guide](../README.md#authority-order): Architecture PRD, UX
Specification, Technical Specification, then Design System Specification. The
implementation plan sequences delivery but does not override those documents.

- An ADR cannot silently override a higher-authority specification. Revise the
  controlling specification through its versioning process when the approved
  decision changes that contract.
- A PDR recommendation is advisory until the approval record names the decision,
  approver, and approval date.
- An OSI stops only the affected portion of work. Use a documented MVP default
  when one exists; otherwise hide, disable, isolate, or implement only the
  specified minimum behind a replaceable boundary.
- `[SPIKE]` work remains time-boxed and cannot become production architecture
  without an approved follow-up decision.
- `[DEFERRED]` work stays outside the current MVP.

## Naming and lifecycle

Use lowercase kebab-case filenames and the next available four-digit number in
the relevant series:

```text
NNNN-short-adr-title.md
pdr-NNNN-short-question.md
osi-NNNN-short-issue.md
```

ADR numbers are repository-wide and monotonic. PDR and OSI records each maintain
their own monotonic series. Never renumber or delete an accepted or resolved
record. Mark it `Superseded` and link its replacement so historical reasoning
remains reviewable. Template files are not records and do not receive numbers.

| Record | Allowed statuses                                 |
| ------ | ------------------------------------------------ |
| ADR    | `Proposed`, `Accepted`, `Rejected`, `Superseded` |
| PDR    | `Open`, `Decided`, `Withdrawn`, `Superseded`     |
| OSI    | `Open`, `Resolved`, `Withdrawn`, `Superseded`    |

## Decision workflow

1. Copy the appropriate template and assign the next number.
2. Cite the exact controlling document, section, Sprint, and affected scope.
3. For an open product or specification question, stop only the affected work
   and document the safe interim handling.
4. Obtain approval from the accountable product or technical decision-maker.
5. Record the result, approver, date, consequences, and superseded records.
6. Update affected specifications, implementation notes, tests, migrations, and
   compatibility guidance in the same change or linked follow-up.
7. Change the record status only when its required approval or resolution is
   actually complete.

## Architecture Decision Record register

|                                             ADR | Status   | Decision                           |
| ----------------------------------------------: | -------- | ---------------------------------- |
|             [0001](0001-workspace-toolchain.md) | Accepted | Workspace toolchain pins           |
|  [0002](0002-electron-forge-vite-foundation.md) | Accepted | Electron Forge and Vite foundation |
|  [0003](0003-browser-window-security-policy.md) | Accepted | BrowserWindow security policy      |
|          [0004](0004-typed-runtime-info-ipc.md) | Accepted | Typed runtime information IPC      |
|    [0005](0005-package-boundary-enforcement.md) | Accepted | Package boundary enforcement       |
|            [0006](0006-code-quality-tooling.md) | Accepted | Code quality tooling               |
|                  [0007](0007-test-harnesses.md) | Accepted | Test harnesses                     |
| [0008](0008-continuous-integration-skeleton.md) | Accepted | Continuous integration skeleton    |
|      [0009](0009-decision-record-governance.md) | Accepted | Decision record governance         |
|   [0010](0010-initial-design-token-contract.md) | Accepted | Initial design token contract      |
|             [0011](0011-node-sqlite-adapter.md) | Accepted | `node:sqlite` persistence adapter  |
|         [0012](0012-self-hosted-geist-fonts.md) | Accepted | Self-hosted Geist font assets      |
|  [0013](0013-semantic-design-token-contract.md) | Accepted | Complete semantic token contract   |
|             [0014](0014-lucide-icon-library.md) | Accepted | Lucide icon library                |

## Product Decision Request register

No product decision requests are currently recorded.

## Open Specification Issue register

No open specification issues are currently recorded.
