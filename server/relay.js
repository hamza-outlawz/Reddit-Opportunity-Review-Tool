// ─────────────────────────────────────────────────────────────────────────────
// LOCAL RELAY — holds your Anthropic API key and forwards review requests.
// The browser NEVER sees the key. It talks to this; this talks to Anthropic.
//
// Run with:  npm run api   (or `npm run dev` to run it alongside the frontend)
// Requires a .env file in the project root with:  ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────────────────────
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error("\n  ✗ ANTHROPIC_API_KEY is not set.");
  console.error("    Create a .env file in the project root containing:");
  console.error("    ANTHROPIC_API_KEY=sk-ant-your-key-here\n");
  process.exit(1);
}

app.post("/api/review", async (req, res) => {
  try {
    const { system, userMsg } = req.body;
    if (!system || !userMsg) {
      return res.status(400).json({ error: "Missing system or userMsg in request body." });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      console.error("Anthropic error:", anthropicRes.status, detail);
      return res.status(anthropicRes.status).json({ error: "Anthropic API error", detail });
    }

    const data = await anthropicRes.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    res.json({ text });
  } catch (err) {
    console.error("Relay error:", err);
    res.status(500).json({ error: "Relay failed", detail: String(err) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n  ✓ Review relay running on http://localhost:${PORT}`);
  console.log(`    Key loaded. Waiting for requests from the frontend.\n`);
});
