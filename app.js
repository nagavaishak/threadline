import {
  seedDeal, deepClone, formatValue, getAcceptedState, getCandidateChanges,
  getArtifacts, approveChange, rejectChange, compileContextPack, sealPack,
  snapshotRevision
} from "./core.js";

const STORAGE_KEY = "threadline-v4";
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const toastRoot = document.querySelector("#toastRoot");

const icons = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5m5-5-5 5 5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 3 8 4-8 4-8-4 8-4Zm8 9-8 4-8-4m16 5-8 4-8-4"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 8"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>'
};
const icon = name => `<span class="icon">${icons[name]}</span>`;
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

function loadDeal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.schema === "threadline.deal-state.v3" ? parsed : deepClone(seedDeal);
  } catch { return deepClone(seedDeal); }
}

let ui = {
  deal: loadDeal(), page: "overview", view: "review", revision: 17,
  modal: false, task: "commercial", artifactId: "a-commercial-pack", budget: 2600
};

const accepted = () => getAcceptedState(ui.deal);
const proposals = () => getCandidateChanges(ui.deal);
const artifacts = () => getArtifacts(ui.deal);
const claim = (id, state = accepted()) => state.claims.find(item => item.id === id);
const source = id => ui.deal.sources.find(item => item.id === id);
const currentProposal = () => proposals()[0];
const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(ui.deal));
const scrollTop = () => requestAnimationFrame(() => window.scrollTo({top: 0, behavior: "instant"}));

function notify(message, success = false) {
  const node = document.createElement("div");
  node.className = `toast ${success ? "success" : ""}`;
  node.innerHTML = `${icon(success ? "check" : "spark")}<p>${esc(message)}</p>`;
  toastRoot.append(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => { node.classList.remove("show"); setTimeout(() => node.remove(), 220); }, 3200);
}

function journeyState() {
  const proposal = currentProposal();
  const stale = artifacts().filter(item => item.state === "stale").length;
  if (proposal?.state === "pending") return { step: 1, label: "Review the change" };
  if (proposal?.state === "rejected") return { step: 1, label: "Change rejected" };
  if (stale) return { step: 2, label: "Repair stale work" };
  return { step: 3, label: "Workflow complete" };
}

function render() {
  app.innerHTML = `<div class="tl-shell">
    ${renderHeader()}
    ${ui.page === "overview" ? renderOverview() : renderWorkspace()}
  </div>`;
  modalRoot.innerHTML = ui.modal ? renderCompiler() : "";
}

function renderHeader() {
  return `<header class="tl-header">
    <button class="tl-brand" data-page="overview" aria-label="Threadline overview"><span class="brand-glyph"><i></i><i></i><i></i></span><strong>Threadline</strong></button>
    <span class="header-thesis">A deal-state layer for Alludium</span>
    <nav aria-label="Primary navigation">
      <button data-page="overview" class="${ui.page === "overview" ? "active" : ""}">Why it exists</button>
      <button data-action="start" class="${ui.page === "demo" ? "active" : ""}">Live walkthrough</button>
    </nav>
    <span class="concept-chip">INDEPENDENT CONCEPT</span>
  </header>`;
}

function renderOverview() {
  return `<main class="overview-page">
    <section class="hero-grid">
      <div class="hero-copy">
        <span class="kicker">THE MISSING LAYER AFTER AN AI TASK FINISHES</span>
        <h1>AI can produce the work.<br><em>Threadline keeps the deal coherent.</em></h1>
        <p>Threadline turns reviewed task outputs into versioned deal state—then shows every memo, analysis and workflow that must change with it.</p>
        <div class="hero-actions">
          <button class="cta-primary" data-action="start">Start the 3-minute walkthrough ${icon("arrow")}</button>
          <span>No setup · fictional Series A deal</span>
        </div>
      </div>
      <div class="product-map" aria-label="How Threadline fits into Alludium">
        <div class="map-label">WHERE IT SITS</div>
        <div class="map-node muted"><span>01</span><div><strong>Alludium task finishes</strong><small>Research, call or diligence output</small></div></div>
        <div class="map-connector"><i></i><span>reviewed output</span></div>
        <div class="map-node focus"><span>02</span><div><strong>Threadline updates deal state</strong><small>Human-approved, sourced and versioned</small></div></div>
        <div class="map-connector"><i></i><span>trusted context</span></div>
        <div class="map-node muted"><span>03</span><div><strong>Alludium moves the next work</strong><small>Recompile, route and continue</small></div></div>
      </div>
    </section>

    <section class="walkthrough-preview">
      <div class="section-heading"><span>THE DEMO</span><h2>One contradiction. Three consequences.</h2><p>Follow a real investment workflow instead of exploring an empty dashboard.</p></div>
      <div class="story-steps">
        <article><span>01</span><div class="story-icon red">${icon("spark")}</div><h3>Review a contradiction</h3><p>An AI task finds that the pitch deck and CRM use different definitions of “qualified pipeline.”</p><strong>€4.2m <i>→</i> €1.8m</strong></article>
        <article><span>02</span><div class="story-icon amber">${icon("layers")}</div><h3>See the blast radius</h3><p>Approval creates a new revision and immediately marks dependent diligence work as stale.</p><strong>2 outputs affected</strong></article>
        <article><span>03</span><div class="story-icon green">${icon("check")}</div><h3>Rebuild trusted context</h3><p>Compile a bounded context pack against the accepted revision and produce an audit receipt.</p><strong>1 verifiable receipt</strong></article>
      </div>
    </section>

    <section class="thesis-band">
      <div><span>THE PRODUCT THESIS</span><h2>Alludium already helps investment teams do the work. Threadline makes the result durable across the firm.</h2></div>
      <div class="thesis-points"><p><b>Answers → state</b> Task output becomes reviewed institutional knowledge.</p><p><b>Individual → team</b> Everyone works from the same accepted version.</p><p><b>Recording → moving</b> A change automatically exposes the next required action.</p></div>
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
      <div class="scenario-title"><span>GUIDED SCENARIO</span><strong>AsterOS · Series A evaluation</strong><em>Fictional data</em></div>
      <div class="journey-progress" aria-label="Walkthrough progress">
        ${[1,2,3].map(step => `<span class="${journey.step >= step ? "complete" : ""} ${journey.step === step ? "current" : ""}"><i>${journey.step > step ? icon("check") : step}</i>${["Review", "Repair", "Verify"][step-1]}</span>`).join("")}
      </div>
      <button class="icon-button" data-action="reset" aria-label="Restart walkthrough" title="Restart walkthrough">${icon("reset")}</button>
    </section>
    <section class="demo-layout">
      <div class="demo-main">
        <nav class="demo-tabs" aria-label="Scenario views">
          <button data-view="review" class="${ui.view === "review" ? "active" : ""}">1. Deal change</button>
          <button data-view="artifacts" class="${ui.view === "artifacts" ? "active" : ""}">2. Dependent work ${staleCount ? `<b>${staleCount}</b>` : ""}</button>
          <button data-view="revisions" class="${ui.view === "revisions" ? "active" : ""}">Decision history</button>
        </nav>
        <div class="demo-content">${renderActiveView(state)}</div>
      </div>
      ${renderGuideRail(journey, state)}
    </section>
  </main>`;
}

function renderActiveView(state) {
  if (ui.view === "artifacts") return renderArtifacts(state);
  if (ui.view === "revisions") return renderRevisions();
  return renderReview(state);
}

function renderReview(state) {
  const proposal = currentProposal();
  const c = claim(proposal.payload.claimId, state);
  const committed = proposal.state === "approved";
  const rejected = proposal.state === "rejected";
  const impacted = artifacts().filter(a => a.dependencies.some(d => d.claimId === c.id));
  return `<div class="guided-view">
    <header class="view-intro"><span class="step-tag">STEP 1 · HUMAN COMMIT BOUNDARY</span><h1>An AI task found a material contradiction.</h1><p>The existing deal state is still protected. Review the evidence, understand what will break, then decide whether this correction becomes accepted truth.</p></header>
    <div class="task-arrival">${icon("spark")}<div><strong>Investment Fit Screen completed</strong><p>Proposed one change to the AsterOS deal record. No accepted data has changed yet.</p></div><span>REVIEW REQUIRED</span></div>
    <section class="change-card">
      <div class="change-head"><div><span>${committed ? "ACCEPTED CHANGE" : rejected ? "REJECTED CHANGE" : "PROPOSED CORRECTION"}</span><h2>${esc(c.acceptedValue?.metric)}</h2></div><small>Based on accepted revision ${proposal.baseRevision}</small></div>
      <div class="value-change">
        <div><span>${committed ? "PREVIOUS VALUE" : "CURRENT ACCEPTED VALUE"}</span><strong>${esc(formatValue(proposal.payload.from))}</strong><small>Pitch deck definition · ${esc(proposal.payload.from.period)}</small></div>
        <i>${icon("arrow")}</i>
        <div class="new-value"><span>${committed ? "NEW ACCEPTED VALUE" : "AI-PROPOSED VALUE"}</span><strong>${esc(formatValue(proposal.payload.to))}</strong><small>Sales-accepted only · ${esc(proposal.payload.to.period)}</small></div>
      </div>
      <div class="plain-explanation"><span>WHY THIS CHANGED</span><p>The deck counted every company that completed a discovery call. The CRM shows only <b>€1.8m</b> has actually been accepted by sales.</p></div>
      <div class="evidence-block"><div class="block-title"><span>EVIDENCE USED</span><small>Exact excerpts · not an AI summary</small></div><div class="evidence-list">${proposal.payload.sourceIds.map(id => sourceCard(source(id))).join("")}</div></div>
      <div class="impact-preview"><div><span>WHAT APPROVAL WILL DO</span><strong>Create revision ${state.revision + (committed ? 0 : 1)} and mark ${impacted.length} dependent outputs as stale.</strong></div>${impacted.map(a => `<span>${icon("file")} ${esc(a.title)}</span>`).join("")}</div>
      ${renderReviewAction(proposal, state)}
    </section>
  </div>`;
}

function sourceCard(item) {
  return `<article><span>${esc(item.type)}</span><div><strong>${esc(item.title)}</strong><blockquote>“${esc(item.excerpt)}”</blockquote><small>${esc(item.custodian)} · ${esc(item.locator)}</small></div></article>`;
}

function renderReviewAction(proposal, state) {
  if (proposal.state === "pending") return `<footer class="decision-bar"><div><span>YOUR DECISION</span><p>Approval is explicit, attributable and reversible by revision replay.</p></div><button class="btn ghost-danger" data-action="reject" data-id="${proposal.proposalId}">Reject</button><button class="btn primary" data-action="approve" data-id="${proposal.proposalId}">${icon("check")} Approve correction</button></footer>`;
  if (proposal.state === "rejected") return `<footer class="result-bar rejected">${icon("x")}<div><strong>Correction rejected. Accepted state remains revision ${state.revision}.</strong><p>This review is still recorded in the decision history.</p></div><button class="btn secondary" data-action="restart">Replay scenario</button></footer>`;
  return `<footer class="result-bar approved">${icon("check")}<div><strong>Correction committed as revision ${state.revision}.</strong><p>Accepted pipeline is now €1.8m. Dependent work has not been silently rewritten.</p></div><button class="btn primary" data-view="artifacts">See what became stale ${icon("arrow")}</button></footer>`;
}

function renderArtifacts(state) {
  const list = artifacts();
  const stale = list.filter(a => a.state === "stale");
  return `<div class="guided-view">
    <header class="view-intro"><span class="step-tag">STEP 2 · DEPENDENCY-AWARE WORK</span><h1>${stale.length ? "The deal changed. Old work did not." : "Every dependent output is current."}</h1><p>${stale.length ? "Threadline exposes exactly which work used the previous value, so the team knows what to rebuild before the next decision." : "Both outputs now use accepted revision 18 and carry a deterministic context receipt."}</p></header>
    ${stale.length ? `<div class="warning-banner"><strong>${stale.length} outputs need attention</strong><span>Nothing was updated behind the team’s back.</span></div>` : `<div class="completion-banner">${icon("check")}<div><strong>The workflow is coherent again.</strong><p>Reviewed state, dependent work and audit history now agree.</p></div><button class="btn secondary" data-view="revisions">Verify the history</button></div>`}
    <div class="artifact-grid">${list.map(a => artifactCard(a, state)).join("")}</div>
  </div>`;
}

function artifactCard(a, state) {
  return `<article class="artifact-card ${a.state}">
    <header><div class="artifact-icon">${icon("file")}</div><span>${a.state === "stale" ? "NEEDS REBUILD" : "CURRENT"}</span></header>
    <h2>${esc(a.title)}</h2><p>${a.state === "stale" ? "Still uses an older version of accepted deal state." : `Built from accepted revision ${a.revision}.`}</p>
    <div class="dependency-row"><span>Uses</span>${a.dependencies.map(d => `<b>${esc(claim(d.claimId)?.acceptedValue?.metric || d.claimId)} · R${d.revision}</b>`).join("")}</div>
    ${a.state === "stale" ? `<div class="stale-copy"><strong>Why it is stale</strong><p>${esc(a.staleReason)}</p></div><button class="btn primary wide" data-action="compile" data-task="${a.task}" data-artifact="${a.id}">Rebuild against revision ${state.revision} ${icon("arrow")}</button>` : a.receiptHash ? `<button class="btn receipt wide" data-receipt="${a.receiptHash}">${icon("check")} Verified receipt · ${esc(a.receiptHash)}</button>` : `<span class="current-note">No newer accepted revision</span>`}
  </article>`;
}

function renderRevisions() {
  const current = accepted().revision;
  const snap = snapshotRevision(ui.deal, ui.revision);
  const pipeline = snap.claims.find(c => c.id === "c-pipeline");
  return `<div class="guided-view history-view">
    <header class="view-intro"><span class="step-tag">AUDITABLE DECISION MEMORY</span><h1>See what the firm believed at any revision.</h1><p>Threadline preserves prior accepted state, the human decision and the downstream consequences—without hindsight rewriting.</p></header>
    <div class="revision-switch">${Array.from({length: current - 16}, (_, i) => 17 + i).map(r => `<button data-revision="${r}" class="${ui.revision === r ? "active" : ""}">Revision ${r}</button>`).join("")}</div>
    <section class="revision-card"><header><div><span>ACCEPTED SNAPSHOT</span><h2>Revision ${snap.revision}</h2></div><time>${new Date(snap.committedAt).toLocaleString([], {dateStyle:"medium", timeStyle:"short"})}</time></header><div class="history-hero"><span>Sales pipeline at this point in time</span><strong>${esc(formatValue(pipeline?.acceptedValue))}</strong><p>${esc(pipeline?.acceptedValue?.period)}</p></div><div class="history-claims">${snap.claims.map(c => `<span><small>${esc(c.acceptedValue?.metric || c.category)}</small><b>${esc(formatValue(c.acceptedValue))}</b></span>`).join("")}</div><div class="decision-list">${snap.decisions.map(d => `<article><span>DECISION · ${esc(d.actor)}</span><strong>${esc(d.decision)}</strong><p>${esc(d.rationale)}</p></article>`).join("")}</div></section>
  </div>`;
}

function renderGuideRail(journey, state) {
  const copy = journey.step === 1 ? { title: "Decide what becomes truth", body: "Compare the accepted value with the proposed correction. Evidence stays attached to both.", action: "Approve or reject the correction in the main panel." } : journey.step === 2 ? { title: "Repair the blast radius", body: "The state is correct, but old diligence outputs still reference revision 17.", action: "Open Dependent work and rebuild each stale output." } : { title: "The loop is closed", body: "Accepted state and dependent work now point to the same revision.", action: "Open Decision history to replay what changed." };
  return `<aside class="guide-rail"><div class="guide-sticky"><span class="eyebrow">WHAT YOU’RE SEEING</span><div class="guide-number">0${journey.step}</div><h2>${copy.title}</h2><p>${copy.body}</p><div class="next-action"><span>NEXT ACTION</span><strong>${copy.action}</strong></div><div class="state-facts"><span><small>Accepted state</small><b>Revision ${state.revision}</b></span><span><small>Stale work</small><b>${artifacts().filter(a => a.state === "stale").length} outputs</b></span><span><small>Candidate values used</small><b>Never</b></span></div><p class="alludium-fit"><b>Alludium fit</b> This layer sits after Tasks produce outputs and before Operations routes the next work.</p></div></aside>`;
}

function renderCompiler() {
  const pack = compileContextPack(ui.deal, { task: ui.task, budget: ui.budget });
  const blocked = pack.status === "blocked";
  const rangeProgress = ((ui.budget - 900) / 3300) * 100;
  return `<div class="modal-backdrop"><section class="compiler-modal" role="dialog" aria-modal="true" aria-labelledby="compilerTitle" data-modal>
    <header><div><span class="eyebrow">STEP 3 · BOUNDED CONTEXT</span><h2 id="compilerTitle">Rebuild this output from accepted state</h2><p>Threadline includes required claims first, excludes anything outside policy, and records exactly what the output used.</p></div><button class="icon-button" data-action="close" aria-label="Close compiler">${icon("x")}</button></header>
    <div class="compiler-grid"><section class="compiler-controls"><label>Output policy<select data-input="task"><option value="commercial" ${ui.task === "commercial" ? "selected" : ""}>Commercial diligence</option><option value="ic" ${ui.task === "ic" ? "selected" : ""}>Investment committee</option><option value="partner" ${ui.task === "partner" ? "selected" : ""}>Partner review</option></select></label><label class="budget-control"><span>Context budget <b data-budget-label>${ui.budget.toLocaleString()} tokens</b></span><input type="range" min="900" max="4200" step="100" value="${ui.budget}" style="--range-progress:${rangeProgress}%" data-input="budget" aria-label="Context token budget" aria-valuetext="${ui.budget.toLocaleString()} tokens"><small><i>900</i><i>4,200</i></small></label><div class="compiler-status ${pack.status}" data-compiler-status>${compilerStatusMarkup(pack)}</div></section><section class="compiler-preview" data-compiler-preview>${compilerPreviewMarkup(pack)}</section></div>
    <footer><div><span>AFTER REBUILD</span><strong>A deterministic receipt proves the revision, policy and exclusions used.</strong></div><button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" data-action="seal" ${blocked ? "disabled" : ""}>Rebuild & verify ${icon("arrow")}</button></footer>
  </section></div>`;
}

function compilerStatusMarkup(pack) {
  const blocked = pack.status === "blocked";
  return `<strong>${blocked ? "BLOCKED—NOT ENOUGH CONTEXT" : "READY TO REBUILD"}</strong><p>${blocked ? `Required claims need at least ${pack.minimumRequiredTokens.toLocaleString()} tokens. Threadline will not silently omit them.` : `${pack.tokens.toLocaleString()} tokens · accepted revision ${pack.revision}`}</p>`;
}

function compilerPreviewMarkup(pack) {
  return `<div class="block-title"><span>WHAT THE OUTPUT WILL RECEIVE</span><small>${pack.included.length} claims</small></div>${pack.included.map(i => `<article class="pack-row"><span>${i.required ? "REQUIRED" : "OPTIONAL"}</span><div><strong>${esc(i.claim.acceptedValue?.metric || i.claim.category)}</strong><small>${i.claim.sourceIds.length} source excerpts attached</small></div><b>${esc(formatValue(i.claim.acceptedValue))}</b></article>`).join("")}`;
}

function refreshCompiler() {
  const pack = compileContextPack(ui.deal, {task: ui.task, budget: ui.budget});
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

document.addEventListener("click", event => {
  const view = event.target.closest("[data-view]");
  if (view) { ui.page = "demo"; ui.view = view.dataset.view; render(); scrollTop(); return; }
  const page = event.target.closest("[data-page]");
  if (page) { ui.page = page.dataset.page; render(); scrollTop(); return; }
  const revision = event.target.closest("[data-revision]");
  if (revision) { ui.revision = Number(revision.dataset.revision); render(); return; }
  const receiptButton = event.target.closest("[data-receipt]");
  if (receiptButton) {
    const eventRecord = ui.deal.events.find(item => item.type === "pack_compiled" && item.payload.receipt.hash === receiptButton.dataset.receipt);
    if (eventRecord) { download(eventRecord.payload.receipt, `${eventRecord.payload.receipt.task}-${eventRecord.payload.receipt.hash}.json`); notify("Verification receipt downloaded.", true); }
    return;
  }
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) return;
  const action = actionNode.dataset.action;
  if (action === "start" || action === "restart" || action === "reset") {
    ui.deal = deepClone(seedDeal); ui.page = "demo"; ui.view = "review"; ui.revision = 17; persist(); render(); scrollTop();
    if (action !== "start") notify("Walkthrough restarted at revision 17.");
  }
  if (action === "approve") {
    const result = approveChange(ui.deal, actionNode.dataset.id, "Shashank Khan");
    ui.deal = result.deal; ui.revision = result.revision; persist(); render();
    notify(`Revision ${result.revision} committed. ${result.invalidated.length} outputs now need attention.`, true);
  }
  if (action === "reject") {
    ui.deal = rejectChange(ui.deal, actionNode.dataset.id, "Shashank Khan"); persist(); render();
    notify("Correction rejected. Accepted state was not changed.");
  }
  if (action === "compile") {
    ui.task = actionNode.dataset.task || "commercial";
    ui.artifactId = actionNode.dataset.artifact || `a-${ui.task}-pack`;
    ui.modal = true; render(); setTimeout(() => document.querySelector(".compiler-modal select")?.focus(), 0);
  }
  if (action === "close") { ui.modal = false; render(); }
  if (action === "seal") {
    const pack = compileContextPack(ui.deal, {task: ui.task, budget: ui.budget});
    if (pack.status === "blocked") return;
    const sealed = sealPack(ui.deal, pack, ui.artifactId);
    ui.deal = sealed.deal; ui.modal = false; ui.view = "artifacts"; persist(); render(); scrollTop();
    notify(`Output rebuilt from revision ${sealed.receipt.revision}. Receipt ${sealed.receipt.hash} created.`, true);
  }
});

document.addEventListener("input", event => {
  if (event.target.dataset.input === "budget") { ui.budget = Number(event.target.value); refreshCompiler(); }
});
document.addEventListener("change", event => {
  if (event.target.dataset.input === "task") { ui.task = event.target.value; render(); }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && ui.modal) { ui.modal = false; render(); }
  if (event.key === "Tab" && ui.modal) {
    const focusable = [...document.querySelectorAll(".compiler-modal button:not(:disabled), .compiler-modal select, .compiler-modal input")];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

render();
