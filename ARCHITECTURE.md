# Threadline architecture

Threadline is an independent, integration-ready product concept. The current repository proves the state-transition behavior locally; it does not claim access to private Alludium APIs or production customer data.

## What is implemented now

```text
Static browser application
├── Guided product experience        app.js + compat.css
├── Deterministic deal-state engine  core.js
├── Fictional AsterOS fixtures       seedDeal in core.js
├── Local state persistence          browser localStorage
├── Downloadable JSON receipts       browser Blob export
└── Domain-invariant test suite       node:test
```

The domain engine is real rather than a sequence of mocked screens. It implements:

- pending changes isolated from accepted state;
- explicit human approval and rejection;
- append-only revision events;
- dependency invalidation;
- revision replay;
- policy-bounded context compilation;
- fail-closed required context;
- deterministic context receipts;
- idempotent task-output ingestion.

The repository intentionally uses no production database, authentication system, model provider or Alludium connection. Those would be misleading without access to Alludium's internal contracts.

## Proposed production shape

```text
Alludium task output / file / CRM update
                     │
                     ▼
             Task-output adapter
                     │ normalizes typed events
                     ▼
         Append-only deal event store
          PostgreSQL + immutable evidence
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
  State projection         Dependency index
  accepted revision        output → claim revision
          │                      │
          └──────────┬───────────┘
                     ▼
           Human review boundary
        propose → approve / reject → commit
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
  Context compiler        Invalidation events
  policy + permissions    stale output + reason
          │                      │
          └──────────┬───────────┘
                     ▼
        Alludium task / agent execution
                     │
                     ▼
       output + deterministic receipt
```

### Suggested components

| Concern | Production choice | Why |
|---|---|---|
| Canonical events | PostgreSQL append-only event table | Transactions, auditability and point-in-time replay |
| Current state | Materialized projections in PostgreSQL | Fast reads without losing event history |
| Evidence files | Alludium artifact storage or object storage | Immutable source payloads with stable locators |
| Async work | Alludium Operations or a durable job queue | Recompilation and invalidation should be retryable |
| Authorization | Alludium project and task permissions | Context must be compiled within the caller's scope |
| Context compiler | Deterministic service or platform operation | Same revision, policy and inputs produce the same receipt |
| Integration | Typed Alludium task-output and stage-change events | Idempotent ingestion without screen scraping |
| Observability | Structured events, traces and receipt hashes | Explain what changed and what every output used |

## Minimum integration contract

Threadline would need five platform operations rather than a new parallel application:

```text
ingest_task_output(output, external_id)
propose_state_change(claim, evidence, base_revision)
approve_or_reject_change(proposal_id, actor)
compile_task_context(task_policy, revision, budget, permissions)
record_compiled_output(artifact_id, receipt)
```

All writes must be idempotent. Approval must compare the proposal's base revision with the latest accepted revision and fail if it is stale. Context compilation must exclude unapproved candidate values and block when required claims cannot fit.

## What a real pilot should validate

Before building the full backend, run a retrospective pilot on completed deals:

1. Reconstruct the important facts available at screening, diligence and IC.
2. Identify definition changes or corrections between those stages.
3. Measure whether investors can trace an IC claim to evidence in under 30 seconds.
4. Check whether Threadline finds outputs that should have been refreshed.
5. Compare a bounded context pack with the context the task actually received.

The next engineering decision should follow that workflow validation. The current prototype is sufficient for a product conversation; the architecture above demonstrates that it can become a production primitive rather than remaining a visual concept.
