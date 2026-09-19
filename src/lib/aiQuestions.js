/**
 * Tries to fetch freshly generated questions from /api/generate-questions
 * (see /api/generate-questions.js). That endpoint only works once the
 * project is deployed with an ANTHROPIC_API_KEY environment variable set —
 * see README.md. If the endpoint is missing, errors, or returns something
 * unusable, this returns null and the caller should fall back to the
 * built-in question bank (src/data/bank.js).
 */
export async function fetchAIQuestions(level, count, categoryIds) {
  try {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, count, categories: categoryIds }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data.questions) || data.questions.length === 0) return null;

    const valid = data.questions.filter(
      (q) =>
        q &&
        typeof q.q === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.correct) &&
        q.correct >= 0 &&
        q.correct <= 3 &&
        categoryIds.includes(q.category)
    );

    if (valid.length === 0) return null;

    return valid.map((q, idx) => ({
      ...q,
      uid: `ai-${level}-${Date.now()}-${idx}`,
    }));
  } catch {
    return null;
  }
}
