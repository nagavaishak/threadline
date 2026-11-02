// The "How it works" page: an animated flow you can step through and an interactive dependency map.
// Plain HTML and CSS, no libraries; mountArchitecture wires up behaviour after render.

const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

const PATHS = {
  phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  check: '<path d="m5 12 4 4L19 7"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  file: '<path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14-4.5L4 9m0-5v5h5M4 13a8 8 0 0 0 14 4.5L20 15m0 5v-5h-5"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>'
};
const glyph = name => `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;

const FLOW = [
  { icon: "phone", label: "Call", sub: "“probably Q4”", kind: "existing", caption: "On a call, the buyer says the renewal will probably slip to Q4." },
  { icon: "spark", label: "Agent", sub: "proposes 15 Dec", kind: "existing", caption: "An agent proposes a new close date, keeping her exact words and the hedge." },
  { icon: "check", label: "Approval", sub: "one tap", kind: "both", caption: "A person approves. The card already shows what will go out of date." },
  { icon: "db", label: "Database", sub: "saves v2", kind: "adds", caption: "The new version and a “field changed” note are saved together, so neither can be lost." },
  { icon: "search", label: "Worker", sub: "who was given it?", kind: "adds", caption: "A worker finds every output given the close date, or with a list the deal joined or left." },
  { icon: "file", label: "Outputs", sub: "2 flagged", kind: "adds", caption: "The forecast and the email are flagged. The account brief is left alone." },
  { icon: "refresh", label: "Rewrite", sub: "checked · diff", kind: "adds", caption: "Each is rewritten, published only if its inputs are still current, and sent back with a diff." }
];

const OUTPUTS = [
  { name: "Q3 forecast", reads: ["Halden close date · v1", "List: deals closing in Q3"], close: "Was given this field", leave: "Its list changed: Orrin left Q3" },
  { name: "Email draft to Maya", reads: ["Halden close date · v1", "Maya's role · v1"], close: "Was given this field", leave: null },
  { name: "Orrin Health brief", reads: ["Orrin main contact · v1", "Orrin competitors · v1"], close: null, leave: null }
];

const tag = kind => kind === "existing" ? "On Ahoy's website" : kind === "both" ? "On Ahoy's website, plus new" : "New";

export function renderArchitecture({ resume = false } = {}) {
  return `<section class="arch">
    <p class="eyebrow">How it would work</p>
    <h1>Every AI output remembers what it read.</h1>
    <p class="lead">So when a person approves a change, the system knows exactly what to update, and what to leave alone.</p>

    <section class="arch-block" aria-labelledby="flowTitle">
      <div class="block-head"><h2 id="flowTitle">Watch a change travel</h2><div class="legend"><span class="key existing">On Ahoy's website</span><span class="key adds">New</span></div></div>
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

    <div class="arch-end">
      <p>Independent prototype, not affiliated with Ahoy. Grey steps come from Ahoy's public website; I haven't seen how Ahoy is built inside.</p>
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
