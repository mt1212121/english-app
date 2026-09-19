// Vercel serverless function: POST /api/add-questions
// Body: { password: string, questions: Question[] }
// Question shape: { level, category, q, options:[4], correct, explanation, passage? }
//
// This does NOT write to the local filesystem (serverless functions can't
// persist disk writes). Instead it commits the merged question bank
// straight to your GitHub repo's src/data/questions.json using the GitHub
// REST API. Vercel/Netlify auto-deploy on every push to your connected
// branch, so within roughly a minute the new questions are live for every
// visitor — not just saved in your own browser.
//
// Requires these environment variables (Project → Settings → Environment
// Variables):
//   ADMIN_PASSWORD   — a password you choose, required to call this endpoint
//   GITHUB_TOKEN      — a fine-grained GitHub Personal Access Token scoped to
//                       ONLY this repo, with "Contents: Read and write"
//                       permission. Create one at
//                       https://github.com/settings/personal-access-tokens/new
//   GITHUB_REPO       — "your-username/your-repo-name"
//   GITHUB_BRANCH     — the branch Vercel/Netlify deploys from (usually "main")

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
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({
      error: "Server is missing ADMIN_PASSWORD, GITHUB_TOKEN, or GITHUB_REPO environment variables.",
    });
    return;
  }

  const { password, questions } = req.body || {};

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "No questions provided" });
    return;
  }

  const errors = [];
  const valid = [];
  questions.forEach((item, i) => {
    const err = validateQuestion(item);
    if (err) errors.push(`Item ${i + 1}: ${err}`);
    else valid.push(item);
  });

  if (valid.length === 0) {
    res.status(400).json({ error: "No valid questions in the file", details: errors });
    return;
  }

  try {
    const branch = GITHUB_BRANCH || "main";

    // 1. Fetch the current questions.json (need its sha to update it).
    const getRes = await githubRequest(`contents/${DATA_PATH}?ref=${branch}`);
    if (!getRes.ok) {
      const detail = await getRes.text();
      res.status(502).json({ error: "Could not read questions.json from GitHub", detail });
      return;
    }
    const fileData = await getRes.json();
    const currentJson = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf8"));

    // 2. Merge new questions in, skipping exact duplicates (same level +
    //    category + question text) already present.
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
      res.status(200).json({
        added: 0,
        skipped: valid.length,
        message: "All submitted questions were exact duplicates of existing ones — nothing added.",
        errors,
      });
      return;
    }

    // 3. Commit the merged file back to GitHub.
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
      res.status(502).json({ error: "Could not commit the updated question bank to GitHub", detail });
      return;
    }

    const totals = {};
    for (const level of VALID_LEVELS) {
      const cats = currentJson[level] || {};
      totals[level] = VALID_CATEGORIES.reduce((sum, c) => sum + (cats[c]?.length || 0), 0);
    }

    res.status(200).json({
      added: addedCount,
      skippedDuplicates: valid.length - addedCount,
      invalid: errors,
      totals,
      note: "Committed to GitHub. Your host will auto-deploy this in about a minute.",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
