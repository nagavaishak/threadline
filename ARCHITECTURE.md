# Threadline architecture

## What exists today

```text
Static browser application
├── Guided walkthrough           app.js + compat.css
├── Deterministic event engine   core.js
├── Fictional pipeline fixtures  seedPipeline, reversalEmail in core.js
├── Persistence                  store.js: localStorage + version token + navigator.locks
└── Invariant tests              node:test (tests/core.test.js, tests/store.test.js)
```

The engine is real, not a sequence of mocked screens. Everything the UI shows is derived from one append-only event log:

| Event | Meaning |
|---|---|
| `task_output_ingested` | An agent finished reading a call or email. Deduplicated by `externalId`. |
| `change_proposed` | A proposed new value for one field, with evidence, hedge and base revision. |
| `change_approved` / `change_rejected` | A person's decision. |
| `revision_committed` | The accepted value of one field at a new revision. |
| `artifact_invalidated` | An output read the old value; the reason names the field, value and revisions. |
| `output_rebuilt` | A regenerated output: new content and reads, the previous version and a receipt. |

## How it could work in production

```text
calls / email / meetings
          │
          ▼
  capture + agents ── propose ──► field_proposals (evidence, hedge, base_version)
                                         │
                              human approve / reject
                                         │  one transaction:
                                         ▼  compare-and-set on field version
                                 field_events (append-only)
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                 field projection              output_reads index
                 (current values)              (output, record, field, version)
                                                         │
                                          outbox: invalidate dependents
                                                         │
                                                         ▼
                                     regeneration worker (lazy, idempotent)
                                                         │
                                                         ▼
                                     context assembler ──► generator (LLM)
                                     records every read     output + diff + receipt
```

### Design choices

| Concern | Choice | Why |
|---|---|---|
| **Field history** | Append-only `field_events` table, with projections for current values | Reversals stay visible, and point-in-time replay is a query |
| **Dependency capture** | Every generator gets context from one assembler, which writes `output_reads` rows | Dependencies are recorded when something is read, not declared by hand |
| **Invalidation** | Approval and invalidation in one transaction, with an outbox event for regeneration | A committed change can never leave dependents unmarked |
| **Concurrency** | Compare-and-set on the field version at approval | Two reviewers can't both win, and a stale proposal is refused |
| **Ingestion** | Idempotency key per source message | Retries and duplicate webhooks don't create duplicate proposals |
| **Regeneration** | Lazy (when an output is opened or scheduled), not eager | Saves LLM cost on fan-out: one field can feed many reports |
| **Sent outputs** | Never rewritten; flagged "sent with old value", with a suggested correction | An email that already went out can't be edited after the fact |
| **Pending changes** | Outputs that read a field with a pending proposal show as *at risk* | Nobody forwards a forecast while its approval is still in the queue |

### What to measure
- **Read-set coverage:** the share of generated outputs with a complete read record. An eval should fail if a generator reads a field without going through the assembler.
- **Time from approval to stale flag,** and how many stale outputs were opened or sent before being regenerated.
- **Close-date moves per deal** over a window. Volatility is a forecast signal in its own right.
