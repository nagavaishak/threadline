import {
  seedPipeline, reversalEmail, deepClone, formatValue, formatDate, quarterOf, getAcceptedState,
  getCandidateChanges, getArtifacts, approveChange, rejectChange, compileContextPack, rebuildOutput,
  diffLines, snapshotRevision, fieldHistory, ingestTaskOutput, outputPolicies, isValidDeal
} from "./core.js";
import { createStore } from "./store.js";

const STORAGE_KEY = "threadline-v5";
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const toastRoot = document.querySelector("#toastRoot");

const icons = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5m5-5-5 5 5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 8 4-8 4-8-4 8-4Zm8 9-8 4-8-4m16 5-8 4-8-4"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 8"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>'
};
const icon = name => `<span class="icon">${icons[name]}</span>`;
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const blockedStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
const store = createStore({
  storage: (() => { try { return window.localStorage; } catch { return blockedStorage; } })(),
  key: STORAGE_KEY, schema: "threadline-store.v1", seed: seedPipeline, isValid: deal => isValidDeal(deal) && canRender(deal), legacyKeys: ["threadline-v4"],
  lock: run => (navigator.locks ? navigator.locks.request("threadline-save", run) : run())
});

let ui = {
  deal: deepClone(seedPipeline), page: "overview", view: "review",
  modal: false, artifactId: null, budget: 2600, saving: false, revision: seedPipeline.baseRevision
};

// Only the renderer knows for sure whether a saved log can be shown, so render every view of it offscreen.
function canRender(deal) {
  const current = ui;
  try {
    const revision = getAcceptedState(deal).revision;
    for (const view of ["review", "artifacts", "revisions"]) {
      for (const atRevision of [seedPipeline.baseRevision, revision]) {
        ui = { ...current, deal, page: "demo", view, revision: atRevision, modal: false };
        renderHeader(); renderWorkspace();
      }
    }
    ui = { ...current, deal, page: "overview" };
    renderOverview();
    for (const output of getArtifacts(deal).filter(item => item.state === "stale")) {
      ui = { ...current, deal, artifactId: output.id };
      renderCompiler();
    }
    return true;
  } catch {
    return false;
  } finally {
    ui = current;
  }
}

const accepted = () => getAcceptedState(ui.deal);
const proposals = () => getCandidateChanges(ui.deal);
const artifacts = () => getArtifacts(ui.deal);
const field = (id, state = accepted()) => state.fields.find(item => item.id === id);
const fieldName = id => { const f = ui.deal.fields.find(item => item.id === id); return f ? `${f.record} ${f.label.toLowerCase()}` : id; };
const source = id => ui.deal.sources.find(item => item.id === id);
const hasProgress = () => ui.deal.events.length > seedPipeline.events.length;
const currentProposal = () => proposals().find(item => item.state === "pending") || proposals().at(-1);
const scrollTop = () => requestAnimationFrame(() => window.scrollTo({top: 0, behavior: "instant"}));

const initial = store.load();
ui.deal = initial.deal;
ui.revision = getAcceptedState(ui.deal).revision;

function adopt(deal) {
  ui.deal = deal;
  ui.revision = Math.min(ui.revision, accepted().revision);
  if (ui.modal && artifacts().find(item => item.id === ui.artifactId)?.state !== "stale") ui.modal = false;
}

// Apply an engine result, then save it. If another tab saved first, its state is shown and this action
// is dropped. Engine refusals (already reviewed, not stale) surface as a toast and change nothing.
async function commit(compute, message) {
  let next;
  try { next = compute(); }
  catch (error) { render(); notify(error.message); return; }
  ui.deal = next;
  ui.saving = true;
  render();
  let result;
  try { result = await store.save(next); }
  catch { result = { status: "unsaved" }; }
  finally { ui.saving = false; }
  if (result.status === "conflict") {
    adopt(result.deal);
    render();
    notify(`${ADOPTED[result.reason]} Your last action was not applied.`);
    return;
  }
  render();
  const text = typeof message === "function" ? message() : message;
  if (result.status === "saved") notify(text, true);
  else notify(`${text} It couldn't be saved in this browser, so it may be lost if you reload.`);
}

const ADOPTED = {
  "other-tab": "Another tab changed this walkthrough, so its latest state is shown.",
  recovered: "Saved progress can be read again, so it is shown now."
};

// While a save is in flight it does its own conflict check, so don't move the seen version under it.
function syncFromOtherTabs() {
  if (ui.saving) return;
  const update = store.refresh();
  if (!update) return;
  adopt(update.deal);
  render();
  notify(ADOPTED[update.reason]);
}

function notify(message, success = false) {
  const node = document.createElement("div");
  node.className = `toast ${success ? "success" : ""}`;
  node.innerHTML = `${icon(success ? "check" : "spark")}<p>${esc(message)}</p>`;
  toastRoot.append(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => { node.classList.remove("show"); setTimeout(() => node.remove(), 220); }, 4200);
}

const reversalIngested = () => ui.deal.events.some(event => event.externalId === reversalEmail.externalId);

function journeyState() {
  const all = proposals();
  const first = all[0];
  const stale = artifacts().filter(item => item.state === "stale").length;
  if (first.state === "pending") return { step: 1, label: "Review the change" };
  if (first.state === "rejected") return { step: 1, label: "Change rejected", rejected: true };
  const second = all[1];
  if (!second) return stale ? { step: 2, label: "Regenerate stale outputs" } : { step: 3, label: "Wait for the buyer" };
  if (second.state === "pending" || stale) return { step: 3, label: "Handle the reversal" };
  return { step: 4, label: "Check the history", reversalRejected: second.state === "rejected" };
}

// If anything can't be shown, offer the one action that always works: restart, which also repairs storage.
function render() {
  try {
    app.innerHTML = `<div class="tl-shell">
      ${renderHeader()}
      ${ui.page === "overview" ? renderOverview() : renderWorkspace()}
    </div>`;
    modalRoot.innerHTML = ui.modal ? renderCompiler() : "";
  } catch {
    modalRoot.innerHTML = "";
    app.innerHTML = `<div class="tl-shell"><main class="recovery-page"><span class="kicker">SOMETHING WENT WRONG</span><h1>This walkthrough can't be shown.</h1><p>The saved progress is in a state this version can't display. Restarting clears it and starts again at revision 17.</p><button class="cta-primary" data-action="restart">Restart the walkthrough ${icon("reset")}</button></main></div>`;
  }
}

function renderHeader() {
  return `<header class="tl-header">
    <button class="tl-brand" data-page="overview" aria-label="Threadline overview"><span class="brand-glyph"><i></i><i></i><i></i></span><strong>Threadline</strong></button>
    <span class="header-thesis">Field-level change tracking for AI-written CRM work</span>
    <nav aria-label="Primary navigation">
      <button data-page="overview" class="${ui.page === "overview" ? "active" : ""}">Why it exists</button>
      <button data-action="start" class="${ui.page === "demo" ? "active" : ""}">Live walkthrough</button>
    </nav>
    <span class="concept-chip">INDEPENDENT PROTOTYPE</span>
  </header>`;
}

function renderOverview() {
  const resume = hasProgress();
  return `<main class="overview-page">
    <section class="hero-grid">
      <div class="hero-copy">
        <span class="kicker">WHEN A REVIEWED FIELD CHANGES</span>
        <h1>The close date moved.<br><em>What did we already build on it?</em></h1>
        <p>Threadline records which CRM fields every AI-written output read. When a reviewed change lands, only the outputs that used the old value go stale, and each one regenerates with a visible diff.</p>
        <div class="hero-actions">
          <button class="cta-primary" data-action="start">${resume ? "Continue the walkthrough" : "Start the 3-minute walkthrough"} ${icon("arrow")}</button>
          ${resume ? `<button class="btn secondary" data-action="restart">Restart from the beginning</button>` : `<span>No setup · fictional pipeline</span>`}
        </div>
      </div>
      <div class="product-map" aria-label="Where Threadline sits">
        <div class="map-label">WHERE IT SITS</div>
        <div class="map-node muted"><span>01</span><div><strong>An agent proposes a change</strong><small>From a call or email, with the quote attached</small></div></div>
        <div class="map-connector"><i></i><span>evidence + hedge</span></div>
        <div class="map-node focus"><span>02</span><div><strong>A person approves it</strong><small>Threadline commits a new revision</small></div></div>
        <div class="map-connector"><i></i><span>recorded reads</span></div>
        <div class="map-node muted"><span>03</span><div><strong>Dependent outputs rebuild</strong><small>Only the ones that read that field</small></div></div>
      </div>
    </section>

    <section class="walkthrough-preview">
      <div class="section-heading"><span>THE DEMO</span><h2>One hedged sentence. Three outputs. One reversal.</h2><p>Follow a renewal that slips, then comes back, and see exactly where the change travelled.</p></div>
      <div class="story-steps">
        <article><span>01</span><div class="story-icon red">${icon("spark")}</div><h3>Review a hedged change</h3><p>The buyer said “probably Q4.” The agent proposes 15 Dec and keeps the hedge in view.</p><strong>30 Sep <i>→</i> 15 Dec</strong></article>
        <article><span>02</span><div class="story-icon amber">${icon("layers")}</div><h3>See what relied on it</h3><p>Approval marks the Q3 forecast and a drafted email stale. The unrelated account brief stays current.</p><strong>2 of 3 outputs affected</strong></article>
        <article><span>03</span><div class="story-icon green">${icon("check")}</div><h3>Regenerate, then reverse</h3><p>Rebuild each stale output with a before/after diff. When the buyer reverses, both moves stay in history.</p><strong>Moved twice, still visible</strong></article>
      </div>
    </section>

    <section class="thesis-band">
      <div><span>THE IDEA</span><h2>A record that keeps only the latest value throws away the signal.</h2></div>
      <div class="thesis-points"><p><b>Reads are recorded</b> Every output lists the fields and revisions it used.</p><p><b>Invalidation is selective</b> Work that never read the field stays current.</p><p><b>History survives reversals</b> Two moves in two weeks are shown as two moves.</p></div>
    </section>
  </main>`;
}

function renderWorkspace() {
  const state = accepted();
  const journey = journeyState();
  const staleCount = artifacts().filter(a => a.state === "stale").length;
  return `<main class="demo-page">
    <section class="demo-topline">
      <button class="back-link" data-page="overview">${icon("back")} Product overview</button>
      <div class="scenario-title"><span>GUIDED SCENARIO</span><strong>Q3 pipeline · Mid-market team</strong><em>Fictional data</em></div>
      <div class="journey-progress" aria-label="Walkthrough progress">
        ${[1,2,3,4].map(step => `<span class="${journey.step >= step ? "complete" : ""} ${journey.step === step ? "current" : ""}"><i>${journey.step > step ? icon("check") : step}</i>${["Review", "Regenerate", "Reversal", "History"][step-1]}</span>`).join("")}
      </div>
      <button class="icon-button" data-action="reset" aria-label="Restart walkthrough" title="Restart walkthrough">${icon("reset")}</button>
    </section>
    <section class="demo-layout">
      <div class="demo-main">
        <nav class="demo-tabs" aria-label="Scenario views">
          <button data-view="review" class="${ui.view === "review" ? "active" : ""}">1. Field change</button>
          <button data-view="artifacts" class="${ui.view === "artifacts" ? "active" : ""}">2. Dependent outputs ${staleCount ? `<b>${staleCount}</b>` : ""}</button>
          <button data-view="revisions" class="${ui.view === "revisions" ? "active" : ""}">Field history</button>
        </nav>
        <div class="demo-content">${renderActiveView(state, journey)}</div>
      </div>
      ${renderGuideRail(journey, state)}
    </section>
  </main>`;
}

function renderActiveView(state, journey) {
  if (ui.view === "artifacts") return renderArtifacts(state, journey);
  if (ui.view === "revisions") return renderRevisions();
  if (journey.step === 3 && !reversalIngested()) return renderReversalPrompt();
  return renderReview(state);
}

function renderReversalPrompt() {
  const email = reversalEmail.sources[0];
  return `<div class="guided-view">
    <header class="view-intro"><span class="step-tag">STEP 3 · TWO WEEKS LATER</span><h1>The buyer changes direction.</h1><p>A naive system would overwrite the close date and the slip would vanish from the record. Let the inbox agent read the email and propose a change the same way.</p></header>
    <section class="change-card reversal-card">
      <div class="change-head"><div><span>NEW EMAIL</span><h2>The buyer writes back</h2></div><small>Not yet read by any agent</small></div>
      <div class="evidence-block"><div class="evidence-list single">${sourceCard(email)}</div></div>
      <footer class="decision-bar"><div><span>NEXT</span><p>Ingestion is idempotent: the same email can't create a second proposal.</p></div><button class="btn primary" data-action="ingest">${icon("mail")} Let the inbox agent read it</button></footer>
    </section>
  </div>`;
}

function renderReview(state) {
  const proposal = currentProposal();
  const f = field(proposal.payload.fieldId, state);
  const committed = proposal.state === "approved";
  const rejected = proposal.state === "rejected";
  const outputs = artifacts();
  const readers = outputs.filter(a => a.used.some(read => read.fieldId === f.id));
  const others = outputs.filter(a => !readers.includes(a));
  const { from, to } = proposal.payload;
  const reversal = proposal.proposalId === reversalEmail.candidate.proposalId;
  const intro = reversal
    ? rejected
      ? { tag: "STEP 3 · THE REVERSAL", title: "The reversal was rejected.", body: `The close date stays at ${formatValue(from)}. The rejection is recorded in Field history next to the earlier approval.` }
      : { tag: "STEP 3 · THE REVERSAL", title: "The buyer wants to move the date again.", body: "Approving keeps both moves in the field's history, so the forecast can say the deal is moving, not just where it is today." }
    : { tag: "STEP 1 · HUMAN COMMIT BOUNDARY", title: "An agent wants to change a forecast field.", body: "Close date is a judgment field: no transcript contains it. Read what the buyer actually said, see which outputs depend on it, then decide." };
  const hedgeEffect = rejected ? "This value was rejected, so no output uses it." : committed ? "The hedge travels with the value into every output that reads it." : "If approved, the hedge travels with the value into every output that reads it.";
  return `<div class="guided-view">
    <header class="view-intro"><span class="step-tag">${intro.tag}</span><h1>${intro.title}</h1><p>${intro.body}</p></header>
    <div class="task-arrival">${icon("spark")}<div><strong>${esc(proposal.actor)} proposed a change</strong><p>${proposal.state === "pending" ? "Nothing accepted has changed yet." : `Reviewed by ${esc(proposal.reviewedBy)}.`}</p></div><span>${proposal.state === "pending" ? "REVIEW REQUIRED" : proposal.state.toUpperCase()}</span></div>
    <section class="change-card">
      <div class="change-head"><div><span>${committed ? "ACCEPTED CHANGE" : rejected ? "REJECTED CHANGE" : "PROPOSED CHANGE"} · ${esc(f.kind.toUpperCase())} FIELD</span><h2>${esc(f.record)} · ${esc(f.label)}</h2></div><small>Based on accepted revision ${proposal.baseRevision}</small></div>
      <div class="value-change">
        <div><span>${committed ? "PREVIOUS VALUE" : "CURRENT ACCEPTED VALUE"}</span><strong>${esc(formatValue(from))}</strong><small>${from?.type === "date" ? esc(quarterOf(from.date)) : ""}</small></div>
        <i>${icon("arrow")}</i>
        <div class="new-value"><span>${committed ? "NEW ACCEPTED VALUE" : "AI-PROPOSED VALUE"}</span><strong>${esc(formatValue(to))}</strong><small>${to.type === "date" ? `${esc(quarterOf(to.date))} · ` : ""}agent's reading</small></div>
      </div>
      ${to.hedge ? `<div class="plain-explanation"><span>WHAT THE BUYER ACTUALLY SAID</span><p><b>“${esc(to.hedge.quote)}”</b> ${esc(to.hedge.note)} ${hedgeEffect}</p></div>` : ""}
      <div class="evidence-block"><div class="block-title"><span>EVIDENCE</span><small>Exact excerpt · not an AI summary</small></div><div class="evidence-list single">${proposal.payload.sourceIds.map(id => sourceCard(source(id))).join("")}</div></div>
      <div class="impact-preview"><div><span>${proposal.state === "pending" ? "WHAT APPROVAL WILL DO" : "WHAT THIS CHANGE TOUCHES"}</span><strong>${proposal.state === "pending" ? `Create revision ${state.revision + 1}. ${plural(readers.length, "output")} read this field and will go stale; ${others.length} won't.` : rejected ? `Rejected, so no output went stale. ${plural(readers.length, "output")} still read the accepted value.` : `${plural(readers.length, "output")} read this field; ${others.length} ${others.length === 1 ? "doesn't" : "don't"}.`}</strong></div>${readers.map(a => `<span>${icon("file")} ${esc(a.title)}</span>`).join("")}${others.map(a => `<span class="unaffected">${icon("check")} ${esc(a.title)}</span>`).join("")}</div>
      ${renderReviewAction(proposal, state)}
    </section>
  </div>`;
}

function sourceCard(item) {
  return `<article><span>${esc(item.type)}</span><div><strong>${esc(item.title)}</strong><blockquote>“${esc(item.excerpt)}”</blockquote><small>${esc(item.custodian)} · ${esc(item.locator)}</small></div></article>`;
}

function renderReviewAction(proposal, state) {
  if (proposal.state === "pending") return `<footer class="decision-bar"><div><span>YOUR DECISION</span><p>Approval is attributed and recorded. Rejection keeps the current value and is recorded too.</p></div><button class="btn ghost-danger" data-action="reject" data-id="${proposal.proposalId}">Reject</button><button class="btn primary" data-action="approve" data-id="${proposal.proposalId}">${icon("check")} Approve change</button></footer>`;
  if (proposal.state === "rejected" && proposal.proposalId === reversalEmail.candidate.proposalId) return `<footer class="result-bar rejected">${icon("x")}<div><strong>Reversal rejected. Accepted state remains revision ${state.revision}.</strong><p>Both reviews, the approval and this rejection, are in Field history.</p></div><button class="btn secondary" data-view="revisions">Open Field history</button></footer>`;
  if (proposal.state === "rejected") return `<footer class="result-bar rejected">${icon("x")}<div><strong>Change rejected. Accepted state remains revision ${state.revision}.</strong><p>The rejection is in Field history. Restart to try the approval path.</p></div><button class="btn secondary" data-action="restart">Restart walkthrough</button></footer>`;
  return `<footer class="result-bar approved">${icon("check")}<div><strong>Committed as revision ${proposal.committedRevision}.</strong><p>Dependent outputs were marked stale, not silently rewritten.</p></div><button class="btn primary" data-view="artifacts">See dependent outputs ${icon("arrow")}</button></footer>`;
}

function renderArtifacts(state, journey) {
  const list = artifacts();
  const stale = list.filter(a => a.state === "stale");
  const risky = list.filter(a => a.atRisk);
  const banner = stale.length
    ? `<div class="warning-banner"><strong>${plural(stale.length, "output")} ${stale.length === 1 ? "needs" : "need"} regenerating</strong><span>Nothing was rewritten behind anyone's back.</span></div>`
    : risky.length
      ? `<div class="warning-banner"><strong>${plural(risky.length, "output")} at risk</strong><span>A change to a field they read is waiting for review.</span></div>`
      : `<div class="completion-banner">${icon("check")}<div><strong>Every output matches accepted revision ${state.revision}.</strong><p>Each one records the fields it read and carries a receipt hash.</p></div>${journey.step === 3 ? `<button class="btn secondary" data-view="review">Next: two weeks later</button>` : `<button class="btn secondary" data-view="revisions">Check the history</button>`}</div>`;
  return `<div class="guided-view">
    <header class="view-intro"><span class="step-tag">DEPENDENT OUTPUTS</span><h1>${stale.length ? "The field changed. Some work didn't." : "Outputs and accepted state agree."}</h1><p>Each card shows what the output says, which fields it read, and at which revision. Only outputs that read the changed field go stale.</p></header>
    ${banner}
    <div class="artifact-grid">${list.map(a => artifactCard(a, state)).join("")}</div>
  </div>`;
}

function artifactCard(a, state) {
  const status = a.state === "stale" ? "NEEDS REBUILD" : a.atRisk ? "AT RISK" : "CURRENT";
  const diff = a.previous && a.state === "fresh" ? diffLines(a.previous.content, a.content) : null;
  return `<article class="artifact-card ${a.state} ${a.atRisk ? "at-risk" : ""}">
    <header><div class="artifact-icon">${icon("file")}</div><span>${status}</span></header>
    <h2>${esc(a.title)}</h2><p>Built from revision ${a.revision} by the ${esc(outputPolicies[a.policy].label.toLowerCase())}.</p>
    ${diff ? `<div class="output-diff" aria-label="Changes since revision ${a.previous.revision}"><span>CHANGED SINCE REVISION ${a.previous.revision}</span>${diff.map(line => `<p class="${line.type}"><i>${line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}</i>${esc(line.text)}</p>`).join("")}</div>` : `<div class="output-content">${a.content.map(line => `<p>${esc(line)}</p>`).join("")}</div>`}
    <div class="dependency-row"><span>Read</span>${a.used.map(read => `<b class="${a.state === "stale" && read.revision < (field(read.fieldId)?.revision ?? 0) ? "changed" : ""}">${esc(fieldName(read.fieldId))} · ${esc(formatValue(read.value))} · R${read.revision}</b>`).join("")}</div>
    ${a.state === "stale" ? `<div class="stale-copy"><strong>Why it is stale</strong><p>${esc(a.staleReason)}</p></div><button class="btn primary wide" data-action="compile" data-artifact="${a.id}">Regenerate from revision ${state.revision} ${icon("arrow")}</button>`
      : a.atRisk ? `<div class="risk-copy"><strong>Change pending review</strong><p>An agent proposed a new ${esc(fieldName(a.atRisk.fieldId))}. This output still uses the accepted value until someone decides.</p></div>`
      : a.receiptHash ? `<button class="btn receipt wide" data-receipt="${a.receiptHash}">${icon("check")} Download receipt · ${esc(a.receiptHash)}</button>`
      : `<span class="current-note">${a.revision < state.revision ? `Still current at revision ${state.revision}: none of the fields it read changed.` : "Matches the accepted revision."}</span>`}
  </article>`;
}

function renderRevisions() {
  const current = accepted().revision;
  const revision = Math.min(ui.revision, current);
  const snap = snapshotRevision(ui.deal, revision);
  const tracked = [...new Set(proposals().map(p => p.payload.fieldId))];
  const records = [...new Set(snap.fields.map(f => f.record))];
  return `<div class="guided-view history-view">
    <header class="view-intro"><span class="step-tag">FIELD HISTORY</span><h1>Every move stays on the record.</h1><p>Pick a revision to see what the pipeline said then, who decided each change, and what the buyer actually said.</p></header>
    <div class="revision-switch">${Array.from({length: current - 16}, (_, i) => 17 + i).map(r => `<button data-revision="${r}" class="${revision === r ? "active" : ""}">Revision ${r}</button>`).join("")}</div>
    <section class="revision-card"><header><div><span>ACCEPTED SNAPSHOT</span><h2>Revision ${snap.revision}</h2></div><time>${esc(new Date(snap.committedAt).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))}</time></header>
      ${tracked.map(id => renderTimeline(id, revision)).join("")}
      <div class="history-claims">${records.map(record => snap.fields.filter(f => f.record === record && f.kind === "judgment").map(f => `<span><small>${esc(record)} · ${esc(f.label)}</small><b>${esc(formatValue(f.value))}</b></span>`).join("")).join("")}</div>
      <div class="decision-list">${snap.reviews.length ? snap.reviews.map(review => `<article><span>${review.state === "approved" ? "APPROVED" : "REJECTED"} · ${esc(review.reviewedBy)} · ${esc(new Date(review.reviewedAt).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))}</span><strong>${esc(fieldName(review.payload.fieldId))}: ${esc(formatValue(review.payload.from))} → ${esc(formatValue(review.payload.to))}</strong><p>${esc(review.payload.reason)} ${review.state === "approved" ? `Committed as revision ${review.appliedRevision}.` : `Accepted state stayed at revision ${review.appliedRevision}.`}</p></article>`).join("") : `<article><span>NO REVIEWS YET</span><strong>Revision 17 is the rep-entered baseline.</strong><p>Approvals and rejections appear here at the revision they applied to.</p></article>`}</div>
    </section>
  </div>`;
}

function renderTimeline(fieldId, revision) {
  const history = fieldHistory(ui.deal, fieldId, revision);
  const moves = history.length - 1;
  return `<div class="history-hero"><span>${esc(fieldName(fieldId))} at this point</span><strong>${esc(formatValue(history.at(-1).value))}</strong><p>${moves >= 2 ? `Moved ${moves} times since ${esc(formatDate(history[1].observedAt))}. That pattern is the signal.` : moves === 1 ? "Moved once from the rep-entered value." : "Rep-entered value; no changes yet."}</p>
    <ol class="timeline">${history.map(entry => `<li><b>R${entry.revision}</b><span>${esc(formatValue(entry.value))}</span><small>${entry.observedAt ? `${esc(entry.actor)} approved · from ${esc(source(entry.sourceIds[0])?.type.toLowerCase())} on ${esc(formatDate(entry.observedAt))}${entry.value.hedge ? ` · hedged: “${esc(entry.value.hedge.quote)}”` : ""}` : `Entered by ${esc(entry.actor)} in the CRM`}</small></li>`).join("")}</ol></div>`;
}

function renderGuideRail(journey, state) {
  const copy = {
    1: journey.rejected
      ? { title: "Rejected, and recorded", body: "Accepted state is unchanged and no output went stale. The rejection is in Field history.", action: "Restart to walk through the approval path." }
      : { title: "Decide what becomes accepted", body: "The agent read a hedged sentence and proposed a date. The hedge stays attached to the value.", action: "Approve or reject the change in the main panel." },
    2: { title: "Regenerate what read it", body: "Only outputs that recorded a read of the changed field are stale. The account brief never read it.", action: "Open Dependent outputs and regenerate each stale one." },
    3: { title: "The buyer reverses", body: "Two weeks later the deal comes back. The second move must not erase the first.",
      action: !reversalIngested() ? "Let the inbox agent read the new email." : proposals()[1]?.state === "pending" ? "Review the reversal in the main panel." : "Open Dependent outputs and regenerate what read the close date." },
    4: journey.reversalRejected
      ? { title: "Reversal rejected, and recorded", body: "The close date stays at 15 Dec. Both decisions, the approval and the rejection, are in Field history.", action: "Open Field history to see both reviews." }
      : { title: "Both moves are visible", body: "The forecast now says the close date moved twice. The history shows each reading, its quote and its reviewer.", action: `Open Field history and step through revisions 17 to ${state.revision}.` }
  }[journey.step];
  return `<aside class="guide-rail"><div class="guide-sticky"><span class="eyebrow">WHAT YOU’RE SEEING</span><div class="guide-number">0${journey.step}</div><h2>${copy.title}</h2><p>${copy.body}</p><div class="next-action"><span>NEXT ACTION</span><strong>${copy.action}</strong></div><div class="state-facts"><span><small>Accepted state</small><b>Revision ${state.revision}</b></span><span><small>Stale outputs</small><b>${artifacts().filter(a => a.state === "stale").length}</b></span><span><small>Pending values in outputs</small><b>Never</b></span></div><p class="rail-note"><b>Why it matters</b> A wrong judgment field travels into forecasts and emails before anyone notices. Threadline shows exactly where it went.</p></div></aside>`;
}

function renderCompiler() {
  const target = artifacts().find(a => a.id === ui.artifactId);
  const pack = compileContextPack(ui.deal, { policy: target.policy, budget: ui.budget });
  const blocked = pack.status === "blocked";
  const rangeProgress = ((ui.budget - 900) / 3300) * 100;
  return `<div class="modal-backdrop"><section class="compiler-modal" role="dialog" aria-modal="true" aria-labelledby="compilerTitle" data-modal>
    <header><div><span class="eyebrow">REGENERATE FROM ACCEPTED STATE</span><h2 id="compilerTitle">${esc(target.title)}</h2><p>The generator reads only accepted fields. Every field it reads is recorded with its revision, which is how Threadline knows what to invalidate next time.</p></div><button class="icon-button" data-action="close" aria-label="Close">${icon("x")}</button></header>
    <div class="compiler-grid"><section class="compiler-controls"><div class="policy-fixed"><small>Generator</small><strong>${esc(outputPolicies[target.policy].label)}</strong><p>Fixed for this output, so a rebuild can't change what it depends on.</p></div><label class="budget-control"><span>Context budget <b data-budget-label>${ui.budget.toLocaleString()} tokens</b></span><input type="range" min="900" max="4200" step="100" value="${ui.budget}" style="--range-progress:${rangeProgress}%" data-input="budget" aria-label="Context token budget" aria-valuetext="${ui.budget.toLocaleString()} tokens"><small><i>900</i><i>4,200</i></small></label><div class="compiler-status ${pack.status}" data-compiler-status>${compilerStatusMarkup(pack)}</div></section><section class="compiler-preview" data-compiler-preview>${compilerPreviewMarkup(pack)}</section></div>
    <footer><div><span>AFTER REGENERATING</span><strong>The output records its reads and gets a receipt hash of exactly what it was given.</strong></div><button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" data-action="seal" ${blocked ? "disabled" : ""}>Regenerate ${icon("arrow")}</button></footer>
  </section></div>`;
}

function compilerStatusMarkup(pack) {
  const blocked = pack.status === "blocked";
  return `<strong>${blocked ? "BLOCKED: REQUIRED FIELDS DON'T FIT" : "READY TO REGENERATE"}</strong><p>${blocked ? `Required fields need at least ${pack.minimumRequiredTokens.toLocaleString()} tokens. Threadline won't silently drop them.` : `${pack.tokens.toLocaleString()} tokens · accepted revision ${pack.revision}`}</p>`;
}

function compilerPreviewMarkup(pack) {
  const rows = pack.status === "blocked" ? [] : pack.included;
  return `<div class="block-title"><span>WHAT THE GENERATOR WILL READ</span><small>${plural(rows.length, "field")}</small></div>${rows.map(i => `<article class="pack-row"><span>${i.required ? "REQUIRED" : "OPTIONAL"}</span><div><strong>${esc(i.field.record)} · ${esc(i.field.label)}</strong><small>${plural(i.field.sourceIds.length, "source excerpt")} attached${i.field.value.hedge ? " · hedged" : ""}</small></div><b>${esc(formatValue(i.field.value))}</b></article>`).join("")}${pack.exclusions.filter(x => x.reason.startsWith("optional")).map(x => `<article class="pack-row excluded"><span>LEFT OUT</span><div><strong>${esc(fieldName(x.fieldId))}</strong><small>Optional field over budget</small></div><b>—</b></article>`).join("")}`;
}

function refreshCompiler() {
  const target = artifacts().find(a => a.id === ui.artifactId);
  if (!target) return;
  const pack = compileContextPack(ui.deal, { policy: target.policy, budget: ui.budget });
  const slider = document.querySelector('[data-input="budget"]');
  const label = document.querySelector("[data-budget-label]");
  const status = document.querySelector("[data-compiler-status]");
  const preview = document.querySelector("[data-compiler-preview]");
  const seal = document.querySelector('[data-action="seal"]');
  if (slider) {
    slider.style.setProperty("--range-progress", `${((ui.budget - 900) / 3300) * 100}%`);
    slider.setAttribute("aria-valuetext", `${ui.budget.toLocaleString()} tokens`);
  }
  if (label) label.textContent = `${ui.budget.toLocaleString()} tokens`;
  if (status) { status.className = `compiler-status ${pack.status}`; status.innerHTML = compilerStatusMarkup(pack); }
  if (preview) preview.innerHTML = compilerPreviewMarkup(pack);
  if (seal) seal.disabled = pack.status === "blocked";
}

function download(data, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: "application/json"}));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function restart() {
  ui.page = "demo"; ui.view = "review"; ui.modal = false;
  ui.revision = seedPipeline.baseRevision;
  commit(() => deepClone(seedPipeline), "Walkthrough restarted at revision 17.");
  scrollTop();
}

document.addEventListener("click", event => {
  const view = event.target.closest("[data-view]");
  if (view) { ui.page = "demo"; ui.view = view.dataset.view; ui.revision = accepted().revision; render(); scrollTop(); return; }
  const page = event.target.closest("[data-page]");
  if (page) { ui.page = page.dataset.page; render(); scrollTop(); return; }
  const revision = event.target.closest("[data-revision]");
  if (revision) { ui.revision = Number(revision.dataset.revision); render(); return; }
  const receiptButton = event.target.closest("[data-receipt]");
  if (receiptButton) {
    const record = ui.deal.events.find(item => item.type === "output_rebuilt" && item.payload.receipt.hash === receiptButton.dataset.receipt);
    const title = artifacts().find(item => item.id === record?.payload.artifactId)?.title || "output";
    if (record) { download(record.payload.receipt, `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${record.payload.receipt.hash}.json`); notify("Receipt downloaded.", true); }
    return;
  }
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode || actionNode.disabled || ui.saving) return;
  const action = actionNode.dataset.action;
  if (action === "start") { ui.page = "demo"; render(); scrollTop(); }
  if (action === "restart" || action === "reset") restart();
  if (action === "approve") {
    let result;
    commit(() => (result = approveChange(ui.deal, actionNode.dataset.id, "You")).deal,
      () => { ui.revision = result.revision; return `Revision ${result.revision} committed. ${plural(result.invalidated.length, "output")} now ${result.invalidated.length === 1 ? "needs" : "need"} regenerating.`; });
  }
  if (action === "reject") commit(() => rejectChange(ui.deal, actionNode.dataset.id, "You"), "Change rejected. Accepted state was not changed.");
  if (action === "ingest") {
    let created = false;
    commit(() => { const result = ingestTaskOutput(ui.deal, reversalEmail); created = result.created; return result.deal; },
      () => created ? "The inbox agent proposed a new close date." : "This email was already ingested.");
    scrollTop();
  }
  if (action === "compile") {
    ui.artifactId = actionNode.dataset.artifact;
    ui.modal = true; render(); setTimeout(() => document.querySelector(".compiler-modal input")?.focus(), 0);
  }
  if (action === "close") { ui.modal = false; render(); }
  if (action === "seal") {
    let receipt;
    ui.modal = false; ui.view = "artifacts";
    commit(() => { const result = rebuildOutput(ui.deal, ui.artifactId, { budget: ui.budget }); receipt = result.receipt; return result.deal; },
      () => `Regenerated from revision ${receipt.revision}. Receipt ${receipt.hash}.`);
    scrollTop();
  }
});

document.addEventListener("input", event => {
  if (event.target.dataset.input === "budget") { ui.budget = Number(event.target.value); refreshCompiler(); }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && ui.modal) { ui.modal = false; render(); }
  if (event.key === "Tab" && ui.modal) {
    const focusable = [...document.querySelectorAll(".compiler-modal button:not(:disabled), .compiler-modal input")];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener("storage", event => { if (event.key === STORAGE_KEY || event.key === null) syncFromOtherTabs(); });
window.addEventListener("pageshow", event => { if (event.persisted) syncFromOtherTabs(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncFromOtherTabs(); });

render();
if (initial.notice) notify(initial.notice);
