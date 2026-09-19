// Vercel serverless function: POST /api/generate-questions
// Body: { level: "A1"|"A2"|"B1"|"B2"|"C1", count: number, categories: string[] }
// Returns: { questions: [{ q, options:[4], correct, explanation, category, passage? }] }
//
// Requires an ANTHROPIC_API_KEY environment variable set on your hosting
// provider (Vercel → Project → Settings → Environment Variables). Get a key
// at https://console.anthropic.com/. Without a key, this endpoint returns a
// 500 and the frontend automatically falls back to the built-in question
// bank in src/data/bank.js — the app still works, it just won't be able to
// generate brand-new questions beyond that fixed pool.

const CATEGORY_LABELS = {
  grammar: "grammar",
  vocabulary: "vocabulary",
  reading: "reading comprehension (include a short 2-4 sentence passage)",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  try {
    const { level, count, categories } = req.body || {};

    const validLevels = ["A1", "A2", "B1", "B2", "C1"];
    const validCategories = ["grammar", "vocabulary", "reading"];

    const safeLevel = validLevels.includes(level) ? level : "B1";
    const safeCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);
    const safeCategories = Array.isArray(categories) && categories.length
      ? categories.filter((c) => validCategories.includes(c))
      : validCategories;

    const categoryList = safeCategories.map((c) => CATEGORY_LABELS[c]).join(", ");

    const prompt = `Generate exactly ${safeCount} unique multiple-choice English-learning test questions for a CEFR ${safeLevel} level learner.

Mix these categories evenly: ${categoryList}.

Return ONLY a raw JSON array (no markdown fences, no commentary) where each item has this exact shape:
{
  "category": "grammar" | "vocabulary" | "reading",
  "passage": "a short 2-4 sentence passage — ONLY include this field for reading questions, omit it otherwise",
  "q": "the question text",
  "options": ["optionA", "optionB", "optionC", "optionD"],
  "correct": 0,
  "explanation": "one short sentence explaining why the correct answer is right"
}

Rules:
- "correct" is the zero-based index into "options" of the right answer.
- Exactly 4 options per question, all plausible, only one correct.
- Difficulty must genuinely match CEFR ${safeLevel}.
- Do not repeat the same question twice in the array.
- Output nothing except the JSON array itself.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "Upstream Anthropic API error", detail: errText });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      res.status(502).json({ error: "No text content returned by the model" });
      return;
    }

    const cleaned = textBlock.text.trim().replace(/^```json\s*|\s*```$/g, "");
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      res.status(502).json({ error: "Model did not return valid JSON" });
      return;
    }

    if (!Array.isArray(questions)) {
      res.status(502).json({ error: "Model output was not an array" });
      return;
    }

    res.status(200).json({ questions });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
};
