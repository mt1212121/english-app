// Netlify Functions equivalent of api/deploy-file.js (used on Vercel).
// Same logic, different handler signature — see that file's header comment.

const ALLOWED_PREFIXES = ["src/", "api/", "netlify/functions/"];

function isAllowedPath(path) {
  if (typeof path !== "string" || !path.trim()) return false;
  if (path.includes("..")) return false;
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const { ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!ADMIN_PASSWORD || !GITHUB_TOKEN || !GITHUB_REPO) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server is missing ADMIN_PASSWORD, GITHUB_TOKEN, or GITHUB_REPO environment variables." }) };
  }

  const { password, path, content } = JSON.parse(event.body || "{}");
  if (password !== ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: "Wrong password" }) };
  }
  if (!isAllowedPath(path)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Path not allowed. It must start with one of: ${ALLOWED_PREFIXES.join(", ")}` }),
    };
  }
  if (typeof content !== "string" || !content.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "No file content provided." }) };
  }

  try {
    const branch = GITHUB_BRANCH || "main";
    let sha;
    const getRes = await githubRequest(`contents/${path}?ref=${branch}`);
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    } else if (getRes.status !== 404) {
      return { statusCode: 502, body: JSON.stringify({ error: "Could not check the existing file on GitHub", detail: await getRes.text() }) };
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
      return { statusCode: 502, body: JSON.stringify({ error: "Could not commit the file to GitHub", detail: await putRes.text() }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, path, created: !sha, note: "Committed to GitHub. Your host will auto-deploy this in about a minute." }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", detail: String(err) }) };
  }
};
