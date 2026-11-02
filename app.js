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
    for (const page of ["intro", "demo", "history", "architecture"]) { ui = { ...current, deal, page }; renderPage(); }
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
  if (["intro", "history", "architecture"].includes(ui.page)) return ui.page;
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
    history: renderHistory,
    architecture: renderArchitecture
  };
  const inDemo = !["intro", "architecture"].includes(current);
  return `<div class="shell">
    <header class="top">
      <button class="brand" data-go="intro"><span class="mark" aria-hidden="true"></span>Threadline</button>
      <nav class="nav">
        ${inDemo ? `<button class="text-button" data-action="restart">${icon("reset")} Start over</button>` : `<button class="text-button" data-go="demo">Demo</button>`}
        <button class="text-button ${current === "architecture" ? "active" : ""}" data-go="architecture">How it's built</button>
      </nav>
    </header>
    <main class="page ${current === "intro" ? "wide" : ""}">${inDemo ? renderSteps(STEP[current]) : ""}${views[current]()}</main>
  </div>`;
}

function renderSteps(step) {
  return `<ol class="steps" aria-label="Step ${step} of ${STEP_NAMES.length}">${STEP_NAMES.map((name, index) => {
    const number = index + 1;
    return `<li class="${number < step ? "done" : number === step ? "now" : ""}"${number === step ? ' aria-current="step"' : ""}><span>${number < step ? icon("check") : number}</span><b>${name}</b></li>`;
  }).join("")}</ol><p class="step-caption">Step ${step} of ${STEP_NAMES.length} · ${STEP_NAMES[step - 1]}</p>`;
}

// The landing page explains the whole idea without clicking, using the demo's own seed data.
function renderIntro() {
  const resume = hasProgress();
  const proposal = getCandidateChanges(seedPipeline)[0];
  const evidence = seedPipeline.sources.find(item => item.id === proposal.payload.sourceIds[0]);
  const outputs = getArtifacts(seedPipeline).map(item => ({ title: item.title, affected: item.used.some(read => read.fieldId === FIELD) }));
  return `<section class="hero">
    <p class="eyebrow">A prototype for AI-written CRM work</p>
    <h1>When a deal changes, what else needs to change?</h1>
    <p class="lead">AI now writes forecasts and emails straight from the CRM. When a fact changes, like a close date, those outputs quietly go out of date. Threadline remembers which facts each output used, so it can flag exactly the ones that need updating, and leave everything else alone.</p>
    <div class="actions">
      <button class="primary" data-go="demo">${resume ? "Continue the demo" : "Try the 2-minute demo"} ${icon("arrow")}</button>
      <button class="secondary" data-go="architecture">How it would be built</button>
      ${resume ? `<button class="text-button" data-action="restart">${icon("reset")} Start over</button>` : ""}
    </div>
  </section>

  <section class="glance" aria-label="How it works, at a glance">
    <div class="glance-step">
      <p class="label"><span>1</span> The buyer says</p>
      <blockquote>“${esc(evidence.excerpt)}”</blockquote>
      <p class="small">Phone call, ${esc(formatDate(evidence.observedAt))}</p>
    </div>
    <div class="glance-arrow" aria-hidden="true">${icon("arrow")}</div>
    <div class="glance-step">
      <p class="label"><span>2</span> You approve one change</p>
      <p class="glance-change"><s>${fmt(proposal.payload.from)}</s><b>${fmt(proposal.payload.to)}</b></p>
      <p class="small">Close date. The AI's guess, with her words attached.</p>
    </div>
    <div class="glance-arrow" aria-hidden="true">${icon("arrow")}</div>
    <div class="glance-step">
      <p class="label"><span>3</span> Only what used it is flagged</p>
      <ul class="glance-list">${outputs.map(item => `<li class="${item.affected ? "warn" : "ok"}">${esc(item.title)}<span>${item.affected ? "Out of date" : "Not affected"}</span></li>`).join("")}</ul>
    </div>
  </section>

  <section class="split">
    <div>
      <h2>The problem</h2>
      <ul class="plain">
        <li>AI fills in every CRM field, so a wrong value looks just like a right one.</li>
        <li>A close date that moves doesn't fix the forecast or the email already written from it.</li>
        <li>Overwriting the old value throws away the signal: this deal moved twice.</li>
      </ul>
    </div>
    <div>
      <h2>What Threadline does</h2>
      <ul class="plain check">
        <li>Shows the buyer's exact words next to every suggested change.</li>
        <li>Changes nothing until a person approves.</li>
        <li>Updates only what used the old value, and shows what changed.</li>
        <li>Keeps every version, so reversals stay visible.</li>
      </ul>
    </div>
  </section>

  <section class="closing">
    <p>Built as a working prototype: the logic is real and tested, the data is made up.</p>
    <div class="actions"><button class="primary" data-go="demo">${resume ? "Continue the demo" : "Try the demo"} ${icon("arrow")}</button></div>
  </section>`;
}

const SOURCES = {
  trust: ["How Ahoy treats AI-written fields", "https://ahoy.ai/guides/trust-ai-written-crm-records/"],
  launch: ["Introducing Ahoy", "https://ahoy.ai/blog/introducing-ahoy/"],
  product: ["Ahoy CRM", "https://ahoy.ai/ahoy-crm/"],
  fullstack: ["Fullstack engineer role", "https://ahoy.ai/careers/fullstack-engineer/"],
  frontend: ["Frontend engineer role", "https://ahoy.ai/careers/frontend-engineer/"],
  security: ["Security", "https://ahoy.ai/security/"]
};
const cite = key => `<a class="cite" href="${SOURCES[key][1]}" target="_blank" rel="noopener">${esc(SOURCES[key][0])}</a>`;

function renderArchitecture() {
  const flow = [
    ["Capture", "Emails, calendar events and calls land on the right deal.", "existing", "product"],
    ["Propose", "An agent suggests a field change, with the buyer's exact words and any hedge.", "existing", "trust"],
    ["Approve", "A person approves judgment fields like close date. The approval card also says what will go out of date.", "adds", "trust"],
    ["Save a new version", "The change is added, never written over. Earlier values and their reasons stay.", "adds"],
    ["Find what used it", "One indexed lookup goes from the changed field to every output that read it.", "adds"],
    ["Update", "Drafts are rewritten and reports re-run, each with a diff for review. Anything already sent is never changed; it's flagged instead.", "adds"]
  ];
  const deep = [
    ["Consistency: a change can never land without its flags",
      "Saving the new version and recording “this field changed” happen in one database transaction (a transactional outbox). A background worker reads the outbox and flags dependents. If the worker crashes, it picks up where it left off; nothing is lost and nothing is flagged twice."],
    ["Fan-out: one field can feed hundreds of outputs",
      "Flagging is cheap and instant: one indexed lookup and a status update. Rewriting is expensive, so it is grouped. If five deals change within a couple of minutes, the Q3 forecast is rewritten once, after things settle, not five times."],
    ["Cost: only call the model when it matters",
      "Outputs are rewritten lazily: when someone opens them, or just before they're due to be sent. Each job is keyed by the output and a fingerprint of its inputs, so if the inputs end up unchanged (a change and its reversal), no model call happens. Parts that are just numbers are re-rendered without a model at all."],
    ["Retries: safe to run twice",
      "Because jobs are keyed by output and input fingerprint, a retry after a timeout does the same work and lands the same result. A failed rewrite leaves the output flagged as out of date, never half-updated."],
    ["Many customers on one system",
      "Every row carries a team id, every index starts with it, and model calls have a per-team budget, so one busy team can't slow down another."],
    ["Rough size",
      "A team with 1,000 open deals and about 10 AI outputs per deal, each reading about 10 facts, is roughly 100,000 read rows. That is small for Postgres, and it grows in a straight line with usage."],
    ["Watching it in production",
      "Track how long outputs stay out of date, how many were opened or sent while out of date, rewrite cost per team, and how many outputs have a complete read record. Trace each approval through to the flags and rewrites it caused."]
  ];
  return `<section class="arch">
    <p class="eyebrow">Architecture</p>
    <h1>How it would be built</h1>
    <p class="lead">The demo runs in one browser with made-up data. Here's how the same idea would work inside a real AI CRM: the simple version first, then what it takes to run at scale.</p>

    <div class="callout">
      <p class="label">The idea in one sentence</p>
      <p>Whenever AI writes something, save a list of the facts it read. When a person approves a change to a fact, look up everything that read it.</p>
    </div>

    <section class="section">
      <h2>The system at a glance</h2>
      <figure class="diagram" aria-label="System diagram">
        <div class="lane">
          <div class="box muted"><b>Capture</b><span>Email, calendar, calls</span></div>
          <div class="arrow" aria-hidden="true">${icon("arrow")}</div>
          <div class="box muted"><b>Agent proposes</b><span>New value + exact quote</span></div>
          <div class="arrow" aria-hidden="true">${icon("arrow")}</div>
          <div class="box muted"><b>One-tap approval</b><span>Shows what it will affect</span></div>
        </div>
        <div class="down" aria-hidden="true">${icon("arrow")}</div>
        <div class="box strong wide"><b>Postgres, one transaction</b><span>Add the new field version · write “field changed” to the outbox</span></div>
        <div class="down" aria-hidden="true">${icon("arrow")}</div>
        <div class="box strong wide"><b>Invalidation worker</b><span>Look up every output that read this field, or asked a question it now answers · mark them out of date</span></div>
        <div class="down" aria-hidden="true">${icon("arrow")}</div>
        <div class="box strong wide"><b>Rewrite workers</b><span>Group changes per output · context builder records every read · model writes · diff goes back for review</span></div>
        <figcaption>Grey is what an AI CRM already has. Dark is what Threadline adds.</figcaption>
      </figure>
    </section>

    <section class="section">
      <h2>How a change flows through</h2>
      <p class="sub">Ahoy already describes steps 1 and 2, and the approval itself in step 3, publicly. Threadline adds the rest.</p>
      <ol class="flow">${flow.map(([title, text, kind, source], index) => `<li class="${kind}">
        <span class="num">${index + 1}</span>
        <div><h3>${title} <em>${kind === "existing" ? "Ahoy already does this" : "Threadline adds"}</em></h3><p>${text}</p>${source ? `<p class="small">Source: ${cite(source)}</p>` : ""}</div>
      </li>`).join("")}</ol>
    </section>

    <section class="section">
      <h2>The key piece: record what each output read</h2>
      <p>Every AI output gets its facts from one context builder. That builder also writes down each fact it handed over, with its version, so nothing can use a field without it being recorded. An automated check fails if any generator reads data some other way.</p>
      <div class="table" role="table" aria-label="Example of recorded reads">
        <div class="row head" role="row"><span role="columnheader">Output</span><span role="columnheader">Deal</span><span role="columnheader">Field</span><span role="columnheader">Version read</span></div>
        <div class="row" role="row"><span role="cell">Q3 forecast</span><span role="cell">Halden Freight</span><span role="cell">Close date</span><span role="cell">v1 · 30 Sep</span></div>
        <div class="row" role="row"><span role="cell">Email draft to Maya</span><span role="cell">Halden Freight</span><span role="cell">Close date</span><span role="cell">v1 · 30 Sep</span></div>
        <div class="row" role="row"><span role="cell">Orrin Health brief</span><span role="cell">Orrin Health</span><span role="cell">Main contact</span><span role="cell">v1</span></div>
      </div>
      <p class="small">When the Halden close date moves to v2, the lookup returns the first two rows and nothing else.</p>
      <div class="callout soft">
        <p class="label">The case most designs miss</p>
        <p>A forecast doesn't only read Halden's close date. It reads <b>“every deal closing in Q3”</b>. If another deal moves <i>into</i> Q3, the forecast must update too, even though it never read that deal before. So the context builder also records the question it asked, like “open deals in this pipeline closing in Q3”, and every approved change is checked against those questions as well as against individual reads.</p>
      </div>
    </section>

    <section class="section">
      <h2>What gets stored</h2>
      <div class="cards">
        <div class="card"><h3>Field versions</h3><p>One row per approved change: deal, field, version, value, the quote, any hedge, who approved it and when. Rows are only ever added.</p></div>
        <div class="card"><h3>Reads</h3><p>One row per fact an output used: output, deal, field, version. Indexed by team, deal and field.</p></div>
        <div class="card"><h3>Questions</h3><p>One row per list an output asked for, like “deals closing in Q3”. Checked against every change to the fields it filters on.</p></div>
        <div class="card"><h3>Outputs</h3><p>Each AI-written thing and its status: current, out of date, needs review, or sent with an old value. Earlier versions are kept for the diff.</p></div>
      </div>
    </section>

    <section class="section">
      <h2>What must always be true</h2>
      <ul class="plain check">
        <li>An unapproved suggestion never reaches a forecast, an email or any other output.</li>
        <li>Only outputs that used the changed field, or asked a question it now answers, are flagged.</li>
        <li>A change and its flags are saved together, or not at all.</li>
        <li>If two people approve at once, only one wins. The other is shown the newer version.</li>
        <li>The same email or call, processed twice, creates one suggestion, not two.</li>
        <li>Something already sent is never rewritten.</li>
        <li>History is never overwritten, so a deal that moved twice shows two moves.</li>
      </ul>
      <p class="small">The demo's engine enforces the ones it can in a browser, with 31 automated tests.</p>
    </section>

    <section class="section">
      <h2>Running it at scale</h2>
      <p class="sub">The parts a production system needs. Open any one for detail.</p>
      <div class="details">${deep.map(([title, text]) => `<details><summary>${title}</summary><p>${text}</p></details>`).join("")}</div>
    </section>

    <section class="section">
      <h2>How it fits Ahoy's setup</h2>
      <p class="sub">Based on Ahoy's public pages. If any of this already exists inside Ahoy, this is how I'd approach extending it.</p>
      <ul class="fit">
        <li><b>Same rule for judgment fields.</b> Ahoy holds stage, amount and close date changes for a person, with the evidence attached. Threadline only acts on changes that went through that approval. ${cite("trust")}</li>
        <li><b>Same autonomy and undo.</b> Ahoy lets each team choose how much its agents do alone, and every agent action can be undone. Rewritten drafts follow the same settings: teams that review keep reviewing, teams that auto-approve get updates automatically. ${cite("launch")}</li>
        <li><b>Same stack.</b> The approval card and diff view in TypeScript and React, with streaming and optimistic updates. Rewrites as idempotent background jobs in Python, with evals on rewritten outputs and cost and latency budgets. ${cite("fullstack")} ${cite("frontend")}</li>
        <li><b>Same data rules.</b> Data stays in Ahoy's existing AWS regions, including eu-west-1 in Ireland. No new vendors, a pluggable model provider, nothing trained on customer data. ${cite("security")}</li>
      </ul>
    </section>

    <section class="section">
      <h2>Choices I'd make on purpose</h2>
      <div class="cards two">
        <div class="card"><h3>Field-level reads for judgment fields</h3><p>Precise, so no false alarms on the fields that move money. Elsewhere, record-level reads are cheaper and good enough.</p></div>
        <div class="card"><h3>Recorded, not declared</h3><p>Reads are captured as they happen, not listed by hand per template. Lists by hand go stale; a check enforces that nothing reads around the builder.</p></div>
        <div class="card"><h3>Flag now, rewrite later</h3><p>Flags appear instantly and cost almost nothing. Rewrites wait until someone needs the output, which keeps model cost tied to real use.</p></div>
        <div class="card"><h3>Never touch what was sent</h3><p>A sent email is a fact about the past. It gets flagged “sent with the old date”, with a suggested follow-up, instead of being edited.</p></div>
      </div>
    </section>

    <section class="section">
      <h2>How I'd roll it out</h2>
      <ol class="phases">
        <li><b>Shadow mode.</b> Record reads and work out what would go out of date, without showing anything. Compare it with what reps actually fixed by hand.</li>
        <li><b>Flags.</b> Show "out of date" on the forecast summary when a field it read changes, behind a per-pipeline switch.</li>
        <li><b>Impact before approval.</b> Add "this will affect…" to the approval card for close date changes.</li>
        <li><b>Rewrites with a diff.</b> Regenerate out-of-date drafts and send them back through approval.</li>
      </ol>
      <p>Success looks like this: nearly every output has a complete read record, almost nothing is opened or sent while out of date, and close-date moves become a signal reps actually see.</p>
    </section>

    <section class="section">
      <h2>Questions I'd want answered first</h2>
      <ul class="plain">
        <li>Are forecasts written text, or live numbers? Live numbers can't go stale; written summaries can.</li>
        <li>Do AI outputs get their facts from one place today, or from several?</li>
        <li>For teams on auto-approve, should a rewritten draft go out on its own, or wait?</li>
        <li>Would reps want "this deal moved twice" shown on the deal itself?</li>
      </ul>
    </section>

    <p class="footnote">Independent prototype, not affiliated with Ahoy. Ahoy details come from its public website as of November 2026.</p>
    <div class="actions"><button class="primary" data-go="demo">${hasProgress() ? "Continue the demo" : "Try the demo"} ${icon("arrow")}</button></div>
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
