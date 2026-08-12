# Threadline product specification

## The product thesis

Alludium’s visible product already solves Answers → Execution, Individual → Team and Recording → Moving. That creates a second-order coordination problem: once several agents and investors can move a deal, each task can carry a slightly different version of the facts.

Threadline is a proposed commit protocol for shared deal state.

> Independent concept prototype using fictional data; not affiliated with or integrated into Alludium.

It is not another agent, memo generator or system of record. It is a native State surface that sits beside Tasks, Files, Data and Operations. Every task reads from a bounded snapshot of canonical deal state and proposes atomic writes back to it.

## Core invariants

1. Decision-bearing state never changes silently.
2. Contradictions are first-class objects, not text to be summarized away.
3. Every investment claim remains traceable to source excerpts.
4. Each modeled task receives policy-bounded context rather than the entire deal room.
5. Every compiled context has a portable receipt with inclusions, exclusions and policy version.
6. Historical revisions replay the accepted state recorded at that revision.
7. The system advances work; investors retain judgment.

## State model

```text
Deal
├── Claims            current investment beliefs
├── Sources           immutable evidence objects
├── Decisions         human judgments and stage changes
├── Mutations         proposed canonical-state writes
├── Open questions    gaps blocking confidence
├── Tasks             bounded work spawned from gaps
└── Context receipts  exact working sets supplied to agents
```

Sources carry origin, custodian, collection method, observed date, locator and exact excerpt. Claims carry policy materiality, status and accepted value. Candidate changes carry the old/new values, evidence set, base revision and review state.

## Primary surfaces

### Candidate-change inbox

The shared queue for material mutations and unresolved claims. It is the team-level control surface missing from private prompting. Approvals and rejections are explicit, attributable and reversible through history.

### Accepted state

A decision-oriented claim set, not a generic document list. Candidate values remain outside accepted state until approval commits a new revision.

### Context compiler

Compiles required claims first under a hard token budget. If the required set cannot fit, it blocks with a minimum required budget. Optional exclusions are reason-coded and surfaced.

### Time machine

Reconstructs sources, claims, mutations, tasks and decisions at a cutoff time. This supports IC audit, loss reviews and process learning without hindsight contamination.

### Dependency invalidation

Every compiled pack or output records its claim revisions. Committing a changed claim marks dependent artifacts stale with an explicit reason; recompilation seals a new receipt against the current accepted revision.

## Suggested Alludium integration

- Read existing project artifacts through Alludium’s file/artifact primitives.
- Subscribe to task-output and stage-change events.
- Store state objects in the project Data layer with append-only mutation events.
- Expose `get_state_snapshot`, `compile_task_context`, `propose_mutation`, `approve_mutation` and `spawn_gap_task` as internal operations.
- Inject sealed context packs into First Look, Opportunity Evaluation and IC Memo tasks.
- Write review actions and receipts into Activity for firm-wide visibility.

## Pilot definition

Run Threadline retrospectively against five completed deals: one win, one loss, one pass, one active diligence process and one deal with materially changed metrics. Success criteria:

- investors can trace every IC claim to evidence in under 30 seconds;
- the engine surfaces at least one previously implicit definition change per deal;
- context packs cut irrelevant prompt material while preserving all high-materiality claims;
- point-in-time replay matches the evidence available at the historical decision;
- investors accept or reject mutations without needing to inspect raw orchestration logs.

## What the current build proves

The prototype implements accepted revisions, candidate review, append-only events, dependency invalidation, fail-closed context compilation, deterministic receipts, idempotent task-output ingestion, revision replay, local persistence and JSON export. External integrations are represented by realistic fixtures; investment conclusions are fictional.
