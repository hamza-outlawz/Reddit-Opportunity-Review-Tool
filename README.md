# Reddit Opportunity Review Tool

A first-pass reviewer for respond.io's Reddit commenting program. Paste a Scalerr
opportunity (thread link, subreddit, keyword, proposed comment) and it runs the
two-gate review — **Gate 1: should we engage at all?** (ICP + positioning), then
**Gate 2: is the comment good?** — and returns a verdict plus a ready-to-paste
Slack reply in Mel's voice.

The review logic lives in editable **guardrails** (ICP, positioning, engage bar,
feature red lines, voice). They're a first draft reverse-engineered from two of
Mel's real decisions — sharpen them with her before trusting verdicts blindly.

---

## What you need first

1. **Node.js 18 or newer.** Check with `node -v`. If you don't have it, install
   from https://nodejs.org (the LTS version).
2. **An Anthropic API key.** Get one at https://console.anthropic.com →
   Settings → API Keys. This calls a paid API; usage is billed to that key.

---

## Setup (one time)

From this folder, in a terminal:

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and add your key
cp .env.example .env
# then open .env and paste your real key after ANTHROPIC_API_KEY=
```

---

## Run it (local testing)

```bash
npm run dev
```

This starts two things at once:
- the **web app** at http://localhost:5173  ← open this in your browser
- the **relay** at http://localhost:8787 (holds your key, talks to Anthropic)

Open http://localhost:5173, hit **SMS sample** or **WhatsApp sample** to load a
test case, and click **Review opportunity**. Edit the rules anytime via the
**Guardrails** button (top-right).

To stop: press `Ctrl+C` in the terminal.

---

## Why there's a "relay" and not just the web app

An API key must never live in frontend/browser code — anyone who opens the page
could read it and run up your bill. So the key sits in the small local server
(`server/relay.js`), loaded from `.env`. The browser sends the opportunity to the
relay; the relay adds the key and calls Anthropic; the answer comes back. The key
never leaves your machine.

---

## Giving Mel a usable link (when you're ready)

`npm run dev` only runs on **your** computer — Mel can't open `localhost`. To give
her a link, the app + relay need to be hosted. Since Vercel isn't available, the
fit for your stack is **Cloudflare** (you already run `respondio-core` there):

- **Frontend** → Cloudflare Pages: run `npm run build`, deploy the `dist/` folder.
- **Relay** → a Cloudflare Worker that does what `server/relay.js` does: holds
  `ANTHROPIC_API_KEY` as a Worker secret (`wrangler secret put ANTHROPIC_API_KEY`)
  and forwards to `https://api.anthropic.com/v1/messages`. Point the frontend's
  `/api/review` call at the Worker URL.

The relay logic is ~40 lines and translates almost directly to a Worker
`fetch` handler. Ask Claude to convert `server/relay.js` into a Worker when you
reach that step.

> Note: hosting this means anyone with the link can spend against your API key.
> Before sharing with Mel, add at least light protection on the Worker (a shared
> secret header, Cloudflare Access, or an allowlist) so it's not open to the world.

---

## Files

```
reddit-review/
├─ index.html                 # page shell
├─ package.json               # deps + scripts
├─ vite.config.js             # dev server + /api proxy to the relay
├─ .env.example               # copy to .env, add your key
├─ server/
│  └─ relay.js                # local backend; holds the key, calls Anthropic
└─ src/
   ├─ main.jsx                # mounts the app
   └─ RedditReviewTool.jsx    # the tool (UI + review logic + guardrails)
```

To change the review behavior, edit `DEFAULT_GUARDRAILS` at the top of
`src/RedditReviewTool.jsx`, or just use the in-app Guardrails panel for quick
experiments (panel edits last only for that browser session).
