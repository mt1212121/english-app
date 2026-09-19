const HISTORY_KEY = "englishTest.history.v1";
const SEEN_KEY = "englishTest.seenUids.v1";

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/* ---------------------------- History ------------------------------ */
/* Each entry: { date, level, categories, score, total, pct } */

export function getHistory() {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(HISTORY_KEY), []);
}

export function addHistoryEntry(entry) {
  if (typeof window === "undefined") return;
  const history = getHistory();
  history.push({ date: new Date().toISOString(), ...entry });
  // Keep the most recent 100 attempts so storage doesn't grow forever.
  const trimmed = history.slice(-100);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

/* ------------------------- Seen questions --------------------------- */
/* Tracked per level so a learner doesn't see the same question twice */
/* in a row before the whole pool for that level has been used.       */

export function getSeenUids(level) {
  if (typeof window === "undefined") return [];
  const all = safeParse(localStorage.getItem(SEEN_KEY), {});
  return all[level] || [];
}

export function addSeenUids(level, uids) {
  if (typeof window === "undefined") return;
  const all = safeParse(localStorage.getItem(SEEN_KEY), {});
  const merged = Array.from(new Set([...(all[level] || []), ...uids]));
  // Cap so this can't grow unbounded if someone takes hundreds of tests.
  all[level] = merged.slice(-300);
  localStorage.setItem(SEEN_KEY, JSON.stringify(all));
}
