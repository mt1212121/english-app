// Netlify Functions equivalent of api/generate-questions.js (used when
// deploying to Vercel). Netlify uses a different handler signature, so
// this is a separate file with the same logic. netlify.toml redirects
// /api/generate-questions → /.netlify/functions/generate-questions so the
// frontend code (src/lib/aiQuestions.js) doesn't need to know which host
// it's running on.
//
// Requires an ANTHROPIC_API_KEY environment variable set in
// Netlify → Site configuration → Environment variables. Get a key at
// https://console.anthropic.com/. Without it, this function returns an
// error and the frontend automatically falls back to the built-in
// question bank in src/data/bank.js.

const CATEGORY_LABELS = {
  grammar: "grammar",
  vocabulary: "vocabulary",
  reading: "reading comprehension (include a short 2-4 sentence passage)",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server." }),
    };
  }

  try {
    const { level, count, categories } = JSON.parse(event.body || "{}");

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
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Upstream Anthropic API error", detail: errText }),
      };
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return { statusCode: 502, body: JSON.stringify({ error: "No text content returned by the model" }) };
    }

    const cleaned = textBlock.text.trim().replace(/^```json\s*|\s*```$/g, "");
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      return { statusCode: 502, body: JSON.stringify({ error: "Model did not return valid JSON" }) };
    }

    if (!Array.isArray(questions)) {
      return { statusCode: 502, body: JSON.stringify({ error: "Model output was not an array" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ questions }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};
