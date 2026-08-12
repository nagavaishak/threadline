import test from "node:test";
import assert from "node:assert/strict";
import {
  seedDeal, deepClone, getAcceptedState, getCandidateChanges, getArtifacts,
  approveChange, rejectChange, compileContextPack, exportReceipt, sealPack,
  snapshotRevision, ingestTaskOutput
} from "../core.js";

test("pending candidate never changes accepted state or compiled context", () => {
  const deal = deepClone(seedDeal);
  assert.equal(getCandidateChanges(deal)[0].state, "pending");
  assert.equal(getAcceptedState(deal).claims.find(c => c.id === "c-pipeline").acceptedValue.value, 4.2);
  const pack = compileContextPack(deal, { task: "commercial", budget: 2600 });
  assert.equal(pack.included.find(x => x.claim.id === "c-pipeline").claim.acceptedValue.value, 4.2);
});

test("reject appends review event and leaves accepted revision byte-for-byte unchanged", () => {
  const deal = deepClone(seedDeal);
  const before = getAcceptedState(deal);
  const rejected = rejectChange(deal, "p-pipeline", "SK");
  assert.deepEqual(getAcceptedState(rejected), before);
  assert.equal(getCandidateChanges(rejected)[0].state, "rejected");
  assert.equal(rejected.events.at(-1).type, "change_rejected");
});

test("approval atomically creates revision 18 and invalidates dependencies", () => {
  const { deal, revision, invalidated } = approveChange(deepClone(seedDeal), "p-pipeline", "SK");
  assert.equal(revision, 18);
  assert.equal(getAcceptedState(deal).claims.find(c => c.id === "c-pipeline").acceptedValue.value, 1.8);
  assert.equal(getCandidateChanges(deal)[0].state, "approved");
  assert.deepEqual(invalidated.map(x => x.id).sort(), ["a-commercial-pack", "a-ic-snapshot"]);
  assert.ok(deal.events.some(event => event.type === "revision_committed" && event.revision === 18));
});

test("revision replay preserves prior and current values", () => {
  const { deal } = approveChange(deepClone(seedDeal), "p-pipeline", "SK");
  assert.equal(snapshotRevision(deal, 17).claims.find(c => c.id === "c-pipeline").acceptedValue.value, 4.2);
  assert.equal(snapshotRevision(deal, 18).claims.find(c => c.id === "c-pipeline").acceptedValue.value, 1.8);
  assert.equal(snapshotRevision(deal, 17).claims.length, snapshotRevision(deal, 18).claims.length);
});

test("compiler fails closed and never exceeds budget", () => {
  const blocked = compileContextPack(seedDeal, { task: "commercial", budget: 900 });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.minimumRequiredTokens > blocked.budget);
  const ready = compileContextPack(seedDeal, { task: "commercial", budget: blocked.minimumRequiredTokens });
  assert.equal(ready.status, "ready");
  assert.ok(ready.tokens <= ready.budget);
});

test("receipts are deterministic and input-sensitive", () => {
  const pack = compileContextPack(seedDeal, { task: "commercial", budget: 2600 });
  const first = exportReceipt(seedDeal, pack);
  const second = exportReceipt(seedDeal, compileContextPack(seedDeal, { task: "commercial", budget: 2600 }));
  const changed = exportReceipt(seedDeal, compileContextPack(seedDeal, { task: "commercial", budget: 2800 }));
  assert.deepEqual(first, second);
  assert.notEqual(first.hash, changed.hash);
});

test("sealing a new pack replaces stale dependency state with current revision", () => {
  const approved = approveChange(deepClone(seedDeal), "p-pipeline", "SK").deal;
  assert.equal(getArtifacts(approved).find(x => x.id === "a-commercial-pack").state, "stale");
  const pack = compileContextPack(approved, { task: "commercial", budget: 2600 });
  const sealed = sealPack(approved, pack, "a-commercial-pack");
  const artifact = getArtifacts(sealed.deal).find(x => x.id === "a-commercial-pack");
  assert.equal(artifact.state, "fresh");
  assert.equal(artifact.revision, 18);
  assert.equal(artifact.receiptHash, sealed.receipt.hash);
});

test("Alludium-style task output ingestion is idempotent", () => {
  const payload = { externalId: "task-output-999", at: "2026-08-12T11:00:00Z", actor: "First Look Analyst", output: { task: "Investment Fit Screen" } };
  const first = ingestTaskOutput(seedDeal, payload);
  const second = ingestTaskOutput(first.deal, payload);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.deal.events.filter(event => event.externalId === payload.externalId).length, 1);
});
