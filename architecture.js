// The "How I'd build it" page: the stack, the tables that matter, and the phases.
// Plain HTML and CSS, no libraries. These are proposed choices, not a claim about Ahoy's stack.

const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

const PATHS = {
  screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  api: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  queue: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  worker: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  check: '<path d="m5 12 4 4L19 7"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0M12 18l4-6"/>',
  back: '<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>'
};
const glyph = name => `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`;

const STACK = [
  ["screen", "Screens", "React + TypeScript", "The approval card and the before/after diff."],
  ["api", "API", "Python + FastAPI", "One place approves a change, so two people can't both win."],
  ["db", "Database", "Postgres on Amazon RDS", "Field history, what each output read, and the “changed” note, saved in one go."],
  ["queue", "Queue", "Amazon SQS + dead-letter queue", "Hands work to the workers. A failed job is parked, never lost."],
  ["worker", "Workers", "Python on ECS Fargate", "Find what's out of date, rewrite it, re-check its inputs before it's accepted."],
  ["spark", "AI model", "Claude on Amazon Bedrock", "Stays inside AWS. Model and prompt versions are pinned."]
];

const ALONGSIDE = [
  ["check", "Checks", "pytest evals", "Did the rewrite use the new date, keep “probably”, and invent nothing?"],
  ["gauge", "Monitoring", "OpenTelemetry → CloudWatch", "Follow one change from approval to rewrite. Track lag and cost; never log customer text."]
];

const TABLES = [
  ["field_versions", "Every value a field has had, including reversals. Never overwritten.", ["record_id", "field", "version", "value", "evidence"]],
  ["proposals", "What an agent suggested, and which version it expected to change.", ["field", "expected_version", "value", "decision"]],
  ["output_reads", "What each output was given: a field version, or a list and who was on it.", ["output_id", "field + version", "list + members"]],
  ["output_versions", "Every version of a forecast or email, so each diff is exact.", ["output_id", "version", "content", "prompt_version"]],
  ["outbox", "The “field changed” note, saved with the change, then sent to the queue.", ["event_id", "payload", "dedupe_key", "sent_at"]]
];

const PHASES = [
  [2, "Weeks 1–2", "Approvals that can't be lost", "History on the server, one-winner approvals, safe retries, reversals.", "No lost or doubled approval across reloads, retries and two tabs."],
  [3, "Weeks 3–5", "Flag exactly the right outputs", "Record what each output read, including lists like “closing in Q3”.", "Flags match a labelled test set 100%, untouched outputs included."],
  [3, "Weeks 6–8", "Rewrites a person reviews", "Queued rewrites with a diff. Inputs re-checked before one is accepted.", "95 of 100 sample rewrites accepted with no fact fixed."],
  [2, "Weeks 9–10", "Small pilot", "One team. Alerts, recovery tools and spend caps.", "Two weeks with nothing out of date accepted or sent."]
];

const NOT_YET = ["Sending on its own", "Editing sent emails", "Tracking any query", "A graph database", "New sync"];

export function renderArchitecture({ resume = false } = {}) {
  return `<section class="arch">
    <p class="eyebrow">How I'd build it</p>
    <h1>Boring tools. One hard idea.</h1>
    <p class="lead">Everything here is standard AWS, TypeScript and Python. The only new part is that every AI output keeps a record of what it read.</p>

    <section class="arch-block" aria-labelledby="stackTitle">
      <div class="block-head"><h2 id="stackTitle">What I'd use</h2></div>
      <div class="stack">
        <ol class="stack-path">${STACK.map(([icon, layer, tech, why]) => `<li>
          <span class="node-icon">${glyph(icon)}</span>
          <div><small>${esc(layer)}</small><b>${esc(tech)}</b><p>${esc(why)}</p></div>
        </li>`).join("")}
          <li class="loop"><span class="node-icon">${glyph("back")}</span><div><b>Back to the screen with a diff</b><p>A person accepts or rejects the rewrite.</p></div></li>
        </ol>
        <aside class="stack-side">
          <p class="side-label">Runs alongside</p>
          ${ALONGSIDE.map(([icon, layer, tech, why]) => `<div class="side-card">${glyph(icon)}<small>${esc(layer)}</small><b>${esc(tech)}</b><p>${esc(why)}</p></div>`).join("")}
          <p class="side-label">Not in version 1</p>
          <div class="not-yet">${NOT_YET.map(item => `<span>${esc(item)}</span>`).join("")}</div>
        </aside>
      </div>
    </section>

    <section class="arch-block" aria-labelledby="tablesTitle">
      <div class="block-head"><h2 id="tablesTitle">Five tables that matter</h2></div>
      <p class="sub">Every row also carries a team id, so one team's data never mixes with another's.</p>
      <div class="tables">${TABLES.map(([name, what, columns]) => `<article class="table-card">
        <h3>${esc(name)}</h3>
        <p>${esc(what)}</p>
        <div class="cols">${columns.map(column => `<code>${esc(column)}</code>`).join("")}</div>
      </article>`).join("")}</div>
    </section>

    <section class="arch-block" aria-labelledby="phasesTitle">
      <div class="block-head"><h2 id="phasesTitle">Four phases, about ten weeks</h2></div>
      <p class="sub">Each phase has to pass its check before the next one starts.</p>
      <div class="weeks" aria-hidden="true">${PHASES.map(([span], index) => `<span style="flex:${span}">${index + 1}</span>`).join("")}</div>
      <ol class="phases">${PHASES.map(([, when, title, ships, done], index) => `<li>
        <span class="phase-num">${index + 1}</span>
        <small>${esc(when)}</small>
        <b>${esc(title)}</b>
        <p>${esc(ships)}</p>
        <p class="done">${glyph("check")}<span>${esc(done)}</span></p>
      </li>`).join("")}</ol>
    </section>

    <div class="arch-end">
      <p>Independent prototype, not affiliated with Ahoy. These are my picks; I haven't seen how Ahoy is built inside.</p>
      <button class="primary" data-go="demo">${resume ? "Continue the demo" : "Try the demo"} →</button>
    </div>
  </section>`;
}
