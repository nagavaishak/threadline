import test from "node:test";
import assert from "node:assert/strict";
import {
  seedPipeline, reversalEmail, deepClone, getAcceptedState, getCandidateChanges, getArtifacts,
  approveChange, rejectChange, compileContextPack, exportReceipt, rebuildOutput, renderOutput,
  diffLines, snapshotRevision, fieldHistory, ingestTaskOutput, isValidDeal
} from "../core.js";

const closeDate = deal => getAcceptedState(deal).fields.find(field => field.id === "halden.closeDate").value.date;
const artifact = (deal, id) => getArtifacts(deal).find(item => item.id === id);
const allText = deal => getArtifacts(deal).flatMap(item => item.content).join("\n");

function throughReversal() {
  let deal = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  deal = rebuildOutput(deal, "a-forecast").deal;
  deal = rebuildOutput(deal, "a-followup").deal;
  deal = ingestTaskOutput(deal, reversalEmail).deal;
  return approveChange(deal, "p-close-oct").deal;
}

test("pending change never reaches accepted state, output text or compiled context", () => {
  const deal = ingestTaskOutput(approveChange(deepClone(seedPipeline), "p-close-q4").deal, reversalEmail).deal;
  assert.equal(getCandidateChanges(deal).at(-1).state, "pending");
  assert.equal(closeDate(deal), "2026-12-15");
  assert.ok(!allText(deal).includes("30 Oct"));
  const pack = compileContextPack(deal, { policy: "forecast" });
  assert.equal(pack.included.find(item => item.field.id === "halden.closeDate").field.value.date, "2026-12-15");
});

test("a pending change marks outputs that read the field at risk without touching their text", () => {
  const seed = deepClone(seedPipeline);
  const forecast = artifact(seed, "a-forecast");
  assert.equal(forecast.state, "fresh");
  assert.deepEqual(forecast.atRisk, { proposalId: "p-close-q4", fieldId: "halden.closeDate" });
  assert.deepEqual(forecast.content, seedPipeline.artifacts[0].content);
  assert.equal(artifact(seed, "a-orrin-brief").atRisk, undefined);
});

test("reject leaves accepted state unchanged and the rejection appears in history at its revision", () => {
  const deal = deepClone(seedPipeline);
  const before = getAcceptedState(deal);
  const rejected = rejectChange(deal, "p-close-q4");
  assert.deepEqual(getAcceptedState(rejected), before);
  assert.equal(getCandidateChanges(rejected)[0].state, "rejected");
  assert.deepEqual(snapshotRevision(rejected, 17).reviews.map(review => [review.proposalId, review.state]), [["p-close-q4", "rejected"]]);
  assert.ok(getArtifacts(rejected).every(item => item.state === "fresh" && !item.atRisk));
});

test("approval creates revision 18 and invalidates only outputs that read the changed field", () => {
  const { deal, revision, invalidated } = approveChange(deepClone(seedPipeline), "p-close-q4");
  assert.equal(revision, 18);
  assert.equal(closeDate(deal), "2026-12-15");
  assert.deepEqual(invalidated.map(item => item.id).sort(), ["a-followup", "a-forecast"].sort());
  assert.equal(artifact(deal, "a-orrin-brief").state, "fresh");
  assert.deepEqual(snapshotRevision(deal, 18).reviews.map(review => [review.proposalId, review.state, review.appliedRevision]), [["p-close-q4", "approved", 18]]);
});

test("a stale output still reports the value it actually read", () => {
  const { deal } = approveChange(deepClone(seedPipeline), "p-close-q4");
  const forecast = artifact(deal, "a-forecast");
  assert.equal(forecast.used.find(read => read.fieldId === "halden.closeDate").value.date, "2026-09-30");
  assert.ok(forecast.content.join(" ").includes("30 Sep 2026"));
  assert.match(forecast.staleReason, /Halden Freight close date as 30 Sep 2026 at revision 17.*15 Dec 2026/);
});

test("seed outputs match their templates and rendering is deterministic", () => {
  const deal = deepClone(seedPipeline);
  for (const item of deal.artifacts) {
    const fields = compileContextPack(deal, { policy: item.policy }).included.map(entry => entry.field);
    assert.deepEqual(renderOutput(item.policy, fields), item.content);
    assert.deepEqual(renderOutput(item.policy, fields), renderOutput(item.policy, deepClone(fields)));
  }
});

test("rebuild regenerates from accepted state, keeps the previous version and diffs it", () => {
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  const { deal, receipt } = rebuildOutput(approved, "a-forecast");
  const forecast = artifact(deal, "a-forecast");
  assert.equal(forecast.state, "fresh");
  assert.equal(forecast.revision, 18);
  assert.equal(forecast.receiptHash, receipt.hash);
  assert.equal(forecast.staleReason, undefined);
  assert.ok(forecast.used.every(read => read.revision === 18));
  assert.equal(forecast.content[0], "Q3 2026 commit: $80k across 1 deal.");
  assert.ok(forecast.content.some(line => line.startsWith("Hedged: “We're probably going to revisit this in Q4.”")));
  assert.deepEqual(forecast.previous.content, seedPipeline.artifacts[0].content);
  const diff = diffLines(forecast.previous.content, forecast.content);
  assert.ok(diff.some(line => line.type === "removed" && line.text === "Q3 2026 commit: $200k across 2 deals."));
  assert.ok(diff.some(line => line.type === "same" && line.text.startsWith("Orrin Health")));
  assert.equal(artifact(deal, "a-followup").state, "stale");
});

test("rebuild uses the output's own policy and refuses outputs that are already current", () => {
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  const { receipt } = rebuildOutput(approved, "a-followup");
  assert.equal(receipt.policy, "followup");
  assert.deepEqual(receipt.reads.map(read => read.id), ["halden.champion", "halden.closeDate"]);
  assert.throws(() => rebuildOutput(approved, "a-orrin-brief"), /already current/);
});

test("a reversal keeps both moves in history and the regenerated forecast says so", () => {
  let deal = throughReversal();
  assert.deepEqual(fieldHistory(deal, "halden.closeDate").map(entry => entry.value.date), ["2026-09-30", "2026-12-15", "2026-10-30"]);
  assert.equal(snapshotRevision(deal, 18).fields.find(field => field.id === "halden.closeDate").value.hedge.quote, "We're probably going to revisit this in Q4.");
  assert.equal(artifact(deal, "a-forecast").state, "stale");
  assert.equal(artifact(deal, "a-orrin-brief").state, "fresh");
  deal = rebuildOutput(deal, "a-forecast").deal;
  assert.ok(artifact(deal, "a-forecast").content.includes("Close date has moved 2 times since 2 Sep 2026."));
});

test("approval against a stale base revision is refused", () => {
  const withSecond = ingestTaskOutput(deepClone(seedPipeline), { ...reversalEmail, candidate: { ...reversalEmail.candidate, proposalId: "p-race" } }).deal;
  const approved = approveChange(withSecond, "p-close-q4").deal;
  assert.throws(() => approveChange(approved, "p-race"), /older revision/);
  assert.throws(() => approveChange(approved, "p-close-q4"), /already reviewed/);
});

test("compiler fails closed and never exceeds budget", () => {
  const blocked = compileContextPack(seedPipeline, { policy: "forecast", budget: 900 });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.minimumRequiredTokens > blocked.budget);
  const ready = compileContextPack(seedPipeline, { policy: "forecast", budget: blocked.minimumRequiredTokens });
  assert.equal(ready.status, "ready");
  assert.ok(ready.tokens <= ready.budget);
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  assert.throws(() => rebuildOutput(approved, "a-forecast", { budget: 900 }), /Required fields need at least/);
  assert.equal(artifact(approved, "a-forecast").state, "stale");
});

test("receipts are deterministic and input-sensitive", () => {
  const pack = compileContextPack(seedPipeline, { policy: "brief", budget: 2600 });
  const first = exportReceipt(seedPipeline, pack);
  const second = exportReceipt(seedPipeline, compileContextPack(seedPipeline, { policy: "brief", budget: 2600 }));
  const changed = exportReceipt(seedPipeline, compileContextPack(seedPipeline, { policy: "brief", budget: 700 }));
  assert.deepEqual(first, second);
  assert.notEqual(first.hash, changed.hash);
  assert.deepEqual(changed.exclusions, [{ fieldId: "orrin.competition", reason: "optional_field_exceeds_budget" }]);
});

test("task output ingestion is idempotent and proposes against the current revision", () => {
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  const first = ingestTaskOutput(approved, reversalEmail);
  const second = ingestTaskOutput(first.deal, reversalEmail);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.deal.events.filter(event => event.externalId === reversalEmail.externalId).length, 1);
  assert.equal(second.deal.sources.filter(source => source.id === "s-email-reversal").length, 1);
  const proposal = getCandidateChanges(first.deal).at(-1);
  assert.equal(proposal.baseRevision, 18);
  assert.equal(proposal.payload.from.date, "2026-12-15");
});

test("line diff orders removals before additions and keeps unchanged lines", () => {
  assert.deepEqual(diffLines(["a", "b", "c"], ["a", "x", "c"]), [
    { type: "same", text: "a" }, { type: "removed", text: "b" }, { type: "added", text: "x" }, { type: "same", text: "c" }
  ]);
  assert.deepEqual(diffLines([], ["x"]), [{ type: "added", text: "x" }]);
});

test("a rejection made after a commit is filed at the revision it was made against", () => {
  const race = { ...reversalEmail, candidate: { ...reversalEmail.candidate, proposalId: "p-race" } };
  let deal = ingestTaskOutput(deepClone(seedPipeline), race).deal;
  deal = approveChange(deal, "p-close-q4").deal;
  deal = rejectChange(deal, "p-race");
  assert.deepEqual(snapshotRevision(deal, 17).reviews, []);
  assert.deepEqual(snapshotRevision(deal, 18).reviews.map(review => [review.proposalId, review.state, review.appliedRevision]), [["p-close-q4", "approved", 18], ["p-race", "rejected", 18]]);
});

test("a proposal id can't be reused by a different task output", () => {
  const deal = ingestTaskOutput(approveChange(deepClone(seedPipeline), "p-close-q4").deal, reversalEmail).deal;
  const copy = { ...reversalEmail, externalId: "task-output-999", candidate: { proposalId: "p-close-oct", payload: { ...reversalEmail.candidate.payload, to: { type: "date", date: "2027-01-15" } } } };
  assert.throws(() => ingestTaskOutput(deal, copy), /already uses this proposal id/);
});

test("a second change re-marks outputs that are already stale with the latest reason", () => {
  const deal = ingestTaskOutput(approveChange(deepClone(seedPipeline), "p-close-q4").deal, reversalEmail).deal;
  const { deal: next, invalidated } = approveChange(deal, "p-close-oct");
  assert.deepEqual(invalidated.map(item => item.id).sort(), ["a-followup", "a-forecast"].sort());
  assert.match(artifact(next, "a-forecast").staleReason, /Revision 19 changed it to 30 Oct 2026/);
  assert.equal(artifact(next, "a-orrin-brief").state, "fresh");
});

test("an output rebuilt while a change is pending uses only accepted values", () => {
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  const pending = ingestTaskOutput(approved, reversalEmail).deal;
  const forecast = artifact(rebuildOutput(pending, "a-forecast").deal, "a-forecast");
  assert.ok(forecast.content.join("\n").includes("15 Dec 2026"));
  assert.ok(!forecast.content.join("\n").includes("30 Oct"));
});

test("receipts change when an accepted value changes", () => {
  const before = exportReceipt(seedPipeline, compileContextPack(seedPipeline, { policy: "forecast" }));
  const approved = approveChange(deepClone(seedPipeline), "p-close-q4").deal;
  const after = exportReceipt(approved, compileContextPack(approved, { policy: "forecast" }));
  assert.notEqual(before.hash, after.hash);
  assert.equal(after.reads.find(read => read.id === "halden.closeDate").value.date, "2026-12-15");
});

test("saved logs that change seeded parts are rejected", () => {
  assert.equal(isValidDeal(deepClone(seedPipeline)), true);
  assert.equal(isValidDeal(ingestTaskOutput(approveChange(deepClone(seedPipeline), "p-close-q4").deal, reversalEmail).deal), true);
  const retyped = deepClone(seedPipeline); retyped.events[2].type = "note";
  const noSources = { ...deepClone(seedPipeline), sources: [] };
  const badPolicy = deepClone(seedPipeline); badPolicy.artifacts[0].policy = "nope";
  for (const deal of [retyped, noSources, badPolicy]) assert.equal(isValidDeal(deal), false);
});
