# Threadline

## A reviewed-output commit protocol for investment workflows

> Independent concept prototype using fictional AsterOS data. Not affiliated with or integrated into Alludium.

Alludium’s visible product turns investment work into shared, reviewed outputs. Threadline explores the handoff after review: how a decision-bearing output becomes versioned deal state before another task relies on it.

### The concrete failure

The AsterOS deck says **€4.2m qualified pipeline**. The latest CRM export supports **€1.8m sales-accepted**, while the founder explains that “qualified” previously meant any account with a completed discovery call.

A summarizer can flatten that disagreement. A workflow engine can move both artifacts. Threadline treats it as a candidate state change:

- revision 17 remains accepted at €4.2m;
- exact CRM, founder-call and deck excerpts stay visible;
- the investor sees which downstream packs and outputs depend on revision 17;
- approval atomically commits revision 18 at €1.8m;
- dependent work becomes stale with a machine-readable reason;
- recompilation either fits every policy-required claim or blocks;
- the sealed receipt records revision, policy, permissions, exclusions and a deterministic hash;
- revision replay recovers both accepted states.

### Why it could fit Alludium

Threadline is not another agent, memo generator, run viewer or CRM. It is a proposed `State` primitive beside Tasks, Files and Data:

```text
reviewed task output
        ↓
candidate change + exact evidence
        ↓
human approve/reject boundary
        ↓
accepted revision N+1
        ↓
dependency invalidation
        ↓
bounded recompile + receipt
```

This directly extends Alludium’s visible product shifts:

- **Answers → Execution:** reviewed output becomes typed state, not more prose.
- **Individual → Team:** accepted state and its history are shared.
- **Recording → Moving:** a committed revision invalidates stale work and drives the next task.

### What the prototype proves

- pending values never enter accepted state or compiled context;
- rejection leaves the accepted revision unchanged and appends a review event;
- approval creates a new revision and invalidates dependent artifacts;
- revision replay preserves historical claim values;
- compilation fails closed below its minimum budget;
- identical inputs create the same receipt hash;
- reviewed Alludium-style task payload ingestion is idempotent.

The build contains eight deterministic invariant tests. External integrations are realistic fixtures, not live connections.

### The question

Is this state-transition problem already solved below Alludium’s visible product surface, or could an investor-facing commit protocol strengthen the handoffs between First Look, Diligence and IC Prep?
