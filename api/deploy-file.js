// Vercel serverless function: POST /api/deploy-file
// Body: { password, path, content }
// Commits `content` to `path` in the repo (creating or updating it), so
// the site's host auto-deploys it — no local git commands needed. This is
// how the Admin panel's "Updates" section applies new code files.
//
// For safety, only paths under a small allow-list of directories can be
// written this way (source code and serverless functions, not config
// files like package.json or netlify.toml).
//
// Requires the same environment variables as api/add-questions.js:
// GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, ADMIN_PASSWORD.

const ALLOWED_PREFIXES = ["src/", "api/", "netlify/functions/"];

function isAllowedPath(path) {
  if (typeof path !== "string" || !path.trim()) return false;
  if (path.includes("..")) return false; // no path traversal
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: "Server is missing ADMIN_PASSWORD, GITHUB_TOKEN, or GITHUB_REPO environment variables." });
    return;
  }

  const { password, path, content } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Wrong password" });
    return;
  }
  if (!isAllowedPath(path)) {
    res.status(400).json({
      error: `Path not allowed. It must start with one of: ${ALLOWED_PREFIXES.join(", ")}`,
    });
    return;
  }
  if (typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "No file content provided." });
    return;
  }

  try {
    const branch = GITHUB_BRANCH || "main";
    // Try to fetch the existing file's sha (needed to update it). A 404
    // means it doesn't exist yet, which is fine — we're creating it.
    let sha;
    const getRes = await githubRequest(`contents/${path}?ref=${branch}`);
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    } else if (getRes.status !== 404) {
      res.status(502).json({ error: "Could not check the existing file on GitHub", detail: await getRes.text() });
      return;
    }

    const body = {
      message: `Update ${path} via admin panel`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
    };
    if (sha) body.sha = sha;

    const putRes = await githubRequest(`contents/${path}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      res.status(502).json({ error: "Could not commit the file to GitHub", detail: await putRes.text() });
      return;
    }

    res.status(200).json({
      ok: true,
      path,
      created: !sha,
      note: "Committed to GitHub. Your host will auto-deploy this in about a minute.",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
