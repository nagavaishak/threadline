import {
  seedDeal, deepClone, formatValue, getAcceptedState, getCandidateChanges,
  getArtifacts, approveChange, rejectChange, compileContextPack, sealPack,
  snapshotRevision
} from "./core.js";

const STORAGE_KEY = "threadline-v3";
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");
const toastRoot = document.querySelector("#toastRoot");

const icons = {
  state:'<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="17" cy="17" r="2"/><path d="m8 6 8 1M7 8l1 8M10 17l5-1M17 9v6M8 8l8 7"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  file:'<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/></svg>',
  arrow:'<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  download:'<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg>',
  reset:'<svg viewBox="0 0 24 24"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 8"/></svg>'
};
const icon = name => `<span class="icon">${icons[name]}</span>`;
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function validDeal(value) { return value?.schema === "threadline.deal-state.v3" && Array.isArray(value.events) && Array.isArray(value.claims); }
function loadDeal() { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)); return validDeal(parsed) ? parsed : deepClone(seedDeal); } catch { return deepClone(seedDeal); } }
let ui = { deal: loadDeal(), view: "review", selectedProposal: "p-pipeline", revision: 17, modal: false, task: "commercial", budget: 2400, query: "" };

function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ui.deal)); } catch { notify("Local persistence is unavailable in this browser."); } }
function accepted() { return getAcceptedState(ui.deal); }
function proposals() { return getCandidateChanges(ui.deal); }
function artifacts() { return getArtifacts(ui.deal); }
function selectedProposal() { return proposals().find(item => item.proposalId === ui.selectedProposal) || proposals()[0]; }
function claim(id, state = accepted()) { return state.claims.find(item => item.id === id); }
function source(id) { return ui.deal.sources.find(item => item.id === id); }

function notify(message, success = false) {
  const node = document.createElement("div"); node.className = "toast";
  node.innerHTML = `<span>${icon(success ? "check" : "spark")}</span><p>${esc(message)}</p>`;
  toastRoot.append(node); requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => { node.classList.remove("show"); setTimeout(() => node.remove(), 250); }, 3000);
}

function render() {
  const state = accepted();
  app.innerHTML = `<div class="app-shell">
    <aside class="global-rail"><div class="brand-mark"><span></span><span></span><span></span></div><div class="rail-stack"><button class="rail-btn active" aria-label="State">${icon("state")}</button><span class="rail-btn unavailable" title="Alludium Tasks — product context">${icon("file")}</span></div><div class="rail-bottom"><button class="rail-btn" data-action="reset" aria-label="Reset demo">${icon("reset")}</button><div class="avatar">SK</div></div></aside>
    <section class="project-shell">
      <header class="project-bar"><div class="breadcrumbs"><span class="crumb-muted">Projects</span><span>/</span><strong>AsterOS</strong><span class="stage-pill">Evaluation</span></div><div class="concept-label">INDEPENDENT CONCEPT · FICTIONAL DATA</div><div class="bar-actions"><button class="btn primary small" data-action="compile">${icon("spark")} Compile context</button></div></header>
      <nav class="project-tabs">${["Command","Tasks","Activity","Files","Data","Operations","Integrations","Team"].map(t=>`<span class="project-tab unavailable">${t}</span>`).join("")}<span class="project-tab active">State <span>CONCEPT</span></span></nav>
      <div class="workbench commit-workbench">
        ${renderInbox(state)}
        <main class="main-pane"><div class="main-toolbar"><div class="view-switcher"><button data-view="review" class="${ui.view==='review'?'active':''}">${icon("state")} Review</button><button data-view="artifacts" class="${ui.view==='artifacts'?'active':''}">${icon("file")} Dependencies</button><button data-view="revisions" class="${ui.view==='revisions'?'active':''}">${icon("clock")} Revisions</button></div><span class="revision-badge">ACCEPTED REVISION <b>${state.revision}</b></span></div><div class="main-content">${renderMain(state)}</div></main>
        ${renderLedger(state)}
      </div>
    </section>
  </div>`;
  modalRoot.innerHTML = ui.modal ? renderCompiler() : "";
}

function renderInbox(state) {
  const items = proposals().filter(p => !ui.query || claim(p.payload.claimId)?.statement.toLowerCase().includes(ui.query.toLowerCase()));
  return `<aside class="state-inbox"><div class="inbox-heading"><div><span class="eyebrow">STATE INBOX</span><h2>Candidate changes</h2></div><span class="count-badge">${items.filter(x=>x.state==='pending').length}</span></div><label class="inbox-search">${icon("search")}<input id="stateSearch" value="${esc(ui.query)}" placeholder="Filter changes…" aria-label="Filter state changes"><kbd>⌘K</kbd></label>
    <section class="inbox-group"><header><span>NEEDS REVIEW</span><b>${items.filter(x=>x.state==='pending').length}</b></header>${items.filter(x=>x.state==='pending').map(p=>inboxItem(p)).join("") || '<p class="empty-mini">No candidate changes waiting.</p>'}</section>
    <section class="inbox-group"><header><span>REVIEWED</span><b>${items.filter(x=>x.state!=='pending').length}</b></header>${items.filter(x=>x.state!=='pending').map(p=>inboxItem(p)).join("")}</section>
    <section class="inbox-group"><header><span>ACCEPTED STATE · R${state.revision}</span><b>${state.claims.length}</b></header>${state.claims.map(c=>`<div class="accepted-mini"><span>${esc(c.acceptedValue?.metric || c.category)}</span><strong>${esc(formatValue(c.acceptedValue))}</strong></div>`).join("")}</section></aside>`;
}
function inboxItem(p) { const c=claim(p.payload.claimId); return `<button class="inbox-item ${ui.selectedProposal===p.proposalId?'selected':''}" data-proposal="${p.proposalId}"><span class="item-signal ${p.state==='pending'?'critical':'resolved'}"></span><span class="item-copy"><strong>${esc(c?.acceptedValue?.metric || c?.category)}</strong><small>${esc(formatValue(p.payload.from))} → ${esc(formatValue(p.payload.to))}</small></span><em class="review-state ${p.state}">${p.state}</em></button>`; }

function renderMain(state) {
  if (ui.view === "artifacts") return renderArtifacts(state);
  if (ui.view === "revisions") return renderRevisions();
  return renderReview(state);
}

function renderReview(state) {
  const proposal = selectedProposal();
  if (!proposal) return `<section class="completion-state">${icon("check")}<h1>No candidate changes need review.</h1><p>Open Dependencies to inspect downstream context packs and outputs.</p></section>`;
  const c = claim(proposal.payload.claimId, state);
  const impacted = artifacts().filter(a => a.dependencies.some(d => d.claimId === c.id));
  const committed = proposal.state === "approved";
  const leftValue = committed ? proposal.payload.from : c.acceptedValue;
  const rightValue = proposal.payload.to;
  return `<div class="review-page">
    <section class="review-intro"><span class="eyebrow">REVIEWED-OUTPUT COMMIT PROTOCOL</span><h1>Accept a state change without losing the prior decision context.</h1><p>A completed Investment Fit Screen surfaced a definition conflict. The candidate value remains outside accepted state until an investor commits it.</p></section>
    <section class="commit-card panel"><header><div><span class="candidate-pill">CANDIDATE CHANGE</span><h2>${esc(c.acceptedValue?.metric)}</h2></div><span class="base-revision">BASED ON REVISION ${proposal.baseRevision}</span></header>
      <div class="state-compare"><div class="accepted-side"><span>${committed ? `PREVIOUS STATE · R${proposal.baseRevision}` : `ACCEPTED STATE · R${state.revision}`}</span><strong>${esc(formatValue(leftValue))}</strong><p>${esc(leftValue?.period)}</p><em>${committed ? "Preserved for revision replay" : "Used by current downstream work"}</em></div><div class="commit-arrow">${icon("arrow")}</div><div class="proposed-side ${committed ? "committed" : ""}"><span>${committed ? `ACCEPTED STATE · R${state.revision}` : "CANDIDATE STATE"}</span><strong>${esc(formatValue(rightValue))}</strong><p>${esc(rightValue.period)}</p><em>${committed ? "Active for newly compiled work" : "Not visible to agents until approved"}</em></div></div>
      <div class="definition-conflict"><strong>Definition conflict</strong><p>${esc(proposal.payload.reason)}</p></div>
      <section class="evidence-section"><div class="section-title"><span>EXACT SOURCE EXCERPTS</span><b>${proposal.payload.sourceIds.length}</b></div><div class="evidence-grid">${proposal.payload.sourceIds.map(id=>sourceCard(source(id))).join("")}</div></section>
      <section class="impact-section"><div class="section-title"><span>IMPACT PREVIEW</span><b>${impacted.length} DEPENDENCIES</b></div>${impacted.map(a=>`<article class="impact-row ${a.state}"><span>${icon("file")}</span><div><strong>${esc(a.title)}</strong><small>Uses ${esc(c.acceptedValue.metric)} from revision ${a.revision}</small></div><em>${proposal.state==='approved'&&a.state==='stale'?'STALE AFTER COMMIT':'WILL BECOME STALE'}</em></article>`).join("")}</section>
      ${renderDecisionBoundary(proposal, state, impacted)}
    </section>
  </div>`;
}

function sourceCard(s) { return `<article class="source-card-static"><header><span>${esc(s.type)}</span><em>${esc(s.origin)}</em></header><strong>${esc(s.title)}</strong><blockquote>“${esc(s.excerpt)}”</blockquote><footer>${esc(s.custodian)} · ${esc(s.locator)}</footer></article>`; }

function renderDecisionBoundary(proposal, state, impacted) {
  if (proposal.state === "pending") return `<footer class="commit-actions"><div><strong>Human commit boundary</strong><p>Approval creates revision ${state.revision+1}; rejection appends a review event and leaves revision ${state.revision} unchanged.</p></div><button class="btn danger" data-action="reject" data-id="${proposal.proposalId}">${icon("x")} Reject</button><button class="btn primary" data-action="approve" data-id="${proposal.proposalId}">${icon("check")} Approve & commit R${state.revision+1}</button></footer>`;
  if (proposal.state === "rejected") return `<footer class="commit-result rejected">${icon("x")}<div><strong>Candidate rejected by ${esc(proposal.reviewedBy)}</strong><p>Accepted revision ${state.revision} was not changed.</p></div></footer>`;
  return `<footer class="commit-result approved">${icon("check")}<div><strong>Committed as revision ${state.revision} by ${esc(proposal.reviewedBy)}</strong><p>${impacted.filter(a=>a.state==='stale').length} dependent artifacts are stale and explain why.</p></div><button class="btn primary" data-action="compile">Recompile Commercial Diligence ${icon("arrow")}</button></footer>`;
}

function renderArtifacts(state) {
  const list = artifacts();
  return `<div class="artifact-page"><section class="review-intro"><span class="eyebrow">DEPENDENCY INVALIDATION</span><h1>Accepted state changes invalidate downstream work.</h1><p>Every pack and output records the claim revision it used. Nothing is silently refreshed.</p></section><div class="artifact-grid">${list.map(a=>`<article class="artifact-card ${a.state}"><header><span>${icon("file")}</span><em>${a.state.toUpperCase()}</em></header><h2>${esc(a.title)}</h2><p>Compiled against accepted revision ${a.revision}</p>${a.staleReason?`<div class="stale-reason"><strong>Why stale</strong><p>${esc(a.staleReason)}</p></div>`:""}<div class="dependency-list">${a.dependencies.map(d=>`<span>${esc(claim(d.claimId)?.acceptedValue?.metric || d.claimId)} · R${d.revision}</span>`).join("")}</div>${a.state==='stale'?`<button class="btn primary" data-action="compile" data-task="${a.task}">Recompile against R${state.revision}</button>`:a.receiptHash?`<button class="btn secondary" data-receipt="${a.receiptHash}">Receipt ${esc(a.receiptHash)}</button>`:""}</article>`).join("")}</div></div>`;
}

function renderRevisions() {
  const current = accepted().revision;
  const snap = snapshotRevision(ui.deal, ui.revision);
  return `<div class="revision-page"><section class="review-intro"><span class="eyebrow">POINT-IN-TIME STATE REPLAY</span><h1>Reconstruct accepted state by revision—not by hindsight.</h1><p>Claims retain their earlier accepted values even after a later change.</p></section><div class="revision-selector">${Array.from({length:current-16},(_,i)=>17+i).map(r=>`<button class="${ui.revision===r?'active':''}" data-revision="${r}">REVISION ${r}</button>`).join("")}</div><section class="revision-snapshot panel"><header><div><span>ACCEPTED SNAPSHOT</span><h2>Revision ${snap.revision}</h2></div><time>${new Date(snap.committedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</time></header><div class="snapshot-claims">${snap.claims.map(c=>`<article><div><strong>${esc(c.acceptedValue?.metric || c.category)}</strong><small>${esc(c.statement)}</small></div><b>${esc(formatValue(c.acceptedValue))}</b><em>${esc(c.status)}</em></article>`).join("")}</div><div class="snapshot-decisions">${snap.decisions.map(d=>`<article><span>DECISION · ${esc(d.actor)}</span><strong>${esc(d.decision)}</strong><p>${esc(d.rationale)}</p></article>`).join("")}</div></section></div>`;
}

function renderLedger(state) {
  const events = ui.deal.events.slice().reverse().slice(0,9);
  return `<aside class="ledger-pane"><div class="ledger-head"><span class="eyebrow">APPEND-ONLY LEDGER</span><h2>Revision ${state.revision}</h2><p>${ui.deal.events.length} recorded events</p></div><div class="ledger-events">${events.map(e=>`<article><i class="${e.type}"></i><time>${new Date(e.at).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</time><strong>${esc(e.type.replaceAll('_',' '))}</strong><small>${esc(e.actor)}${e.revision?` · R${e.revision}`:''}</small></article>`).join("")}</div></aside>`;
}

function renderCompiler() {
  const pack = compileContextPack(ui.deal, { task: ui.task, budget: ui.budget });
  const blocked = pack.status === "blocked";
  return `<div class="modal-backdrop" data-action="close"><section class="compiler-modal" role="dialog" aria-modal="true" aria-labelledby="compilerTitle" data-modal><header><div><span class="eyebrow">BOUNDED CONTEXT COMPILER</span><h2 id="compilerTitle">Compile against accepted revision ${pack.revision}</h2><p>Required claims either fit together or compilation blocks. Candidate values are never included.</p></div><button class="icon-button" data-action="close" aria-label="Close compiler">${icon("x")}</button></header><div class="compiler-grid"><section class="compiler-controls"><label>Task policy<select data-input="task"><option value="commercial" ${ui.task==='commercial'?'selected':''}>Commercial diligence</option><option value="ic" ${ui.task==='ic'?'selected':''}>Investment committee</option><option value="partner" ${ui.task==='partner'?'selected':''}>Partner review</option></select></label><label><span>Token budget <b>${ui.budget.toLocaleString()}</b></span><input type="range" min="900" max="4200" step="100" value="${ui.budget}" data-input="budget"></label><div class="compiler-status ${pack.status}"><strong>${blocked?'COMPILATION BLOCKED':'READY TO SEAL'}</strong><p>${blocked?`Required material needs at least ${pack.minimumRequiredTokens.toLocaleString()} tokens. Nothing was silently dropped.`:`${pack.tokens.toLocaleString()} of ${pack.budget.toLocaleString()} tokens · revision ${pack.revision}`}</p></div></section><section class="compiler-preview"><header><span>CONTEXT CONTENTS</span><b>${pack.included.length} CLAIMS</b></header>${pack.included.map(i=>`<article class="pack-claim"><span>${i.required?'REQUIRED':'OPTIONAL'}</span><div><strong>${esc(i.claim.acceptedValue?.metric || i.claim.category)}</strong><small>${i.claim.sourceIds.length} exact excerpts</small></div><b>${esc(formatValue(i.claim.acceptedValue))}</b></article>`).join("")}${pack.exclusions.map(x=>`<article class="pack-exclusion"><span>EXCLUDED</span><strong>${esc(claim(x.claimId)?.acceptedValue?.metric || x.claimId)}</strong><em>${esc(x.reason.replaceAll('_',' '))}</em></article>`).join("")}</section></div><footer><div><span>RECEIPT</span><strong>Revision + policy + permissions + exclusions + deterministic hash</strong></div><button class="btn secondary" data-action="close">Cancel</button><button class="btn primary" data-action="seal" ${blocked?'disabled':''}>${icon("check")} Seal context receipt</button></footer></section></div>`;
}

function download(data, name) { const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500); }

document.addEventListener("click", event => {
  if (event.target.closest("[data-modal]") && event.target === event.target.closest("[data-modal]")) return;
  const proposal = event.target.closest("[data-proposal]"); if (proposal) { ui.selectedProposal=proposal.dataset.proposal;ui.view='review';render();return; }
  const view = event.target.closest("[data-view]"); if (view) { ui.view=view.dataset.view;render();return; }
  const rev = event.target.closest("[data-revision]"); if (rev) { ui.revision=Number(rev.dataset.revision);render();return; }
  const receiptButton = event.target.closest("[data-receipt]"); if (receiptButton) { const e=ui.deal.events.find(x=>x.type==='pack_compiled'&&x.payload.receipt.hash===receiptButton.dataset.receipt); if(e)download(e.payload.receipt,`${e.payload.receipt.task}-${e.payload.receipt.hash}.json`);return; }
  const actionEl = event.target.closest("[data-action]"); if (!actionEl) return;
  const action=actionEl.dataset.action;
  if(action==='approve'){const result=approveChange(ui.deal,actionEl.dataset.id,'Shashank Khan');ui.deal=result.deal;ui.revision=result.revision;persist();render();notify(`Revision ${result.revision} committed. ${result.invalidated.length} dependencies marked stale.`,true);}
  if(action==='reject'){ui.deal=rejectChange(ui.deal,actionEl.dataset.id,'Shashank Khan');persist();render();notify(`Candidate rejected. Accepted revision ${accepted().revision} is unchanged.`,true);}
  if(action==='compile'){ui.task=actionEl.dataset.task||'commercial';ui.modal=true;render();setTimeout(()=>document.querySelector('.compiler-modal select')?.focus(),0);}
  if(action==='close'){ui.modal=false;render();}
  if(action==='seal'){const pack=compileContextPack(ui.deal,{task:ui.task,budget:ui.budget});if(pack.status==='blocked')return;const sealed=sealPack(ui.deal,pack,`a-${ui.task}-pack`);ui.deal=sealed.deal;ui.modal=false;ui.view='artifacts';persist();render();notify(`Context sealed at revision ${sealed.receipt.revision}: ${sealed.receipt.hash}`,true);}
  if(action==='reset'){if(confirm('Reset the independent Threadline concept demo?')){localStorage.removeItem(STORAGE_KEY);ui.deal=deepClone(seedDeal);ui.view='review';ui.revision=17;render();}}
});

document.addEventListener("input", event => { if(event.target.id==='stateSearch'){ui.query=event.target.value;render();document.querySelector('#stateSearch')?.focus();} if(event.target.dataset.input==='budget'){ui.budget=Number(event.target.value);render();} });
document.addEventListener("change", event => { if(event.target.dataset.input==='task'){ui.task=event.target.value;render();} });
document.addEventListener("keydown", event => { if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector('#stateSearch')?.focus();} if(event.key==='Escape'&&ui.modal){ui.modal=false;render();} });

render();
