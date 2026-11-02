import {
  seedPipeline, reversalEmail, deepClone, formatValue, formatDate, getAcceptedState, getCandidateChanges,
  getArtifacts, approveChange, rejectChange, rebuildOutput, diffLines, snapshotRevision, fieldHistory,
  ingestTaskOutput, isValidDeal
} from "./core.js";
import { createStore } from "./store.js";

const STORAGE_KEY = "threadline-v5";
const FIELD = "halden.closeDate";
const app = document.querySelector("#app");
const toastRoot = document.querySelector("#toastRoot");

const icons = {
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 7"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 8"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>'
};
const icon = name => `<span class="icon" aria-hidden="true">${icons[name]}</span>`;
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const fmt = value => esc(formatValue(value));

const blockedStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
const store = createStore({
  storage: (() => { try { return window.localStorage; } catch { return blockedStorage; } })(),
  key: STORAGE_KEY, schema: "threadline-store.v1", seed: seedPipeline, isValid: deal => isValidDeal(deal) && canRender(deal), legacyKeys: ["threadline-v4"],
  lock: run => (navigator.locks ? navigator.locks.request("threadline-save", run) : run())
});

let ui = { deal: deepClone(seedPipeline), page: "intro", saving: false };

// Only the renderer knows for sure whether a saved log can be shown, so render every page of it offscreen.
function canRender(deal) {
  const current = ui;
  try {
    for (const page of ["intro", "demo", "history"]) { ui = { ...current, deal, page }; renderPage(); }
    return true;
  } catch {
    return false;
  } finally {
    ui = current;
  }
}

const proposals = () => getCandidateChanges(ui.deal);
const artifacts = () => getArtifacts(ui.deal);
const closeDate = () => getAcceptedState(ui.deal).fields.find(field => field.id === FIELD).value;
const source = id => ui.deal.sources.find(item => item.id === id);
const hasProgress = () => ui.deal.events.length > seedPipeline.events.length;
const versionOf = revision => revision - seedPipeline.baseRevision + 1;
const scrollTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));

// Apply an engine result, then save it. If another tab saved first, its state is shown and this action
// is dropped. Engine refusals surface as a message and change nothing.
async function commit(compute) {
  let next;
  try { next = compute(); }
  catch (error) { render(); notify(error.message); return; }
  ui.deal = next;
  ui.saving = true;
  render();
  scrollTop();
  let result;
  try { result = await store.save(next); }
  catch { result = { status: "unsaved" }; }
  finally { ui.saving = false; }
  if (result.status === "conflict") {
    ui.deal = result.deal;
    render();
    notify(`${ADOPTED[result.reason]} Your last click wasn't saved.`);
    return;
  }
  render();
  if (result.status === "unsaved") notify("This browser isn't saving progress, so it may be lost if you reload.");
}

const ADOPTED = {
  "other-tab": "This demo was changed in another tab, so you're seeing the latest version.",
  recovered: "Your saved progress could be loaded again, so it's shown now."
};

// While a save is in flight it does its own conflict check, so don't move the seen version under it.
function syncFromOtherTabs() {
  if (ui.saving) return;
  const update = store.refresh();
  if (!update) return;
  ui.deal = update.deal;
  render();
  notify(ADOPTED[update.reason]);
}

function notify(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.setAttribute("role", "status");
  node.innerHTML = `${icon("info")}<p>${esc(message)}</p>`;
  toastRoot.append(node);
  requestAnimationFrame(() => node.classList.add("show"));
  setTimeout(() => { node.classList.remove("show"); setTimeout(() => node.remove(), 220); }, 5000);
}

// Which screen to show is derived from the saved log, so a reload always lands on the right step.
function screen() {
  if (ui.page === "intro" || ui.page === "history") return ui.page;
  const [first, second] = proposals();
  if (first.state === "pending") return "decide";
  if (first.state === "rejected") return "rejected";
  if (!second) return "update";
  if (second.state === "pending") return "decide-again";
  if (second.state === "rejected") return "rejected-again";
  return "update-again";
}
const STEP = { decide: 1, rejected: 1, update: 2, "decide-again": 3, "rejected-again": 3, "update-again": 4, history: 5 };
const STEP_NAMES = ["You decide", "Update", "She changes her mind", "Update again", "The full story"];

// If anything can't be shown, offer the one action that always works: start over, which also repairs storage.
function render() {
  try {
    app.innerHTML = renderPage();
  } catch {
    app.innerHTML = `<div class="shell"><main class="page"><h1>Something went wrong</h1><p class="lead">Your saved progress can't be shown. Starting over clears it.</p><div class="actions"><button class="primary" data-action="restart">${icon("reset")} Start over</button></div></main></div>`;
  }
}

function renderPage() {
  const current = screen();
  const views = {
    intro: renderIntro,
    decide: () => renderDecision(proposals()[0]),
    rejected: () => renderRejected(false),
    update: () => renderUpdate(false),
    "decide-again": () => renderDecision(proposals()[1]),
    "rejected-again": () => renderRejected(true),
    "update-again": () => renderUpdate(true),
    history: renderHistory
  };
  return `<div class="shell">
    <header class="top">
      <button class="brand" data-go="intro"><span class="mark" aria-hidden="true"></span>Threadline</button>
      ${current === "intro" ? "" : `<button class="text-button" data-action="restart">${icon("reset")} Start over</button>`}
    </header>
    <main class="page">${current === "intro" ? "" : renderSteps(STEP[current])}${views[current]()}</main>
  </div>`;
}

function renderSteps(step) {
  return `<ol class="steps" aria-label="Step ${step} of ${STEP_NAMES.length}">${STEP_NAMES.map((name, index) => {
    const number = index + 1;
    return `<li class="${number < step ? "done" : number === step ? "now" : ""}"${number === step ? ' aria-current="step"' : ""}><span>${number < step ? icon("check") : number}</span><b>${name}</b></li>`;
  }).join("")}</ol><p class="step-caption">Step ${step} of ${STEP_NAMES.length} · ${STEP_NAMES[step - 1]}</p>`;
}

function renderIntro() {
  const resume = hasProgress();
  return `<section class="intro">
    <h1>When a deal changes, what else needs to change?</h1>
    <p class="lead">AI writes forecasts and emails from your CRM. When a fact changes, like a close date, Threadline shows exactly which of those are now out of date, and updates only those.</p>
    <div class="actions">
      <button class="primary" data-go="demo">${resume ? "Continue the demo" : "Start the demo"} ${icon("arrow")}</button>
      ${resume ? `<button class="secondary" data-action="restart">Start over</button>` : ""}
    </div>
    <p class="fine">Takes about two minutes. All names and numbers are made up.</p>
    <ol class="how">
      <li><span>1</span><div><b>The AI suggests a change.</b> It shows you the buyer's exact words.</div></li>
      <li><span>2</span><div><b>You decide.</b> Nothing changes until you approve.</div></li>
      <li><span>3</span><div><b>Only what used it gets updated.</b> You see exactly what changed.</div></li>
    </ol>
  </section>`;
}

function renderDecision(proposal) {
  const reversal = proposal.proposalId === reversalEmail.candidate.proposalId;
  const evidence = source(proposal.payload.sourceIds[0]);
  const { from, to } = proposal.payload;
  const outputs = artifacts();
  const affected = outputs.filter(item => item.used.some(read => read.fieldId === proposal.payload.fieldId));
  const untouched = outputs.filter(item => !affected.includes(item));
  return `<h1>${reversal ? "Two weeks later, the buyer changes her mind" : "The buyer hinted the deal might slip"}</h1>
    <p class="lead">${reversal ? "Maya from Halden Freight emailed:" : "On a call, Maya from Halden Freight said:"}</p>
    <blockquote class="quote">“${esc(evidence.excerpt)}”<cite>${evidence.type === "CALL" ? "Phone call" : "Email"}, ${esc(formatDate(evidence.observedAt))}</cite></blockquote>
    <section class="card">
      <p class="label">The AI suggests changing the close date</p>
      <div class="change"><span class="old">${fmt(from)}</span>${icon("arrow")}<span class="new">${fmt(to)}</span></div>
      ${to.hedge ? `<p class="note">${esc(to.hedge.note)} The note stays attached to the date.</p>` : ""}
    </section>
    <section class="card">
      <p class="label">If you approve</p>
      <ul class="impact">
        ${affected.map(item => `<li class="warn"><b>${esc(item.title)}</b> will be marked out of date</li>`).join("")}
        ${untouched.map(item => `<li class="ok"><b>${esc(item.title)}</b> doesn't use this date, so it stays as it is</li>`).join("")}
      </ul>
      ${reversal ? `<p class="aside">Most CRMs would simply overwrite the date. Threadline keeps both moves, because a deal that moves twice is worth knowing about.</p>` : ""}
    </section>
    <div class="actions">
      <button class="primary" data-action="approve" data-id="${proposal.proposalId}">${icon("check")} Approve</button>
      <button class="secondary" data-action="reject" data-id="${proposal.proposalId}">Reject</button>
    </div>`;
}

function renderRejected(reversal) {
  return `<h1>${reversal ? `You kept the date at ${fmt(closeDate())}` : "You rejected the change"}</h1>
    <p class="lead">${reversal
      ? "The forecast and the email stay as they are. Your decision is saved in the history, next to the earlier one."
      : `The close date stays at ${fmt(closeDate())} and nothing else changed. Your decision is still recorded.`}</p>
    <div class="actions">
      <button class="primary" data-go="history">See the full story ${icon("arrow")}</button>
      ${reversal ? "" : `<button class="secondary" data-action="restart">Start over and approve</button>`}
    </div>`;
}

function renderUpdate(again) {
  const list = artifacts();
  const stale = list.filter(item => item.state === "stale");
  const now = closeDate();
  const old = stale[0]?.used.find(read => read.fieldId === FIELD)?.value;
  const heading = stale.length
    ? `${stale.length === 1 ? "1 thing is" : `${stale.length} things are`} now out of date`
    : "Everything is up to date";
  const lead = stale.length
    ? `They were written when the close date was ${fmt(old)}. Nothing was changed behind your back. Update each one to use ${fmt(now)}.`
    : "Here is exactly what changed. The account brief never used the close date, so it was left alone.";
  const next = stale.length ? "" : again
    ? `<button class="primary" data-go="history">See the full story ${icon("arrow")}</button>`
    : `<button class="primary" data-action="ingest">Next: two weeks later ${icon("arrow")}</button>`;
  return `<h1>${heading}</h1>
    <p class="lead">${lead}</p>
    <div class="outputs">${list.map(item => renderOutput(item, now)).join("")}</div>
    ${next ? `<div class="actions">${next}</div>` : ""}`;
}

function renderOutput(item, now) {
  const stale = item.state === "stale";
  const updated = !stale && Boolean(item.previous);
  const read = item.used.find(entry => entry.fieldId === FIELD);
  const status = stale ? "Out of date" : updated ? "Updated" : read ? "Up to date" : "Not affected";
  const body = updated
    ? `<div class="diff"><p class="label">What changed</p>${diffLines(item.previous.content, item.content).map(line => `<p class="${line.type}"><span aria-hidden="true">${line.type === "added" ? "+" : line.type === "removed" ? "−" : ""}</span>${line.type === "removed" ? "<s>" : ""}${esc(line.text)}${line.type === "removed" ? "</s>" : ""}</p>`).join("")}</div>`
    : `<div class="text">${item.content.map(line => `<p>${esc(line)}</p>`).join("")}</div>`;
  const meta = !read ? "Doesn't use the close date."
    : stale ? `Written with close date ${fmt(read.value)}. It's now ${fmt(now)}.`
    : `Uses close date ${fmt(read.value)}.`;
  return `<article class="output ${stale ? "stale" : updated ? "updated" : "fresh"}">
    <header><h2>${esc(item.title)}</h2><span class="badge">${status}</span></header>
    ${body}
    <p class="meta">${meta}</p>
    ${stale ? `<button class="primary" data-action="rebuild" data-artifact="${item.id}">Update</button>` : ""}
  </article>`;
}

function renderHistory() {
  const history = fieldHistory(ui.deal, FIELD);
  const moves = history.length - 1;
  const rejected = snapshotRevision(ui.deal, getAcceptedState(ui.deal).revision).reviews.filter(review => review.state === "rejected");
  const lead = moves >= 2
    ? `It moved ${moves} times in two weeks. That's worth knowing about, so the forecast says so too.`
    : moves === 1 ? "It moved once, and the forecast and email were updated to match." : "It never moved, so nothing needed updating.";
  return `<h1>The close date's full story</h1>
    <p class="lead">${lead}</p>
    <ol class="timeline">${history.map((entry, index) => {
      const evidence = source(entry.sourceIds[0]);
      return `<li class="${index === history.length - 1 ? "latest" : ""}">
        <p class="when">Version ${versionOf(entry.revision)}${index === history.length - 1 ? " · current" : ""}</p>
        <p class="value">${fmt(entry.value)}</p>
        <p class="who">${entry.observedAt
          ? `Approved by you, from ${evidence?.type === "CALL" ? "a phone call" : "an email"} on ${esc(formatDate(entry.observedAt))}`
          : "Entered by Jordan, the sales rep"}</p>
        ${entry.value.hedge ? `<p class="said">She said: “${esc(entry.value.hedge.quote)}”</p>` : ""}
      </li>`;
    }).join("")}</ol>
    ${rejected.length ? `<section class="card"><p class="label">Changes you rejected</p><ul class="impact">${rejected.map(review => `<li class="ok"><b>${fmt(review.payload.from)} → ${fmt(review.payload.to)}</b> was rejected, so nothing changed</li>`).join("")}</ul></section>` : ""}
    <div class="actions"><button class="secondary" data-action="restart">${icon("reset")} Start over</button></div>`;
}

document.addEventListener("click", event => {
  const go = event.target.closest("[data-go]");
  if (go) { ui.page = go.dataset.go; render(); scrollTop(); return; }
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode || actionNode.disabled || ui.saving) return;
  const { action, id, artifact } = actionNode.dataset;
  if (action === "restart") { ui.page = "demo"; commit(() => deepClone(seedPipeline)); }
  if (action === "approve") commit(() => approveChange(ui.deal, id, "You").deal);
  if (action === "reject") commit(() => rejectChange(ui.deal, id, "You"));
  if (action === "rebuild") commit(() => rebuildOutput(ui.deal, artifact).deal);
  if (action === "ingest") commit(() => ingestTaskOutput(ui.deal, reversalEmail).deal);
});

window.addEventListener("storage", event => { if (event.key === STORAGE_KEY || event.key === null) syncFromOtherTabs(); });
window.addEventListener("pageshow", event => { if (event.persisted) syncFromOtherTabs(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncFromOtherTabs(); });

// Load last: validating a save renders it offscreen, which needs everything above to be defined.
const initial = store.load();
ui.deal = initial.deal;
render();
if (initial.notice) notify(initial.notice);
