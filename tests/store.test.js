import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../store.js";
import { seedPipeline, deepClone, approveChange, rebuildOutput, isValidDeal } from "../core.js";

const KEY = "threadline-v5";
const SCHEMA = "threadline-store.v1";

class FakeStorage {
  constructor() { this.data = new Map(); this.failReads = false; this.failWrites = false; }
  getItem(key) { if (this.failReads) throw new Error("SecurityError"); return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { if (this.failWrites) throw new Error("QuotaExceededError"); this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

let counter = 0;
const tab = (storage, options = {}) => createStore({ storage, key: KEY, schema: SCHEMA, seed: seedPipeline, isValid: isValidDeal, legacyKeys: ["threadline-v4"], newVersion: () => `v${++counter}`, ...options });
const approved = () => approveChange(deepClone(seedPipeline), "p-close-q4").deal;
const stored = storage => JSON.parse(storage.data.get(KEY));
const put = (storage, deal, version = "x") => storage.setItem(KEY, JSON.stringify({ schema: SCHEMA, version, deal }));

test("a reload restores the saved log", async () => {
  const storage = new FakeStorage();
  const a = tab(storage);
  a.load();
  await a.save(approved());
  const { deal, notice } = tab(storage).load();
  assert.deepEqual(deal, approved());
  assert.equal(notice, undefined);
});

test("a tab that missed another tab's write is refused and gets the newer state", async () => {
  const storage = new FakeStorage();
  const a = tab(storage), b = tab(storage);
  a.load(); b.load();
  assert.equal((await a.save(approved())).status, "saved");
  const result = await b.save(deepClone(seedPipeline));
  assert.deepEqual([result.status, result.reason], ["conflict", "other-tab"]);
  assert.equal(result.deal.events.length, approved().events.length);
  assert.equal(stored(storage).deal.events.length, approved().events.length);
});

test("a restart that brings the log back to the same length is still detected", async () => {
  // Both tabs see the same 8-event log. Tab A restarts and rebuilds a different 8-event log while
  // tab B misses the storage events (e.g. back/forward cache). B's next save must not overwrite A.
  const storage = new FakeStorage();
  const a = tab(storage), b = tab(storage);
  a.load();
  const forecast = rebuildOutput(approved(), "a-forecast").deal;
  const followup = rebuildOutput(approved(), "a-followup").deal;
  assert.equal(forecast.events.length, followup.events.length);
  await a.save(forecast);
  b.load();
  await a.save(deepClone(seedPipeline));
  await a.save(approved());
  assert.equal((await a.save(followup)).status, "saved");
  const result = await b.save(rebuildOutput(forecast, "a-followup").deal);
  assert.equal(result.status, "conflict");
  assert.equal(stored(storage).deal.events.at(-1).payload.artifactId, "a-followup");
});

test("a storage read error mid-session is not mistaken for another tab and never resets the state", async () => {
  const storage = new FakeStorage();
  const a = tab(storage);
  a.load();
  await a.save(approved());
  storage.failReads = true;
  const result = await a.save(rebuildOutput(approved(), "a-forecast").deal);
  assert.equal(result.status, "unsaved");
  assert.equal(result.deal, undefined);
  assert.equal(a.refresh(), null);
  storage.failReads = false;
  assert.equal(a.refresh(), null);
  assert.equal(stored(storage).deal.events.length, approved().events.length);
  assert.equal((await a.save(rebuildOutput(approved(), "a-forecast").deal)).status, "saved");
});

test("a read error at load is reported as recovered, not as another tab, once storage works again", async () => {
  const storage = new FakeStorage();
  const writer = tab(storage);
  writer.load();
  await writer.save(approved());
  storage.failReads = true;
  const a = tab(storage);
  const { deal, notice } = a.load();
  assert.equal(deal.events.length, seedPipeline.events.length);
  assert.match(notice, /isn't allowing saved progress/);
  assert.doesNotMatch(notice, /reset/);
  storage.failReads = false;
  assert.equal(a.refresh().reason, "recovered");
  storage.failReads = true;
  const blocked = tab(storage);
  blocked.load();
  storage.failReads = false;
  const result = await blocked.save(deepClone(seedPipeline));
  assert.deepEqual([result.status, result.reason], ["conflict", "recovered"]);
});

test("a write error is reported as unsaved", async () => {
  const storage = new FakeStorage();
  const a = tab(storage);
  a.load();
  storage.failWrites = true;
  assert.equal((await a.save(approved())).status, "unsaved");
  storage.failWrites = false;
  assert.equal((await a.save(approved())).status, "saved");
});

test("cleared or evicted storage is never adopted; the next save repairs it", async () => {
  const storage = new FakeStorage();
  const a = tab(storage);
  a.load();
  await a.save(approved());
  storage.removeItem(KEY);
  assert.equal(a.refresh(), null);
  const result = await a.save(rebuildOutput(approved(), "a-forecast").deal);
  assert.equal(result.status, "saved");
  assert.equal(stored(storage).deal.events.at(-1).type, "output_rebuilt");
});

test("unreadable or malformed saved data starts fresh, is never adopted, and is repaired on the next save", async () => {
  const shapes = [
    "{not json",
    JSON.stringify({ schema: SCHEMA, version: "x", deal: { schema: seedPipeline.schema, events: [] } }),
    JSON.stringify({ schema: SCHEMA, version: "x", deal: { ...deepClone(seedPipeline), events: [] } }),
    JSON.stringify({ schema: SCHEMA, version: "x", deal: { ...deepClone(seedPipeline), artifacts: [{}] } })
  ];
  for (const bad of shapes) {
    const storage = new FakeStorage();
    storage.setItem(KEY, bad);
    const a = tab(storage);
    const { deal, notice } = a.load();
    assert.equal(deal.events.length, seedPipeline.events.length);
    assert.match(notice, /couldn't be read/);
    const other = tab(storage);
    other.load();
    storage.setItem(KEY, bad);
    assert.equal(other.refresh(), null);
    const result = await a.save(approved());
    assert.deepEqual([result.status, result.repaired], ["saved", true]);
  }
});

test("old-version saves are removed, with a notice only when nothing newer loads", () => {
  const legacy = JSON.stringify({ schema: "threadline.deal-state.v3", events: [] });
  const empty = new FakeStorage();
  empty.setItem("threadline-v4", legacy);
  assert.match(tab(empty).load().notice, /older version/);
  assert.equal(empty.getItem("threadline-v4"), null);
  assert.equal(tab(empty).load().notice, undefined);
  const both = new FakeStorage();
  both.setItem("threadline-v4", legacy);
  put(both, approved());
  const { deal, notice } = tab(both).load();
  assert.equal(notice, undefined);
  assert.equal(deal.events.length, approved().events.length);
});

test("refresh picks up another tab's save once, and nothing otherwise", async () => {
  const storage = new FakeStorage();
  const a = tab(storage), b = tab(storage);
  a.load(); b.load();
  assert.equal(b.refresh(), null);
  await a.save(approved());
  const update = b.refresh();
  assert.deepEqual([update.reason, update.deal.events.length], ["other-tab", approved().events.length]);
  assert.equal(b.refresh(), null);
  assert.equal((await b.save(rebuildOutput(approved(), "a-forecast").deal)).status, "saved");
});

test("every save goes through the lock, and a refused lock still saves", async () => {
  const storage = new FakeStorage();
  let calls = 0;
  const counting = tab(storage, { lock: run => { calls += 1; return run(); } });
  counting.load();
  await counting.save(approved());
  assert.equal(calls, 1);
  const refused = tab(new FakeStorage(), { lock: () => Promise.reject(new Error("SecurityError")) });
  refused.load();
  assert.equal((await refused.save(approved())).status, "saved");
});
