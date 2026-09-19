# English Test — Find Your English Level

A mobile-first English placement test app: pick a CEFR level (A1–C1), pick
which skills to practice (grammar / vocabulary / reading), take a timed or
untimed quiz, and get a scored breakdown with a shareable result card.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Deploy it

This project deploys cleanly to **either** Vercel or Netlify without changing any code — both a Vercel-style serverless function (`api/generate-questions.js`) and a Netlify Function (`netlify/functions/generate-questions.cjs`) are included, and `netlify.toml` redirects `/api/*` to the Netlify function so the frontend code doesn't need to know which host it's on.

### Option A — Vercel (zero config)

1. Push this folder to a GitHub repo.
2. https://vercel.com → **Add New Project** → import the repo → **Deploy**.
   Vercel auto-detects Vite for the frontend and `api/` for the function.
3. You get a live `https://your-app.vercel.app` URL immediately.

### Option B — Netlify

1. Push this folder to a GitHub repo.
2. https://app.netlify.com → **Add new site → Import an existing project** → pick the repo.
3. Netlify reads `netlify.toml` automatically (build command, publish folder, and functions folder are already set) → **Deploy**.
4. You get a live `https://your-app.netlify.app` URL immediately.

Either way, the site works out of the box using the built-in question bank — no API key required to launch.

### Turn on true AI-generated questions (optional)

Right now every test pulls from a curated practice bank (~32 questions per
level) and remembers what you've already seen so it won't repeat a question
until you've gone through the whole set. That's solid for practice, but the
pool is finite.

To get genuinely new AI-written questions on every single test:

1. Get an API key at https://console.anthropic.com/
2. Add it as an environment variable named `ANTHROPIC_API_KEY`:
   - **Vercel**: Project → Settings → Environment Variables
   - **Netlify**: Site configuration → Environment variables
3. Redeploy. The frontend calls `/api/generate-questions` automatically; if
   it succeeds you'll see an "AI-generated" tag during the quiz. If the key
   is missing or the call fails for any reason, it silently falls back to
   the practice bank so the app never breaks for users.

**Cost**: the Anthropic API is pay-as-you-go, not free — you'll need to add
billing details in the Anthropic console before a key will work. A single
20-question generation call is roughly 1,000-1,500 output tokens, which at
current Claude Sonnet pricing costs a fraction of a cent per test (check
https://docs.claude.com or your Anthropic console for the current rate
card, since pricing can change). For a personal/small project this is
typically a few dollars a month even with regular use — just keep an eye
on usage in the console if you share the link publicly, since nothing here
rate-limits how often people can generate new questions.

Locally, copy `.env.example` to `.env` and fill in the key, then run
`netlify dev` (Netlify CLI) or `vercel dev` (Vercel CLI) to test the
function locally — the plain `npm run dev` (Vite) does **not** run the
`/api` function, only these CLIs do.

## Admin panel — bulk-add questions from a file

Visit `yoursite.com/?admin=1` (works on either Vercel or Netlify) to open a
private page where you paste or upload a JSON file of new questions.
Validating and submitting them commits the merged question bank straight to
`src/data/questions.json` in your GitHub repo — Vercel/Netlify then
auto-deploys, so the new questions are live for **every visitor**, not just
saved in your own browser.

### One-time setup

1. **Create a GitHub token** scoped to just this repo:
   https://github.com/settings/personal-access-tokens/new → "Fine-grained
   token" → pick this repo under "Repository access" → under
   "Permissions", set **Contents: Read and write** → Generate.
2. Add these environment variables on your host (Vercel: Project →
   Settings → Environment Variables. Netlify: Site configuration →
   Environment variables), then redeploy:
   - `ADMIN_PASSWORD` — any password you choose
   - `GITHUB_TOKEN` — the token from step 1
   - `GITHUB_REPO` — `your-username/your-repo-name`
   - `GITHUB_BRANCH` — the branch your host deploys from (usually `main`)

### Using it

1. Go to `yoursite.com/?admin=1`.
2. Enter your admin password.
3. Upload or paste a JSON array of questions — see
   `admin-questions-template.json` in this repo for the exact format, or
   click "Fill in an example template" on the page itself. Each item needs:

   ```json
   {
     "level": "A1" | "A2" | "B1" | "B2" | "C1",
     "category": "grammar" | "vocabulary" | "reading",
     "passage": "only required for category: reading",
     "q": "the question text",
     "options": ["exactly", "four", "options", "here"],
     "correct": 0,
     "explanation": "one short sentence explaining the right answer"
   }
   ```

4. Click **Validate** — it'll list any items with formatting problems so
   you can fix the file before submitting.
5. Click **Add N Question(s)**. Exact duplicate questions (same level +
   category + question text) are skipped automatically.

### Generating a big batch to upload

Since the format above is plain, structured JSON, you can hand the same
template to any AI assistant and ask it to generate e.g. "200 more B1
vocabulary questions in exactly this JSON format" — then upload the result
here in one go. This is a much faster way to grow the bank into the
thousands than writing questions one at a time.



## Project structure

```
index.html
admin-questions-template.json — example file for the admin panel upload
src/
  main.jsx              — React entry point
  App.jsx               — all screens (home, setup, quiz, results, review, admin)
  index.css             — Tailwind entry
  data/
    bank.js               — CEFR levels, categories, and the selection/
                             scoring helpers
    questions.json         — the actual question bank data (what the admin
                             panel reads and writes)
  lib/aiQuestions.js      — calls /api/generate-questions, returns null on
                            any failure so the caller can fall back
  lib/storage.js          — localStorage helpers: test history + which
                            question ids you've already seen per level
api/
  generate-questions.js   — Vercel serverless function that calls the
                            Anthropic API to write fresh questions
  add-questions.js        — Vercel serverless function behind the admin
                            panel; commits new questions to GitHub
netlify/
  functions/generate-questions.cjs — same, Netlify Functions format
  functions/add-questions.cjs      — same, Netlify Functions format
netlify.toml              — Netlify build settings + /api/* redirects
```

## Notes

- **History**: stored in the browser's `localStorage`, so it persists
  across visits on the same device/browser (not synced across devices).
- **No repeats**: the app tracks which question ids you've seen per level
  in `localStorage` and avoids repeating them until you've exhausted the
  whole bank for that level, at which point it starts cycling again.
- **Sharing results**: uses the Web Share API on supported
  browsers/devices (most mobile browsers); otherwise it downloads a PNG
  result card and copies a text summary to your clipboard.
- **Writing** was intentionally left out as a testable category since
  there's no automated way to grade free-form writing here — the app
  focuses on grammar, vocabulary, and reading comprehension.
- **Admin panel security**: the password is a simple shared secret checked
  server-side (never shipped in the frontend bundle), and your GitHub
  token should be scoped to only this one repo with just "Contents:
  read/write" — never a token with broader account access. There's no
  lockout after failed attempts, so treat the admin URL and password like
  any other credential and don't post them publicly.
