// The "How it's built" page: an animated flow you can step through, an interactive dependency map,
// and short tiles. Plain HTML and CSS, no libraries; mountArchitecture wires up behaviour after render.

const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

const PATHS = {
  phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  check: '<path d="m5 12 4 4L19 7"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  file: '<path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L4 9m0-5v5h5M4 13a8 8 0 0 0 14 4.5L20 15m0 5v-5h-5"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  archive: '<path d="M3 5h18v4H3zM5 9v11h14V9M10 13h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.8-5.5-3"/>',
  sync: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0M12 18l4-6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  undo: '<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>'
};
const glyph = name => `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;

const SOURCES = {
  trust: ["How Ahoy treats AI-written fields", "https://ahoy.ai/guides/trust-ai-written-crm-records/"],
  launch: ["Introducing Ahoy", "https://ahoy.ai/blog/introducing-ahoy/"],
  fullstack: ["Fullstack role", "https://ahoy.ai/careers/fullstack-engineer/"],
  frontend: ["Frontend role", "https://ahoy.ai/careers/frontend-engineer/"],
  security: ["Security", "https://ahoy.ai/security/"]
};
const cite = key => `<a class="cite" href="${SOURCES[key][1]}" target="_blank" rel="noopener">${esc(SOURCES[key][0])} ↗</a>`;

const FLOW = [
  { icon: "phone", label: "Call", sub: "“probably Q4”", kind: "existing", caption: "On a call, the buyer says the renewal will probably slip to Q4." },
  { icon: "spark", label: "Agent", sub: "proposes 15 Dec", kind: "existing", caption: "An agent proposes a new close date, keeping her exact words and the hedge." },
  { icon: "check", label: "Approval", sub: "one tap", kind: "both", caption: "A person approves. The card already shows what will go out of date." },
  { icon: "db", label: "Postgres", sub: "v2 + outbox", kind: "adds", caption: "The new version and a “field changed” note are saved in one transaction." },
  { icon: "search", label: "Worker", sub: "who was given it?", kind: "adds", caption: "A worker finds every output given the close date, or with a list the deal joined or left." },
  { icon: "file", label: "Outputs", sub: "2 flagged", kind: "adds", caption: "The forecast and the email are flagged. The account brief is left alone." },
  { icon: "refresh", label: "Rewrite", sub: "checked · diff", kind: "adds", caption: "Each is rewritten, published only if its inputs are still current, and sent back with a diff." }
];

const OUTPUTS = [
  { name: "Q3 forecast", reads: ["Halden close date · v1", "List: deals closing in Q3"], close: "Was given this field", leave: "Its list changed: Orrin left Q3" },
  { name: "Email draft to Maya", reads: ["Halden close date · v1", "Maya's role · v1"], close: "Was given this field", leave: null },
  { name: "Orrin Health brief", reads: ["Orrin main contact · v1", "Orrin competitors · v1"], close: null, leave: null }
];

const RULES = [
  ["shield", "Unapproved suggestions never reach an output."],
  ["bell", "Every approved change gets flagged on everything given it."],
  ["clock", "A rewrite goes live only if its inputs are still current."],
  ["lock", "Two approvals at once: exactly one wins."],
  ["archive", "Sent stays sent. History is never overwritten."]
];

const SCALE = [
  ["layers", "No change left unflagged", "The new version and a “field changed” note share one transaction. A worker flags dependents and retries until done; flagging twice is harmless. Until then, anything about to be shown or sent re-checks its inputs."],
  ["clock", "Only fresh rewrites go live", "Each rewrite records the exact versions it used. If any changed while it ran, including list membership, it's kept as an older draft and a new one is queued."],
  ["coins", "Cost tied to real use", "Flags are cheap and immediate; rewrites are grouped per output with a maximum wait, and run when someone opens the output or before it's sent. Identical full context (facts, history, permissions, prompt) reuses the last result."],
  ["refresh", "Retries that can't double-publish", "Model output varies, so the first completed result for a job wins and is saved. Retries are capped, failures land in a recovery queue, and the output stays flagged, never half-updated."],
  ["sync", "Sync can't overwrite a decision", "With two-way HubSpot sync, every field has an owner and a source version. A late or echoed update can't replace a value a person approved; conflicts become a review item."],
  ["users", "Edges: lists, merges, permissions", "Lists, calculations, deleted and merged records are tracked like fields, checked against old and new values. Outputs, history and diffs show only to people allowed to see every fact inside. Older outputs show “freshness unknown”."],
  ["gauge", "Measured, not assumed", "Evals check rewrites use the new value, keep the hedge, invent nothing and leave other text alone, run several times per case. Dashboards track time out of date, stale sends, unnecessary flags, queue age and cost per useful rewrite."],
  ["db", "Small and multi-tenant", "Roughly 100,000 read rows for a team with 1,000 open deals, before history and indexes. Every row and index starts with a team id, with per-team limits on workers, queue share and model spend."]
];

const FIT = [
  ["shield", "Same rule for judgment fields", "Only changes a person approved, with evidence, trigger anything.", "trust"],
  ["undo", "Same autonomy and undo", "Rewrites follow each team's autonomy setting and can be undone.", "launch"],
  ["code", "Same stack", "TypeScript and React for approval and diff views; Python workers for idempotent rewrites, with evals.", "fullstack"],
  ["globe", "Same data rules", "Stays in existing AWS regions, including eu-west-1. No new vendors; nothing trained on customer data.", "security"]
];

const ROLLOUT = [
  ["Shadow", "Record reads for the forecast and one email draft. Show nothing; compare with what reps fixed by hand."],
  ["Flags", "“Out of date” badges on the forecast, behind a per-pipeline switch."],
  ["Impact", "“This will affect…” on the close date approval card."],
  ["Rewrites", "Regenerate with a diff, back through approval, with spend capped."]
];

const FAQ = [
  ["Why not just regenerate everything?", "Selective updates save reviewers' attention and model spend. Shadow mode measures that saving against the cost of tracking before anything ships."],
  ["What if the field changes again mid-rewrite?", "The rewrite sees its inputs are no longer current and is kept as an older draft. A fresh one is queued. A stale result is never shown as current."],
  ["How do you know the read records are complete?", "Generators can only get data through the context builder, lists are recorded as questions, and tests include deliberately missed reads to prove they're caught."],
  ["Does approving the date make the new email correct?", "No. Approval covers the fact and its evidence, not the prose. Rewrites go through evals and the team's normal review settings."],
  ["What has the prototype actually proved?", "Dependency tracking, selective flags and full history, deterministically, in one browser. Not distributed consistency, model quality or real concurrency; that's what shadow mode is for."]
];

const ASK = [
  "Are forecasts written text, or live numbers? Only written text can go stale.",
  "Do AI outputs get their facts from one place today, or several?",
  "On auto-approve, should a rewritten draft go out on its own?",
  "Would reps want “this deal moved twice” on the deal itself?"
];

const tag = kind => kind === "existing" ? "Ahoy today" : kind === "both" ? "Ahoy + Threadline" : "Threadline";

export function renderArchitecture({ resume = false } = {}) {
  return `<section class="arch">
    <p class="eyebrow">How it's built</p>
    <h1>Every AI output remembers what it read.</h1>
    <p class="lead">So when a person approves a change, the system knows exactly what to update, and what to leave alone.</p>

    <section class="arch-block" aria-labelledby="flowTitle">
      <div class="block-head"><h2 id="flowTitle">Watch a change travel</h2><div class="legend"><span class="key existing">Ahoy today</span><span class="key adds">Threadline adds</span></div></div>
      <div class="flowchart" data-flow>
        <ol class="flow-track">${FLOW.map((step, index) => `<li class="flow-node ${step.kind}" data-node="${index}">
          <span class="node-icon">${glyph(step.icon)}</span>
          <b>${esc(step.label)}</b>
          <small>${esc(step.sub)}</small>
          ${index < FLOW.length - 1 ? '<i class="flow-wire" aria-hidden="true"><span></span></i>' : ""}
        </li>`).join("")}</ol>
        <div class="flow-outputs" data-flow-outputs aria-hidden="true">
          <span class="mini warn" data-mini="0">Q3 forecast</span>
          <span class="mini warn" data-mini="1">Email draft to Maya</span>
          <span class="mini ok">Orrin Health brief · untouched</span>
        </div>
        <div class="flow-foot">
          <p class="flow-caption" aria-live="polite"><span data-flow-count>Step 1 of ${FLOW.length}</span><b data-flow-caption>${esc(FLOW[0].caption)}</b><em data-flow-tag>${tag(FLOW[0].kind)}</em></p>
          <div class="flow-controls">
            <button class="round" data-flow-go="-1" aria-label="Previous step">${glyph("back")}</button>
            <button class="round play" data-flow-play aria-label="Play from the start">${glyph("play")}</button>
            <button class="round" data-flow-go="1" aria-label="Next step">${glyph("next")}</button>
          </div>
        </div>
      </div>
    </section>

    <section class="arch-block" aria-labelledby="mapTitle">
      <div class="block-head"><h2 id="mapTitle">Try it: what goes out of date?</h2></div>
      <p class="sub">Every output keeps a list of what it was given, including lists like “deals closing in Q3”. Pick a change.</p>
      <div class="scenario" role="group" aria-label="Choose a change">
        <button class="chip on" data-scenario="close">Halden's close date moves</button>
        <button class="chip" data-scenario="leave">Orrin moves out of Q3</button>
      </div>
      <div class="depmap" data-depmap data-active="close">${OUTPUTS.map((output, index) => `<article class="dep" data-dep="${index}" data-close="${output.close ? "hit" : "miss"}" data-leave="${output.leave ? "hit" : "miss"}">
        <header><h3>${esc(output.name)}</h3><span class="dep-badge"><span class="hit-text">Out of date</span><span class="miss-text">Untouched</span></span></header>
        <ul>${output.reads.map(read => `<li>${esc(read)}</li>`).join("")}</ul>
        <p class="why" data-why-close>${esc(output.close || "Never given this field")}</p>
        <p class="why" data-why-leave>${esc(output.leave || "Doesn't use Orrin's close date or the Q3 list")}</p>
      </article>`).join("")}</div>
      <p class="note-line">The second case is the one most designs miss: the forecast never read Orrin's date directly, but the list it used just changed.</p>
    </section>

    <section class="arch-block">
      <div class="block-head"><h2>Five rules that always hold</h2></div>
      <div class="rules">${RULES.map(([icon, text]) => `<div class="rule">${glyph(icon)}<p>${esc(text)}</p></div>`).join("")}</div>
    </section>

    <section class="arch-block">
      <div class="block-head"><h2>Built to run at scale</h2></div>
      <p class="sub">Tap any tile for the detail.</p>
      <div class="tiles">${SCALE.map(([icon, title, text]) => `<details class="tile"><summary>${glyph(icon)}<b>${esc(title)}</b></summary><p>${esc(text)}</p></details>`).join("")}</div>
    </section>

    <section class="arch-block">
      <div class="block-head"><h2>Fits how Ahoy already works</h2></div>
      <p class="sub">From Ahoy's public pages. Where something already exists inside, this is how I'd extend it.</p>
      <div class="fit-grid">${FIT.map(([icon, title, text, source]) => `<div class="fit-card">${glyph(icon)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${cite(source)}</div>`).join("")}</div>
    </section>

    <section class="arch-block">
      <div class="block-head"><h2>Rollout, one safe step at a time</h2></div>
      <ol class="timeline-h">${ROLLOUT.map(([title, text], index) => `<li><span>${index + 1}</span><b>${esc(title)}</b><p>${esc(text)}</p></li>`).join("")}</ol>
    </section>

    <section class="arch-block two-col">
      <div>
        <div class="block-head"><h2>Questions you'd likely ask</h2></div>
        <div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      </div>
      <div>
        <div class="block-head"><h2>What I'd ask the team</h2></div>
        <ul class="asks">${ASK.map(text => `<li>${esc(text)}</li>`).join("")}</ul>
      </div>
    </section>

    <div class="arch-end">
      <p>Independent prototype, not affiliated with Ahoy. Ahoy details are from its public website, November 2026.</p>
      <button class="primary" data-go="demo">${resume ? "Continue the demo" : "Try the demo"} →</button>
    </div>
  </section>`;
}

let timer = null;
let observer = null;

export function unmountArchitecture() {
  clearInterval(timer);
  timer = null;
  observer?.disconnect();
  observer = null;
}

export function mountArchitecture(root) {
  unmountArchitecture();
  const flow = root.querySelector("[data-flow]");
  if (!flow) return;
  const nodes = [...flow.querySelectorAll("[data-node]")];
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let step = 0;

  const show = next => {
    step = Math.max(0, Math.min(FLOW.length - 1, next));
    nodes.forEach((node, index) => {
      node.classList.toggle("done", index < step);
      node.classList.toggle("active", index === step);
    });
    flow.querySelector("[data-flow-count]").textContent = `Step ${step + 1} of ${FLOW.length}`;
    flow.querySelector("[data-flow-caption]").textContent = FLOW[step].caption;
    const tagNode = flow.querySelector("[data-flow-tag]");
    tagNode.textContent = tag(FLOW[step].kind);
    tagNode.className = FLOW[step].kind;
    flow.dataset.stage = step >= 6 ? "rewritten" : step >= 5 ? "flagged" : "before";
    flow.querySelector('[data-flow-go="-1"]').disabled = step === 0;
    flow.querySelector('[data-flow-go="1"]').disabled = step === FLOW.length - 1;
  };
  const stop = () => { clearInterval(timer); timer = null; flow.classList.remove("playing"); };
  const play = () => {
    stop();
    if (reduced) { show(FLOW.length - 1); return; }
    show(0);
    flow.classList.add("playing");
    timer = setInterval(() => { if (step >= FLOW.length - 1) stop(); else show(step + 1); }, 1700);
  };

  flow.addEventListener("click", event => {
    const go = event.target.closest("[data-flow-go]");
    if (go) { stop(); show(step + Number(go.dataset.flowGo)); }
    if (event.target.closest("[data-flow-play]")) play();
  });
  root.querySelector("[data-depmap]")?.closest(".arch-block").addEventListener("click", event => {
    const chip = event.target.closest("[data-scenario]");
    if (!chip) return;
    root.querySelectorAll("[data-scenario]").forEach(item => item.classList.toggle("on", item === chip));
    root.querySelector("[data-depmap]").dataset.active = chip.dataset.scenario;
  });

  show(0);
  if (reduced || !("IntersectionObserver" in window)) { show(FLOW.length - 1); return; }
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); observer = null; play(); }
  }, { threshold: 0.4 });
  observer.observe(flow);
}
