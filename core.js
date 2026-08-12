export const POLICY_VERSION = "alludium-vc-state/3.0";

export const seedDeal = {
  schema: "threadline.deal-state.v3",
  id: "asteros-series-a",
  company: "AsterOS",
  stage: "Evaluation",
  round: "Series A",
  owner: "SK",
  baseRevision: 17,
  baseCommittedAt: "2026-08-08T17:30:00Z",
  claims: [
    { id: "c-retention", category: "Traction", statement: "Production customers retain and expand after deployment.", materiality: "required", acceptedValue: { metric: "NRR", value: 118, unit: "%", period: "May 2026 cohort" }, status: "accepted", sourceIds: ["s-cohort", "s-call"] },
    { id: "c-pipeline", category: "Traction", statement: "Qualified pipeline supports the next 18 months of growth.", materiality: "required", acceptedValue: { metric: "Qualified pipeline", value: 4.2, unit: "€m", period: "30 Jul 2026" }, status: "accepted-with-caveat", sourceIds: ["s-deck"], openQuestion: "Reconcile the definition of qualified with current CRM stages." },
    { id: "c-market", category: "Market", statement: "The regulated mid-market wedge can support venture-scale outcomes.", materiality: "required", acceptedValue: { metric: "Reachable ARR", value: 310, unit: "€m", period: "bottom-up model" }, status: "unresolved", sourceIds: ["s-market-model", "s-market-report", "s-expert"], openQuestion: "Prove the second expansion wedge without assuming a new product motion." },
    { id: "c-team", category: "Team", statement: "The founders have a credible right to win in compliance infrastructure.", materiality: "optional", acceptedValue: null, status: "supported", sourceIds: ["s-references", "s-founder-history"] },
    { id: "c-margin", category: "Economics", statement: "Gross margin can reach infrastructure-software benchmarks at scale.", materiality: "required", acceptedValue: { metric: "Gross margin", value: 61, unit: "%", period: "Q2 2026" }, status: "unresolved", sourceIds: ["s-financial-model", "s-deck"], openQuestion: "Separate inference, implementation and support costs by customer cohort." }
  ],
  sources: [
    { id: "s-cohort", type: "CSV", origin: "company-provided", custodian: "AsterOS Finance", method: "production cohort export", title: "May production cohort export", locator: "cohorts_may.csv · rows 2–16", observedAt: "2026-08-12", excerpt: "14 production customers · starting ARR €812k · current ARR €958k" },
    { id: "s-deck", type: "DECK", origin: "company-authored", custodian: "AsterOS", method: "fundraising deck", title: "Series A deck", locator: "pages 18–20", observedAt: "2026-07-30", excerpt: "131% NRR · €4.2m qualified pipeline · 78% target gross margin" },
    { id: "s-call", type: "NOTE", origin: "investor-observed", custodian: "Investment team", method: "commercial diligence notes", title: "Commercial diligence call", locator: "08 Aug · 23:14", observedAt: "2026-08-08", excerpt: "Two pilots were included before conversion; exclude them from production NRR." },
    { id: "s-crm", type: "CRM", origin: "company-system", custodian: "AsterOS Sales", method: "opportunity export", title: "Affinity opportunity export", locator: "pipeline_1108.csv", observedAt: "2026-08-11", excerpt: "€1.8m sales-accepted · €2.4m discovery and unqualified" },
    { id: "s-founder-call", type: "CALL", origin: "company-statement", custodian: "AsterOS CEO", method: "recorded follow-up", title: "Founder follow-up", locator: "11 Aug · 31:06", observedAt: "2026-08-11", excerpt: "Qualified in the deck meant any account with a completed discovery call." },
    { id: "s-market-model", type: "SHEET", origin: "investor-analysis", custodian: "Investment team", method: "bottom-up account model", title: "Bottom-up account model", locator: "market_model.xlsx", observedAt: "2026-08-10", excerpt: "1,240 reachable accounts × €250k mature ACV = €310m reachable ARR" },
    { id: "s-market-report", type: "PDF", origin: "third-party", custodian: "Dealroom", method: "market report", title: "Governance automation outlook", locator: "page 31", observedAt: "2026-08-06", excerpt: "€8.7bn global market estimate by 2030." },
    { id: "s-expert", type: "CALL", origin: "third-party", custodian: "Former buyer", method: "expert interview", title: "Sector expert interview", locator: "09 Aug · 18:40", observedAt: "2026-08-09", excerpt: "Expansion outside financial services probably requires a second product motion." },
    { id: "s-references", type: "REF", origin: "third-party", custodian: "Investment team", method: "six buyer interviews", title: "Buyer reference synthesis", locator: "reference synthesis", observedAt: "2026-08-08", excerpt: "High trust, rapid security navigation and strong domain fluency were consistent." },
    { id: "s-founder-history", type: "PROFILE", origin: "third-party", custodian: "Harmonic", method: "employment history", title: "Founder histories", locator: "Harmonic profiles", observedAt: "2026-08-07", excerpt: "Two prior regulated deployments across Tier 1 financial institutions." },
    { id: "s-financial-model", type: "SHEET", origin: "company-authored", custodian: "AsterOS CFO", method: "operating model", title: "Operating model v7", locator: "P&L tab", observedAt: "2026-08-09", excerpt: "Current gross margin 61%; FY2027 target 78% after inference optimization." }
  ],
  decisions: [
    { id: "d-screen", revision: 16, at: "2026-07-31T15:00:00Z", actor: "SK", decision: "Proceed to first call", rationale: "Strong team and credible problem; traction remains company-provided." },
    { id: "d-eval", revision: 17, at: "2026-08-08T17:30:00Z", actor: "BD", decision: "Continue commercial diligence", rationale: "Retention survives initial verification; market and margin remain open." }
  ],
  artifacts: [
    { id: "a-commercial-pack", title: "Commercial Diligence context", kind: "context-pack", task: "commercial", state: "fresh", revision: 17, dependencies: [{ claimId: "c-pipeline", revision: 17 }, { claimId: "c-retention", revision: 17 }, { claimId: "c-margin", revision: 17 }] },
    { id: "a-ic-snapshot", title: "IC financial snapshot", kind: "output", task: "ic", state: "fresh", revision: 17, dependencies: [{ claimId: "c-pipeline", revision: 17 }, { claimId: "c-margin", revision: 17 }] }
  ],
  events: [
    { id: "e-seed-17", type: "revision_committed", at: "2026-08-08T17:30:00Z", actor: "BD", revision: 17, payload: { initial: true } },
    { id: "e-output-204", externalId: "alludium-task-output-204", type: "task_output_ingested", at: "2026-08-12T10:35:00Z", actor: "First Look Analyst", payload: { task: "Investment Fit Screen", outputId: "output-204" } },
    { id: "e-proposal-pipeline", type: "change_proposed", at: "2026-08-12T10:36:00Z", actor: "Deal State Curator", proposalId: "p-pipeline", baseRevision: 17, payload: { claimId: "c-pipeline", from: { metric: "Qualified pipeline", value: 4.2, unit: "€m", period: "30 Jul 2026" }, to: { metric: "Sales-accepted pipeline", value: 1.8, unit: "€m", period: "11 Aug 2026" }, status: "contradicted", reason: "The deck and CRM use incompatible definitions of qualified.", sourceIds: ["s-crm", "s-founder-call", "s-deck"] } }
  ]
};

export const deepClone = value => JSON.parse(JSON.stringify(value));

export function formatValue(value) {
  if (!value) return "—";
  const amount = Number(value.value).toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (value.unit === "%") return `${amount}%`;
  if (value.unit === "€m") return `€${amount}m`;
  if (value.unit === "€bn") return `€${amount}bn`;
  return value.unit?.startsWith("€") ? `${value.unit}${amount}` : `${amount} ${value.unit || ""}`.trim();
}

function eventId(prefix, deal, at) {
  return `${prefix}-${deal.events.length + 1}-${String(at).replace(/\D/g, "").slice(-10)}`;
}

export function getAcceptedState(deal, targetRevision = Infinity) {
  const claims = Object.fromEntries(deal.claims.map(claim => [claim.id, deepClone(claim)]));
  let revision = deal.baseRevision;
  let committedAt = deal.baseCommittedAt;
  for (const event of deal.events) {
    if (event.type !== "revision_committed" || event.payload?.initial || event.revision > targetRevision) continue;
    const claim = claims[event.payload.claimId];
    if (claim) {
      claim.acceptedValue = deepClone(event.payload.value);
      claim.status = event.payload.status;
      claim.sourceIds = [...event.payload.sourceIds];
      claim.acceptedAt = event.at;
      claim.acceptedBy = event.actor;
      claim.revision = event.revision;
    }
    revision = Math.max(revision, event.revision);
    committedAt = event.at;
  }
  return { revision: Math.min(revision, targetRevision), committedAt, claims: Object.values(claims) };
}

export function getCandidateChanges(deal) {
  return deal.events.filter(event => event.type === "change_proposed").map(proposal => {
    const review = deal.events.find(event => ["change_approved", "change_rejected"].includes(event.type) && event.proposalId === proposal.proposalId);
    return { ...deepClone(proposal), state: review ? review.type.replace("change_", "") : "pending", reviewedBy: review?.actor, reviewedAt: review?.at };
  });
}

export function getArtifacts(deal) {
  const artifacts = deepClone(deal.artifacts);
  for (const event of deal.events.filter(event => event.type === "artifact_invalidated")) {
    const artifact = artifacts.find(item => item.id === event.payload.artifactId);
    if (artifact) Object.assign(artifact, { state: "stale", staleAt: event.at, staleReason: event.payload.reason, invalidatedByRevision: event.payload.revision });
  }
  for (const event of deal.events.filter(event => event.type === "pack_compiled")) {
    const existing = artifacts.find(item => item.id === event.payload.artifact.id);
    if (existing) {
      Object.assign(existing, deepClone(event.payload.artifact));
      if (existing.state === "fresh") {
        delete existing.staleAt;
        delete existing.staleReason;
        delete existing.invalidatedByRevision;
      }
    }
    else artifacts.push(deepClone(event.payload.artifact));
  }
  return artifacts;
}

export function approveChange(deal, proposalId, actor = "SK", at = "2026-08-12T10:45:00Z") {
  const next = deepClone(deal);
  const proposal = getCandidateChanges(next).find(item => item.proposalId === proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  if (proposal.state !== "pending") throw new Error(`Proposal ${proposalId} already reviewed`);
  const accepted = getAcceptedState(next);
  if (proposal.baseRevision !== accepted.revision) throw new Error("Proposal base revision is stale");
  const revision = accepted.revision + 1;
  next.events.push({ id: eventId("review", next, at), type: "change_approved", at, actor, proposalId, payload: { baseRevision: accepted.revision } });
  next.events.push({ id: eventId("revision", next, at), type: "revision_committed", at, actor, revision, proposalId, payload: { claimId: proposal.payload.claimId, value: deepClone(proposal.payload.to), status: proposal.payload.status, sourceIds: [...proposal.payload.sourceIds] } });
  for (const artifact of getArtifacts(next).filter(item => item.state === "fresh" && item.dependencies.some(dep => dep.claimId === proposal.payload.claimId && dep.revision < revision))) {
    next.events.push({ id: eventId("invalidate", next, `${at}-${artifact.id}`), type: "artifact_invalidated", at, actor: "Threadline", payload: { artifactId: artifact.id, claimId: proposal.payload.claimId, revision, reason: `${artifact.title} depends on ${proposal.payload.claimId} at revision ${artifact.revision}; accepted state is now revision ${revision}.` } });
  }
  return { deal: next, revision, invalidated: getArtifacts(next).filter(item => item.invalidatedByRevision === revision) };
}

export function rejectChange(deal, proposalId, actor = "SK", at = "2026-08-12T10:45:00Z") {
  const next = deepClone(deal);
  const proposal = getCandidateChanges(next).find(item => item.proposalId === proposalId);
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  if (proposal.state !== "pending") throw new Error(`Proposal ${proposalId} already reviewed`);
  next.events.push({ id: eventId("review", next, at), type: "change_rejected", at, actor, proposalId, payload: { baseRevision: getAcceptedState(next).revision } });
  return next;
}

const taskPolicies = {
  ic: { label: "Investment committee", required: ["c-retention", "c-pipeline", "c-market", "c-margin"], optional: ["c-team"] },
  commercial: { label: "Commercial diligence", required: ["c-retention", "c-pipeline", "c-margin"], optional: ["c-market", "c-team"] },
  partner: { label: "Partner review", required: ["c-retention", "c-pipeline", "c-market"], optional: ["c-team", "c-margin"] },
  portfolio: { label: "Portfolio support", required: ["c-retention", "c-margin"], optional: ["c-pipeline", "c-market", "c-team"] }
};

function claimTokens(claim) { return 170 + claim.sourceIds.length * 105; }

export function compileContextPack(deal, { task = "ic", budget = 3200, permissions = ["project:read", "sources:excerpt"] } = {}) {
  const policy = taskPolicies[task] || taskPolicies.ic;
  const state = getAcceptedState(deal);
  const byId = Object.fromEntries(state.claims.map(claim => [claim.id, claim]));
  const baseTokens = 280;
  const requiredClaims = policy.required.map(id => byId[id]).filter(Boolean);
  const minimumRequiredTokens = baseTokens + requiredClaims.reduce((sum, claim) => sum + claimTokens(claim), 0);
  if (budget < minimumRequiredTokens) {
    return { status: "blocked", task, policyVersion: POLICY_VERSION, revision: state.revision, budget, tokens: 0, minimumRequiredTokens, included: [], sources: [], exclusions: policy.required.map(claimId => ({ claimId, reason: "required_claim_does_not_fit" })), permissions: [...permissions], asOf: state.committedAt };
  }
  const included = requiredClaims.map(claim => ({ claim, required: true, tokens: claimTokens(claim) }));
  let tokens = minimumRequiredTokens;
  const exclusions = [];
  for (const id of policy.optional) {
    const claim = byId[id];
    if (!claim) continue;
    const cost = claimTokens(claim);
    if (tokens + cost <= budget) { included.push({ claim, required: false, tokens: cost }); tokens += cost; }
    else exclusions.push({ claimId: id, reason: "optional_claim_exceeds_budget" });
  }
  const sourceIds = new Set(included.flatMap(item => item.claim.sourceIds));
  return { status: "ready", task, policyVersion: POLICY_VERSION, revision: state.revision, budget, tokens, minimumRequiredTokens, included, sources: deal.sources.filter(source => sourceIds.has(source.id)), exclusions, permissions: [...permissions].sort(), asOf: state.committedAt };
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

export function exportReceipt(deal, pack) {
  if (pack.status !== "ready") throw new Error("Blocked context cannot be sealed");
  const body = {
    schema: "threadline.context-receipt.v2",
    dealId: deal.id,
    task: pack.task,
    revision: pack.revision,
    policyVersion: pack.policyVersion,
    permissionScope: pack.permissions,
    budget: pack.budget,
    tokensUsed: pack.tokens,
    asOf: pack.asOf,
    claims: pack.included.map(item => ({ id: item.claim.id, required: item.required, value: item.claim.acceptedValue, status: item.claim.status, sourceIds: item.claim.sourceIds })),
    sourceExcerptIds: pack.sources.map(source => source.id).sort(),
    exclusions: pack.exclusions
  };
  return { ...body, hash: `tl_${fnv1a(stableStringify(body))}` };
}

export function sealPack(deal, pack, artifactId = `pack-${pack.task}`) {
  const receipt = exportReceipt(deal, pack);
  const next = deepClone(deal);
  const state = getAcceptedState(next);
  const previous = getArtifacts(next).find(artifact => artifact.id === artifactId);
  next.events.push({ id: eventId("pack", next, state.committedAt), type: "pack_compiled", at: state.committedAt, actor: "Context Compiler", payload: { receipt, artifact: { id: artifactId, title: previous?.title || `${taskPolicies[pack.task]?.label || pack.task} context`, kind: previous?.kind || "context-pack", task: pack.task, state: "fresh", revision: pack.revision, receiptHash: receipt.hash, dependencies: pack.included.map(item => ({ claimId: item.claim.id, revision: pack.revision })) } } });
  return { deal: next, receipt };
}

export function snapshotRevision(deal, revision) {
  const state = getAcceptedState(deal, revision);
  return { ...state, decisions: deal.decisions.filter(decision => decision.revision <= revision), events: deal.events.filter(event => !event.revision || event.revision <= revision) };
}

export function ingestTaskOutput(deal, payload) {
  if (!payload?.externalId) throw new Error("externalId is required");
  if (deal.events.some(event => event.externalId === payload.externalId)) return { deal: deepClone(deal), created: false };
  const next = deepClone(deal);
  next.events.push({ id: eventId("output", next, payload.at), externalId: payload.externalId, type: "task_output_ingested", at: payload.at, actor: payload.actor || "Alludium task", payload: deepClone(payload.output) });
  if (payload.candidate) next.events.push({ id: eventId("proposal", next, payload.at), type: "change_proposed", at: payload.at, actor: payload.actor || "Deal State Curator", proposalId: payload.candidate.proposalId, baseRevision: getAcceptedState(next).revision, payload: deepClone(payload.candidate.payload) });
  return { deal: next, created: true };
}
