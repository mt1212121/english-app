import BANK from "./questions.json";

/* ------------------------------------------------------------------ */
/*  LEVEL METADATA                                                      */
/* ------------------------------------------------------------------ */

export const LEVELS = [
  { id: "A1", name: "Beginner", desc: "Basic words and everyday phrases", bars: 1 },
  { id: "A2", name: "Elementary", desc: "Simple grammar and familiar topics", bars: 2 },
  { id: "B1", name: "Intermediate", desc: "Real-life situations and longer texts", bars: 3 },
  { id: "B2", name: "Upper Intermediate", desc: "More complex language and ideas", bars: 4 },
  { id: "C1", name: "Advanced", desc: "Academic and professional English", bars: 5 },
];

export const CATEGORY_META = [
  { id: "grammar", label: "Grammar", desc: "Verb tenses, sentence structure, and word order." },
  { id: "vocabulary", label: "Vocabulary", desc: "Word meanings, synonyms, and everyday usage." },
  { id: "reading", label: "Reading", desc: "Short passages with comprehension questions." },
];

/* ------------------------------------------------------------------ */
/*  QUESTION BANK (fallback / offline pool)                            */
/*  Lives in ./questions.json — plain JSON, not JS — so the admin      */
/*  panel (see AdminScreen + api/add-questions.js) can read, merge,    */
/*  and write it back programmatically without touching any code.      */
/*  Structure: BANK[level][category] = array of question objects       */
/*  { q, options: [4], correct: index, explanation }                   */
/*  Reading questions carry a shared `passage`.                        */
/* ------------------------------------------------------------------ */

export { BANK };

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildLevelPool(level, categoryIds) {
  const pool = [];
  const cats = CATEGORY_META.filter((c) => categoryIds.includes(c.id));
  for (const cat of cats) {
    const items = BANK[level]?.[cat.id] || [];
    items.forEach((item, idx) =>
      pool.push({ ...item, category: cat.id, uid: `${level}-${cat.id}-${idx}` })
    );
  }
  return pool;
}

/**
 * Pick `count` questions for a level/category mix, excluding uids the
 * learner has already seen recently (see lib/storage.js) wherever
 * possible so repeated tests feel fresh. Falls back to reusing the
 * pool (shuffled again) once every question has been seen.
 */
export function pickQuestions(level, count, categoryIds, excludeUids = []) {
  const fullPool = shuffle(buildLevelPool(level, categoryIds));
  const fresh = fullPool.filter((q) => !excludeUids.includes(q.uid));
  const source = fresh.length >= count ? fresh : fullPool;

  if (count <= source.length) return source.slice(0, count);

  // Still not enough unique questions to fill the test: cycle through
  // shuffled copies to reach the requested count.
  const result = [...source];
  while (result.length < count) {
    const extra = shuffle(fullPool);
    for (const q of extra) {
      if (result.length >= count) break;
      result.push({ ...q, uid: `${q.uid}-r${result.length}` });
    }
  }
  return result.slice(0, count);
}

export function estimateLevel(selectedLevel, percentage) {
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const idx = order.indexOf(selectedLevel);
  let shift = 0;
  if (percentage <= 20) shift = -2;
  else if (percentage <= 40) shift = -1;
  else if (percentage <= 70) shift = 0;
  else if (percentage <= 90) shift = 1;
  else shift = 2;
  const clamped = Math.min(order.length - 1, Math.max(0, idx + shift));
  return order[clamped];
}

export function estimateExplanation(selectedLevel, percentage, estLevel) {
  if (estLevel === selectedLevel) {
    return `You scored ${percentage}% on the ${selectedLevel} test, which lines up well with that level — that's why we're keeping the estimate at ${selectedLevel}.`;
  }
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const movedUp = order.indexOf(estLevel) > order.indexOf(selectedLevel);
  return movedUp
    ? `You scored ${percentage}% on the ${selectedLevel} test — high enough that ${selectedLevel} looks too easy for you, so we suggest ${estLevel} instead.`
    : `You scored ${percentage}% on the ${selectedLevel} test — low enough that the fundamentals still need work, so we suggest ${estLevel} rather than nudging you down just one step.`;
}

export function categoryQuestionCounts() {
  const counts = {};
  for (const cat of CATEGORY_META) {
    counts[cat.id] = Object.keys(BANK).reduce((sum, level) => sum + (BANK[level]?.[cat.id]?.length || 0), 0);
  }
  return counts;
}

export function computeScore(questions, answers, hintsUsed = []) {
  let weighted = 0;
  let correctCount = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) {
      correctCount++;
      weighted += hintsUsed[i] ? 0.5 : 1;
    }
  });
  const total = questions.length;
  const pct = total ? Math.round((weighted / total) * 100) : 0;
  return { correctCount, weighted, total, pct };
}

export function levelName(id) {
  return LEVELS.find((l) => l.id === id)?.name || id;
}
