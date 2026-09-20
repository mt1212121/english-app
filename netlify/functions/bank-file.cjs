// Netlify Functions equivalent of api/bank-file.js (used on Vercel).
// Same logic, different handler signature — see that file's header comment.

const VALID_LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const VALID_CATEGORIES = ["grammar", "vocabulary", "reading"];
const DATA_PATH = "src/data/questions.json";

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

function countQuestions(bank) {
  const counts = {};
  let total = 0;
  for (const level of VALID_LEVELS) {
    const cats = bank[level] || {};
    const n = VALID_CATEGORIES.reduce((sum, c) => sum + (Array.isArray(cats[c]) ? cats[c].length : 0), 0);
    counts[level] = n;
    total += n;
  }
  return { counts, total };
}

function validateBankShape(bank) {
  if (!bank || typeof bank !== "object" || Array.isArray(bank)) return "Root must be a JSON object keyed by level.";
  for (const level of Object.keys(bank)) {
    if (!VALID_LEVELS.includes(level)) return `Unknown level "${level}" — must be one of ${VALID_LEVELS.join(", ")}.`;
    const cats = bank[level];
    if (!cats || typeof cats !== "object") return `Level "${level}" must be an object of categories.`;
    for (const cat of Object.keys(cats)) {
      if (!VALID_CATEGORIES.includes(cat)) return `Unknown category "${cat}" under "${level}".`;
      if (!Array.isArray(cats[cat])) return `"${level}.${cat}" must be an array of questions.`;
      for (const [i, q] of cats[cat].entries()) {
        if (!q || typeof q.q !== "string" || !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.correct)) {
          return `Invalid question at ${level}.${cat}[${i}] — check it has q, options (4), and correct.`;
        }
      }
    }
  }
  return null;
}

exports.handler = async (event) => {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, ADMIN_PASSWORD } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server is missing GITHUB_TOKEN or GITHUB_REPO environment variables." }) };
  }
  const branch = GITHUB_BRANCH || "main";

  if (event.httpMethod === "GET") {
    try {
      const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
      if (!getRes.ok) {
        return { statusCode: 502, body: JSON.stringify({ error: "Could not read questions.json from GitHub", detail: await getRes.text() }) };
      }
      const fileData = await getRes.json();
      const raw = Buffer.from(fileData.content, "base64").toString("utf8");
      const bank = JSON.parse(raw);
      const { counts, total } = countQuestions(bank);
      return { statusCode: 200, body: JSON.stringify({ content: raw, sizeBytes: fileData.size, total, counts }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
    }
  }

  if (event.httpMethod === "POST") {
    if (!ADMIN_PASSWORD) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server is missing ADMIN_PASSWORD environment variable." }) };
    }
    const { password, content } = JSON.parse(event.body || "{}");
    if (password !== ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: "Wrong password" }) };
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: `Not valid JSON: ${e.message}` }) };
    }
    const shapeError = validateBankShape(parsed);
    if (shapeError) {
      return { statusCode: 400, body: JSON.stringify({ error: shapeError }) };
    }
    try {
      const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
      if (!getRes.ok) {
        return { statusCode: 502, body: JSON.stringify({ error: "Could not read current file (needed to update it)", detail: await getRes.text() }) };
      }
      const fileData = await getRes.json();
      const newContent = Buffer.from(JSON.stringify(parsed, null, 2), "utf8").toString("base64");
      const putRes = await githubRequest(`contents/${DATA_PATH}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Replace question bank via admin panel",
          content: newContent,
          sha: fileData.sha,
          branch,
        }),
      });
      if (!putRes.ok) {
        return { statusCode: 502, body: JSON.stringify({ error: "Could not commit the updated file to GitHub", detail: await putRes.text() }) };
      }
      const { counts, total } = countQuestions(parsed);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, total, counts, note: "Committed to GitHub. Your host will auto-deploy this in about a minute." }),
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
};
