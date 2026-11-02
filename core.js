export const POLICY_VERSION = "threadline-policy/4.0";
export const SCHEMA = "threadline.pipeline-state.v4";

export const seedPipeline = {
  schema: SCHEMA,
  id: "q3-mid-market",
  team: "Mid-market sales",
  owner: "JR",
  baseRevision: 17,
  baseCommittedAt: "2026-08-28T16:00:00Z",
  fields: [
    { id: "halden.amount", recordId: "halden", record: "Halden Freight", label: "Amount", kind: "judgment", value: { type: "money", amount: 120000 }, sourceIds: ["s-crm-halden"] },
    { id: "halden.stage", recordId: "halden", record: "Halden Freight", label: "Stage", kind: "judgment", value: { type: "text", text: "Commit" }, sourceIds: ["s-crm-halden"] },
    { id: "halden.closeDate", recordId: "halden", record: "Halden Freight", label: "Close date", kind: "judgment", value: { type: "date", date: "2026-09-30" }, sourceIds: ["s-crm-halden"] },
    { id: "halden.champion", recordId: "halden", record: "Halden Freight", label: "Champion", kind: "observation", value: { type: "text", text: "Maya Lindqvist, Head of Operations" }, sourceIds: ["s-email-halden"] },
    { id: "orrin.amount", recordId: "orrin", record: "Orrin Health", label: "Amount", kind: "judgment", value: { type: "money", amount: 80000 }, sourceIds: ["s-crm-orrin"] },
    { id: "orrin.stage", recordId: "orrin", record: "Orrin Health", label: "Stage", kind: "judgment", value: { type: "text", text: "Commit" }, sourceIds: ["s-crm-orrin"] },
    { id: "orrin.closeDate", recordId: "orrin", record: "Orrin Health", label: "Close date", kind: "judgment", value: { type: "date", date: "2026-09-24" }, sourceIds: ["s-crm-orrin"] },
    { id: "orrin.champion", recordId: "orrin", record: "Orrin Health", label: "Champion", kind: "observation", value: { type: "text", text: "Dev Raman, VP Finance" }, sourceIds: ["s-call-orrin"] },
    { id: "orrin.competition", recordId: "orrin", record: "Orrin Health", label: "Competition", kind: "inference", value: { type: "text", text: "Replacing spreadsheets; no other vendor named" }, sourceIds: ["s-call-orrin"] }
  ],
  sources: [
    { id: "s-crm-halden", type: "CRM", custodian: "Jordan Reyes (rep)", title: "Halden Freight opportunity", locator: "Entered 12 Aug", observedAt: "2026-08-12", excerpt: "Close date 30 Sep 2026 · Commit · $120k" },
    { id: "s-email-halden", type: "EMAIL", custodian: "Maya Lindqvist (Halden)", title: "Intro email signature", locator: "4 Aug · 10:02", observedAt: "2026-08-04", excerpt: "Maya Lindqvist, Head of Operations, Halden Freight" },
    { id: "s-call-halden", type: "CALL", custodian: "Maya Lindqvist (Halden)", title: "Halden weekly sync", locator: "2 Sep · 14:12", observedAt: "2026-09-02", excerpt: "We're probably going to revisit this in Q4." },
    { id: "s-crm-orrin", type: "CRM", custodian: "Jordan Reyes (rep)", title: "Orrin Health opportunity", locator: "Entered 20 Aug", observedAt: "2026-08-20", excerpt: "Close date 24 Sep 2026 · Commit · $80k" },
    { id: "s-call-orrin", type: "CALL", custodian: "Dev Raman (Orrin)", title: "Orrin discovery call", locator: "19 Aug · 08:51", observedAt: "2026-08-19", excerpt: "Right now this all lives in spreadsheets; we haven't looked at other vendors." }
  ],
  artifacts: [
    { id: "a-forecast", title: "Q3 forecast summary", policy: "forecast", state: "fresh", revision: 17,
      content: ["Q3 2026 commit: $200k across 2 deals.", "Halden Freight: $120k, Commit, closes 30 Sep 2026.", "Orrin Health: $80k, Commit, closes 24 Sep 2026."],
      used: [
        { fieldId: "halden.amount", revision: 17, value: { type: "money", amount: 120000 } },
        { fieldId: "halden.stage", revision: 17, value: { type: "text", text: "Commit" } },
        { fieldId: "halden.closeDate", revision: 17, value: { type: "date", date: "2026-09-30" } },
        { fieldId: "orrin.amount", revision: 17, value: { type: "money", amount: 80000 } },
        { fieldId: "orrin.stage", revision: 17, value: { type: "text", text: "Commit" } },
        { fieldId: "orrin.closeDate", revision: 17, value: { type: "date", date: "2026-09-24" } }
      ] },
    { id: "a-followup", title: "Follow-up email draft to Halden", policy: "followup", state: "fresh", revision: 17,
      content: ["To: Maya Lindqvist, Head of Operations", "Subject: Next steps for your Q3 2026 renewal", "Thanks for the time today. Working back from a 30 Sep 2026 start, I'll send the order form two weeks ahead."],
      used: [
        { fieldId: "halden.champion", revision: 17, value: { type: "text", text: "Maya Lindqvist, Head of Operations" } },
        { fieldId: "halden.closeDate", revision: 17, value: { type: "date", date: "2026-09-30" } }
      ] },
    { id: "a-orrin-brief", title: "Orrin Health account brief", policy: "brief", state: "fresh", revision: 17,
      content: ["Champion: Dev Raman, VP Finance.", "Competition: Replacing spreadsheets; no other vendor named."],
      used: [
        { fieldId: "orrin.champion", revision: 17, value: { type: "text", text: "Dev Raman, VP Finance" } },
        { fieldId: "orrin.competition", revision: 17, value: { type: "text", text: "Replacing spreadsheets; no other vendor named" } }
      ] }
  ],
  events: [
    { id: "e-seed-17", type: "revision_committed", at: "2026-08-28T16:00:00Z", actor: "JR", revision: 17, payload: { initial: true } },
    { id: "e-output-204", externalId: "task-output-204", type: "task_output_ingested", at: "2026-09-02T14:40:00Z", actor: "Call notes agent", payload: { task: "Call summary", sourceId: "s-call-halden" } },
    { id: "e-proposal-close-q4", type: "change_proposed", at: "2026-09-02T14:41:00Z", actor: "Call notes agent", proposalId: "p-close-q4", baseRevision: 17, payload: {
      fieldId: "halden.closeDate",
      from: { type: "date", date: "2026-09-30" },
      to: { type: "date", date: "2026-12-15", hedge: { quote: "We're probably going to revisit this in Q4.", note: "She said “probably” and gave no date. 15 Dec is the agent's reading of “Q4”." } },
      reason: "The buyer signalled the renewal may slip out of Q3.",
      sourceIds: ["s-call-halden"]
    } }
  ]
};

// The email that arrives two weeks later, ingested through the same idempotent path as any task output.
export const reversalEmail = {
  externalId: "task-output-311",
  at: "2026-09-16T09:30:00Z",
  actor: "Inbox agent",
  output: { task: "Email triage", sourceId: "s-email-reversal" },
  sources: [{ id: "s-email-reversal", type: "EMAIL", custodian: "Maya Lindqvist (Halden)", title: "Re: renewal timing", locator: "16 Sep · 09:24", observedAt: "2026-09-16", excerpt: "Budget freed up after all. Can we pick this back up for October?" }],
  candidate: { proposalId: "p-close-oct", payload: {
    fieldId: "halden.closeDate",
    to: { type: "date", date: "2026-10-30", hedge: { quote: "Can we pick this back up for October?", note: "She asked for October but gave no day. 30 Oct is the agent's reading." } },
    reason: "The buyer reversed the Q4 slip by email.",
    sourceIds: ["s-email-reversal"]
  } }
};

export const deepClone = value => JSON.parse(JSON.stringify(value));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function quarterOf(iso) {
  const [year, month] = iso.split("-").map(Number);
  return `Q${Math.ceil(month / 3)} ${year}`;
}

export function formatValue(value) {
  if (!value) return "—";
  if (value.type === "date") return formatDate(value.date);
  if (value.type === "money") return `$${(value.amount / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  return value.text ?? "—";
}

function addMinutes(iso, minutes) {
  return new Date(Date.parse(iso) + minutes * 60000).toISOString().replace(".000Z", "Z");
}

function eventId(prefix, deal, at) {
  return `${prefix}-${deal.events.length + 1}-${String(at).replace(/\D/g, "").slice(-10)}`;
}

export function getAcceptedState(deal, targetRevision = Infinity) {
  const fields = Object.fromEntries(deal.fields.map(field => [field.id, { ...deepClone(field), revision: deal.baseRevision }]));
  let revision = deal.baseRevision;
  let committedAt = deal.baseCommittedAt;
  for (const event of deal.events) {
    if (event.type !== "revision_committed" || event.payload?.initial || event.revision > targetRevision) continue;
    const field = fields[event.payload.fieldId];
    if (field) {
      field.value = deepClone(event.payload.value);
      field.sourceIds = [...event.payload.sourceIds];
      field.acceptedAt = event.at;
      field.acceptedBy = event.actor;
      field.revision = event.revision;
    }
    revision = Math.max(revision, event.revision);
    committedAt = event.at;
  }
  return { revision: Math.min(revision, targetRevision), committedAt, fields: Object.values(fields) };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// True only for a log this app could have written. Everything except events and sources is fixed at
// seeding; events start with the seed's own, and sources only ever gain the reversal email's.
export function isValidDeal(deal) {
  try {
    if (deal?.schema !== SCHEMA || ![deal.fields, deal.sources, deal.artifacts, deal.events].every(Array.isArray)) return false;
    if (!same({ ...deal, sources: [], events: [] }, { ...seedPipeline, sources: [], events: [] })) return false;
    if (!same(deal.events.slice(0, seedPipeline.events.length), seedPipeline.events)) return false;
    if (!same(deal.sources, seedPipeline.sources) && !same(deal.sources, [...seedPipeline.sources, ...reversalEmail.sources])) return false;
    getAcceptedState(deal);
    getCandidateChanges(deal).forEach(proposal => proposal.payload.fieldId.trim());
    getArtifacts(deal).forEach(artifact => artifact.content.join(""));
    return true;
  } catch {
    return false;
  }
}

export function getCandidateChanges(deal) {
  return deal.events.filter(event => event.type === "change_proposed").map(proposal => {
    const review = deal.events.find(event => ["change_approved", "change_rejected"].includes(event.type) && event.proposalId === proposal.proposalId);
    const commit = deal.events.find(event => event.type === "revision_committed" && event.proposalId === proposal.proposalId);
    return { ...deepClone(proposal), state: review ? review.type.replace("change_", "") : "pending", reviewedBy: review?.actor, reviewedAt: review?.at, reviewedAtRevision: review?.payload.baseRevision, committedRevision: commit?.revision };
  });
}

// Every committed move of a field after the seed, with the date of the conversation that caused it.
export function fieldHistory(deal, fieldId, targetRevision = Infinity) {
  const seed = deal.fields.find(field => field.id === fieldId);
  const history = [{ revision: deal.baseRevision, value: deepClone(seed.value), actor: deal.owner, observedAt: null, sourceIds: [...seed.sourceIds] }];
  for (const event of deal.events) {
    if (event.type !== "revision_committed" || event.payload?.initial || event.payload.fieldId !== fieldId || event.revision > targetRevision) continue;
    history.push({ revision: event.revision, value: deepClone(event.payload.value), actor: event.actor, observedAt: event.payload.observedAt, sourceIds: [...event.payload.sourceIds] });
  }
  return history;
}

function fieldMoves(deal) {
  const moves = {};
  for (const field of deal.fields) {
    const changes = fieldHistory(deal, field.id).slice(1);
    if (changes.length) moves[field.id] = { count: changes.length, since: changes[0].observedAt };
  }
  return moves;
}

function readsField(artifact, fieldId) {
  return artifact.used.some(read => read.fieldId === fieldId);
}

export function getArtifacts(deal) {
  const artifacts = deepClone(deal.artifacts);
  for (const event of deal.events) {
    if (event.type === "artifact_invalidated") {
      const artifact = artifacts.find(item => item.id === event.payload.artifactId);
      if (artifact) Object.assign(artifact, { state: "stale", staleAt: event.at, staleReason: event.payload.reason, invalidatedByRevision: event.payload.revision });
    }
    if (event.type === "output_rebuilt") {
      const artifact = artifacts.find(item => item.id === event.payload.artifactId);
      if (!artifact) continue;
      Object.assign(artifact, deepClone(event.payload.next), { state: "fresh", previous: deepClone(event.payload.previous), rebuiltAt: event.at });
      delete artifact.staleAt;
      delete artifact.staleReason;
      delete artifact.invalidatedByRevision;
    }
  }
  const pending = getCandidateChanges(deal).filter(proposal => proposal.state === "pending");
  for (const artifact of artifacts) {
    const risk = pending.find(proposal => readsField(artifact, proposal.payload.fieldId));
    if (artifact.state === "fresh" && risk) artifact.atRisk = { proposalId: risk.proposalId, fieldId: risk.payload.fieldId };
  }
  return artifacts;
}

function fieldName(deal, fieldId) {
  const field = deal.fields.find(item => item.id === fieldId);
  return field ? `${field.record} ${field.label.toLowerCase()}` : fieldId;
}

export function approveChange(deal, proposalId, actor = "You", at) {
  const next = deepClone(deal);
  const proposal = getCandidateChanges(next).find(item => item.proposalId === proposalId);
  if (!proposal) throw new Error("That change no longer exists");
  if (proposal.state !== "pending") throw new Error("This change was already reviewed");
  const accepted = getAcceptedState(next);
  if (proposal.baseRevision !== accepted.revision) throw new Error("This change was proposed against an older revision. Review the latest one instead");
  const when = at || addMinutes(proposal.at, 20);
  const revision = accepted.revision + 1;
  const { fieldId, to, sourceIds } = proposal.payload;
  next.events.push({ id: eventId("review", next, when), type: "change_approved", at: when, actor, proposalId, payload: { baseRevision: accepted.revision } });
  next.events.push({ id: eventId("revision", next, when), type: "revision_committed", at: when, actor, revision, proposalId, payload: { fieldId, value: deepClone(to), sourceIds: [...sourceIds], observedAt: proposal.at } });
  // Outputs that are already stale are re-marked too, so their reason names the latest value.
  for (const artifact of getArtifacts(next)) {
    const read = artifact.used.find(item => item.fieldId === fieldId && item.revision < revision);
    if (!read) continue;
    next.events.push({ id: eventId("invalidate", next, `${when}-${artifact.id}`), type: "artifact_invalidated", at: when, actor: "Threadline", payload: { artifactId: artifact.id, fieldId, revision, reason: `Read ${fieldName(next, fieldId)} as ${formatValue(read.value)} at revision ${read.revision}. Revision ${revision} changed it to ${formatValue(to)}.` } });
  }
  return { deal: next, revision, invalidated: getArtifacts(next).filter(item => item.invalidatedByRevision === revision) };
}

export function rejectChange(deal, proposalId, actor = "You", at) {
  const next = deepClone(deal);
  const proposal = getCandidateChanges(next).find(item => item.proposalId === proposalId);
  if (!proposal) throw new Error("That change no longer exists");
  if (proposal.state !== "pending") throw new Error("This change was already reviewed");
  const when = at || addMinutes(proposal.at, 20);
  next.events.push({ id: eventId("review", next, when), type: "change_rejected", at: when, actor, proposalId, payload: { baseRevision: getAcceptedState(next).revision } });
  return next;
}

export const outputPolicies = {
  forecast: { label: "Forecast generator", required: ["halden.amount", "halden.stage", "halden.closeDate", "orrin.amount", "orrin.stage", "orrin.closeDate"], optional: [] },
  followup: { label: "Email drafter", required: ["halden.champion", "halden.closeDate"], optional: [] },
  brief: { label: "Account brief writer", required: ["orrin.champion"], optional: ["orrin.competition"] }
};

function fieldTokens(field) { return 170 + field.sourceIds.length * 105; }

export function compileContextPack(deal, { policy = "forecast", budget = 2600, permissions = ["pipeline:read", "sources:excerpt"] } = {}) {
  const rules = outputPolicies[policy];
  if (!rules) throw new Error(`Unknown output policy ${policy}`);
  const state = getAcceptedState(deal);
  const byId = Object.fromEntries(state.fields.map(field => [field.id, field]));
  const baseTokens = 280;
  const requiredFields = rules.required.map(id => byId[id]).filter(Boolean);
  const minimumRequiredTokens = baseTokens + requiredFields.reduce((sum, field) => sum + fieldTokens(field), 0);
  if (budget < minimumRequiredTokens) {
    return { status: "blocked", policy, policyVersion: POLICY_VERSION, revision: state.revision, budget, tokens: 0, minimumRequiredTokens, included: [], sources: [], exclusions: rules.required.map(fieldId => ({ fieldId, reason: "required_field_does_not_fit" })), permissions: [...permissions], asOf: state.committedAt };
  }
  const included = requiredFields.map(field => ({ field, required: true, tokens: fieldTokens(field) }));
  let tokens = minimumRequiredTokens;
  const exclusions = [];
  for (const id of rules.optional) {
    const field = byId[id];
    if (!field) continue;
    const cost = fieldTokens(field);
    if (tokens + cost <= budget) { included.push({ field, required: false, tokens: cost }); tokens += cost; }
    else exclusions.push({ fieldId: id, reason: "optional_field_exceeds_budget" });
  }
  const sourceIds = new Set(included.flatMap(item => item.field.sourceIds));
  return { status: "ready", policy, policyVersion: POLICY_VERSION, revision: state.revision, budget, tokens, minimumRequiredTokens, included, sources: deal.sources.filter(source => sourceIds.has(source.id)), exclusions, permissions: [...permissions].sort(), asOf: state.committedAt };
}

// Deterministic templates: the same fields and history always produce the same lines.
export function renderOutput(policy, fields, { moves = {} } = {}) {
  const byId = Object.fromEntries(fields.map(field => [field.id, field]));
  const value = id => byId[id]?.value;
  if (policy === "forecast") {
    const deals = [...new Set(fields.map(field => field.recordId))].map(recordId => ({
      record: fields.find(field => field.recordId === recordId).record,
      amount: value(`${recordId}.amount`), stage: value(`${recordId}.stage`), close: value(`${recordId}.closeDate`), closeId: `${recordId}.closeDate`
    }));
    const commit = deals.filter(deal => deal.stage?.text === "Commit" && quarterOf(deal.close.date) === "Q3 2026");
    const total = commit.reduce((sum, deal) => sum + deal.amount.amount, 0);
    const lines = [`Q3 2026 commit: ${formatValue({ type: "money", amount: total })} across ${commit.length} deal${commit.length === 1 ? "" : "s"}.`];
    for (const deal of deals) {
      const quarter = quarterOf(deal.close.date);
      lines.push(`${deal.record}: ${formatValue(deal.amount)}, ${deal.stage.text}, closes ${formatValue(deal.close)}${quarter === "Q3 2026" ? "" : ` (${quarter}, outside Q3)`}.`);
      if (deal.close.hedge) lines.push(`Hedged: “${deal.close.hedge.quote}” ${deal.close.hedge.note}`);
      const move = moves[deal.closeId];
      if (move?.count >= 2) lines.push(`Close date has moved ${move.count} times since ${formatDate(move.since)}.`);
    }
    return lines;
  }
  if (policy === "followup") {
    const close = value("halden.closeDate");
    const lines = [`To: ${value("halden.champion").text}`, `Subject: Next steps for your ${quarterOf(close.date)} renewal`, `Thanks for the time today. Working back from a ${formatValue(close)} start, I'll send the order form two weeks ahead.`];
    if (close.hedge) lines.push(`Draft note: this date is a reading of “${close.hedge.quote}” Confirm it with Maya before sending.`);
    return lines;
  }
  if (policy === "brief") {
    const lines = [`Champion: ${value("orrin.champion").text}.`];
    if (value("orrin.competition")) lines.push(`Competition: ${value("orrin.competition").text}.`);
    return lines;
  }
  throw new Error(`No template for ${policy}`);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function exportReceipt(deal, pack, output) {
  if (pack.status !== "ready") throw new Error("Blocked context cannot be sealed");
  const body = {
    schema: "threadline.output-receipt.v3",
    pipelineId: deal.id,
    policy: pack.policy,
    revision: pack.revision,
    policyVersion: pack.policyVersion,
    permissionScope: pack.permissions,
    budget: pack.budget,
    tokensUsed: pack.tokens,
    asOf: pack.asOf,
    reads: pack.included.map(item => ({ id: item.field.id, required: item.required, value: item.field.value, sourceIds: item.field.sourceIds })),
    sourceExcerptIds: pack.sources.map(source => source.id).sort(),
    exclusions: pack.exclusions
  };
  if (output) body.output = output;
  return { ...body, hash: `tl_${fnv1a(stableStringify(body))}` };
}

export function rebuildOutput(deal, artifactId, { budget = 2600, permissions, at } = {}) {
  const artifact = getArtifacts(deal).find(item => item.id === artifactId);
  if (!artifact) throw new Error("That output no longer exists");
  if (artifact.state !== "stale") throw new Error(`${artifact.title} is already current`);
  const pack = compileContextPack(deal, { policy: artifact.policy, budget, permissions });
  if (pack.status !== "ready") throw new Error(`Required fields need at least ${pack.minimumRequiredTokens} tokens`);
  const content = renderOutput(artifact.policy, pack.included.map(item => item.field), { moves: fieldMoves(deal) });
  const used = pack.included.map(item => ({ fieldId: item.field.id, revision: pack.revision, value: deepClone(item.field.value) }));
  const receipt = exportReceipt(deal, pack, { artifactId, content });
  const next = deepClone(deal);
  const when = at || addMinutes(deal.events.at(-1).at, 5);
  next.events.push({ id: eventId("rebuild", next, `${when}-${artifactId}`), type: "output_rebuilt", at: when, actor: "Threadline", payload: {
    artifactId, receipt,
    previous: { revision: artifact.revision, content: artifact.content, used: artifact.used },
    next: { revision: pack.revision, content, used, receiptHash: receipt.hash }
  } });
  return { deal: next, receipt, artifact: getArtifacts(next).find(item => item.id === artifactId) };
}

// Line diff via longest common subsequence; outputs are a handful of lines.
export function diffLines(before, after) {
  const table = before.map(() => after.map(() => 0));
  const at = (i, j) => (i < before.length && j < after.length ? table[i][j] : 0);
  for (let i = before.length - 1; i >= 0; i -= 1) for (let j = after.length - 1; j >= 0; j -= 1) {
    table[i][j] = before[i] === after[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  }
  const result = [];
  let i = 0, j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) { result.push({ type: "same", text: before[i] }); i += 1; j += 1; }
    else if (i < before.length && (j >= after.length || at(i + 1, j) >= at(i, j + 1))) { result.push({ type: "removed", text: before[i] }); i += 1; }
    else { result.push({ type: "added", text: after[j] }); j += 1; }
  }
  return result;
}

export function snapshotRevision(deal, revision) {
  const state = getAcceptedState(deal, revision);
  const reviews = getCandidateChanges(deal)
    .filter(proposal => proposal.state !== "pending")
    .map(proposal => ({ ...proposal, appliedRevision: proposal.state === "approved" ? proposal.committedRevision : proposal.reviewedAtRevision }))
    .filter(review => review.appliedRevision <= revision);
  return { ...state, reviews };
}

export function ingestTaskOutput(deal, payload) {
  if (!payload?.externalId) throw new Error("externalId is required");
  if (deal.events.some(event => event.externalId === payload.externalId)) return { deal: deepClone(deal), created: false };
  if (payload.candidate && deal.events.some(event => event.proposalId === payload.candidate.proposalId)) throw new Error("A different change already uses this proposal id");
  const next = deepClone(deal);
  for (const source of payload.sources || []) if (!next.sources.some(item => item.id === source.id)) next.sources.push(deepClone(source));
  next.events.push({ id: eventId("output", next, payload.at), externalId: payload.externalId, type: "task_output_ingested", at: payload.at, actor: payload.actor || "AI task", payload: deepClone(payload.output) });
  if (payload.candidate) {
    const accepted = getAcceptedState(next);
    const candidate = deepClone(payload.candidate.payload);
    candidate.from ??= deepClone(accepted.fields.find(field => field.id === candidate.fieldId)?.value ?? null);
    next.events.push({ id: eventId("proposal", next, payload.at), type: "change_proposed", at: addMinutes(payload.at, 1), actor: payload.actor || "AI task", proposalId: payload.candidate.proposalId, baseRevision: accepted.revision, payload: candidate });
  }
  return { deal: next, created: true };
}
