// Netlify Functions equivalent of api/add-questions.js (used on Vercel).
// Same logic, different handler signature — see that file's header comment
// for the full explanation and required environment variables.

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const VALID_CATEGORIES = ["grammar", "vocabulary", "reading"];
const DATA_PATH = "src/data/questions.json";

function validateQuestion(item) {
  if (!item || typeof item !== "object") return "not an object";
  if (!VALID_LEVELS.includes(item.level)) return `invalid level "${item.level}"`;
  if (!VALID_CATEGORIES.includes(item.category)) return `invalid category "${item.category}"`;
  if (typeof item.q !== "string" || !item.q.trim()) return "missing question text (q)";
  if (!Array.isArray(item.options) || item.options.length !== 4) return "options must be an array of exactly 4 strings";
  if (item.options.some((o) => typeof o !== "string" || !o.trim())) return "all 4 options must be non-empty strings";
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) return "correct must be an integer 0-3";
  if (typeof item.explanation !== "string" || !item.explanation.trim()) return "missing explanation";
  if (item.category === "reading" && (typeof item.passage !== "string" || !item.passage.trim())) {
    return "reading questions require a non-empty passage";
  }
  return null;
}

async function githubRequest(path, options = {}) {
  return fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server is missing ADMIN_PASSWORD, GITHUB_TOKEN, or GITHUB_REPO environment variables.",
      }),
    };
  }

  const { password, questions } = JSON.parse(event.body || "{}");

  if (password !== ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: "Wrong password" }) };
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "No questions provided" }) };
  }

  const errors = [];
  const valid = [];
  questions.forEach((item, i) => {
    const err = validateQuestion(item);
    if (err) errors.push(`Item ${i + 1}: ${err}`);
    else valid.push(item);
  });

  if (valid.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "No valid questions in the file", details: errors }) };
  }

  try {
    const branch = GITHUB_BRANCH || "main";

    const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
    if (!getRes.ok) {
      const detail = await getRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Could not read questions.json from GitHub", detail }) };
    }
    const fileData = await getRes.json();
    const currentJson = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf8"));

    let addedCount = 0;
    for (const item of valid) {
      currentJson[item.level] = currentJson[item.level] || {};
      currentJson[item.level][item.category] = currentJson[item.level][item.category] || [];
      const arr = currentJson[item.level][item.category];
      const isDuplicate = arr.some((existing) => existing.q.trim() === item.q.trim());
      if (isDuplicate) continue;

      const entry = {
        q: item.q,
        options: item.options,
        correct: item.correct,
        explanation: item.explanation,
      };
      if (item.category === "reading") entry.passage = item.passage;
      arr.push(entry);
      addedCount++;
    }

    if (addedCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          added: 0,
          skipped: valid.length,
          message: "All submitted questions were exact duplicates of existing ones — nothing added.",
          errors,
        }),
      };
    }

    const newContent = Buffer.from(JSON.stringify(currentJson, null, 2), "utf8").toString("base64");
    const putRes = await githubRequest(`contents/${DATA_PATH}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: `Add ${addedCount} question(s) via admin panel`,
        content: newContent,
        sha: fileData.sha,
        branch,
      }),
    });

    if (!putRes.ok) {
      const detail = await putRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Could not commit the updated question bank to GitHub", detail }) };
    }

    const totals = {};
    for (const level of VALID_LEVELS) {
      const cats = currentJson[level] || {};
      totals[level] = VALID_CATEGORIES.reduce((sum, c) => sum + (cats[c]?.length || 0), 0);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        added: addedCount,
        skippedDuplicates: valid.length - addedCount,
        invalid: errors,
        totals,
        note: "Committed to GitHub. Your host will auto-deploy this in about a minute.",
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};
