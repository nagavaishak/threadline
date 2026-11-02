// Saved progress shared by every tab of the walkthrough.
// Storage holds { schema, version, deal }; every write gets a fresh version. Three rules:
//   1. Adopt storage only when it holds a valid save this tab hasn't seen (another tab saved it), or when
//      this tab couldn't read storage at load and now can (recovered).
//   2. Empty or invalid storage is never adopted; the next save repairs it with this tab's state.
//   3. When storage can't be read, nothing is written and nothing is adopted.
// The check and the write run inside a cross-tab lock when the browser grants one.

const randomVersion = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function createStore({ storage, key, schema, seed, isValid = () => true, legacyKeys = [], lock = run => run(), lockTimeoutMs = 3000, newVersion = randomVersion }) {
  let seen = { known: false, version: null };
  const fresh = () => JSON.parse(JSON.stringify(seed));

  function read() {
    let raw;
    try { raw = storage.getItem(key); } catch { return { status: "unavailable" }; }
    if (raw == null) return { status: "empty" };
    try {
      const parsed = JSON.parse(raw);
      const valid = parsed?.schema === schema && typeof parsed.version === "string" && isValid(parsed.deal);
      return valid ? { status: "ok", version: parsed.version, deal: parsed.deal } : { status: "invalid" };
    } catch { return { status: "invalid" }; }
  }

  // Rule 1: what, if anything, this tab should adopt from what storage holds now.
  function unseen(current) {
    if (current.status !== "ok") return null;
    if (!seen.known) return { reason: "recovered", version: current.version, deal: current.deal };
    if (current.version !== seen.version) return { reason: "other-tab", version: current.version, deal: current.deal };
    return null;
  }

  function load() {
    const current = read();
    seen = current.status === "unavailable" ? { known: false, version: null } : { known: true, version: current.status === "ok" ? current.version : null };
    let notice;
    if (current.status === "invalid") notice = "Saved progress couldn't be read, so the walkthrough starts fresh.";
    if (current.status === "unavailable") notice = "This browser isn't allowing saved progress right now, so changes here may not be kept.";
    for (const legacy of legacyKeys) {
      try {
        if (storage.getItem(legacy) == null) continue;
        storage.removeItem(legacy);
        if (current.status !== "ok") notice ??= "Saved progress was from an older version, so the walkthrough starts fresh.";
      } catch { /* reported by the main read above */ }
    }
    return { deal: current.status === "ok" ? current.deal : fresh(), notice };
  }

  function saveNow(deal) {
    const current = read();
    if (current.status === "unavailable") return { status: "unsaved" };
    const other = unseen(current);
    if (other) { seen = { known: true, version: other.version }; return { status: "conflict", reason: other.reason, deal: other.deal }; }
    const version = newVersion();
    try { storage.setItem(key, JSON.stringify({ schema, version, deal })); }
    catch { return { status: "unsaved" }; }
    seen = { known: true, version };
    return { status: "saved", repaired: current.status === "invalid" };
  }

  return {
    load,
    // If the lock is refused or not granted in time, save once without it. The attempt runs at most once:
    // a lock granted after the timeout finds it abandoned and does nothing.
    async save(deal) {
      let attempt = "waiting";
      const run = () => {
        if (attempt === "abandoned") return null;
        attempt = "ran";
        return saveNow(deal);
      };
      let timer;
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("lock timeout")), lockTimeoutMs); });
      try { return await Promise.race([Promise.resolve(lock(run)), timeout]); }
      catch {
        if (attempt === "ran") return { status: "unsaved" };
        attempt = "abandoned";
        return saveNow(deal);
      }
      finally { clearTimeout(timer); }
    },
    // On storage events and when the tab becomes visible again (e.g. after the back/forward cache).
    refresh() {
      const other = unseen(read());
      if (!other) return null;
      seen = { known: true, version: other.version };
      return { reason: other.reason, deal: other.deal };
    }
  };
}
