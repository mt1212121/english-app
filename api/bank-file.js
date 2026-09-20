// Vercel serverless function: GET/POST /api/bank-file
// GET: returns the current src/data/questions.json content, its size, and
//      a per-level question count — no password required, since this same
//      data is already public inside the deployed site's JS bundle.
// POST: fully REPLACES src/data/questions.json with new content. Requires
//      the admin password. Body: { password, content: <JSON string> }
//
// Requires the same environment variables as api/add-questions.js:
// GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, ADMIN_PASSWORD.

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

export default async function handler(req, res) {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: "Server is missing GITHUB_TOKEN or GITHUB_REPO environment variables." });
    return;
  }
  const branch = GITHUB_BRANCH || "main";

  if (req.method === "GET") {
    try {
      const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
      if (!getRes.ok) {
        res.status(502).json({ error: "Could not read questions.json from GitHub", detail: await getRes.text() });
        return;
      }
      const fileData = await getRes.json();
      const raw = Buffer.from(fileData.content, "base64").toString("utf8");
      const bank = JSON.parse(raw);
      const { counts, total } = countQuestions(bank);
      res.status(200).json({ content: raw, sizeBytes: fileData.size, total, counts });
    } catch (err) {
      res.status(500).json({ error: "Server error", detail: String(err) });
    }
    return;
  }

  if (req.method === "POST") {
    const { ADMIN_PASSWORD } = process.env;
    if (!ADMIN_PASSWORD) {
      res.status(500).json({ error: "Server is missing ADMIN_PASSWORD environment variable." });
      return;
    }
    const { password, content } = req.body || {};
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Wrong password" });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      res.status(400).json({ error: `Not valid JSON: ${e.message}` });
      return;
    }
    const shapeError = validateBankShape(parsed);
    if (shapeError) {
      res.status(400).json({ error: shapeError });
      return;
    }
    try {
      const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
      if (!getRes.ok) {
        res.status(502).json({ error: "Could not read current file (needed to update it)", detail: await getRes.text() });
        return;
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
        res.status(502).json({ error: "Could not commit the updated file to GitHub", detail: await putRes.text() });
        return;
      }
      const { counts, total } = countQuestions(parsed);
      res.status(200).json({ ok: true, total, counts, note: "Committed to GitHub. Your host will auto-deploy this in about a minute." });
    } catch (err) {
      res.status(500).json({ error: "Server error", detail: String(err) });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
