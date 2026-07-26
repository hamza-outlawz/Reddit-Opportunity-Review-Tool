import React, { useState } from "react";
import { ChevronRight, Copy, Check, AlertTriangle, CircleSlash, CircleCheck, Settings, Loader2, RotateCcw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// GUARDRAILS — the rules that drive every verdict. Edit live via the in-app panel,
// or change these defaults directly. Written as plain guidance; injected verbatim
// into the review prompt. First draft reverse-engineered from two of Mel's real
// calls (r/CRM "sms tool" SKIP and r/CRM WhatsApp APPROVE-WITH-EDIT) — sharpen
// with her before treating verdicts as final.
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_GUARDRAILS = {
  icp: `respond.io fits teams managing customer conversations across messaging channels (WhatsApp, Instagram, Messenger, SMS, Telegram, live chat) — usually multiple people handling inbound, OR a smaller team at GROWING volume. Strong ICP signals: shared-inbox needs, "messages getting missed," assigning/routing conversations, conversation history per contact, rising message volume, multi-agent coordination. Team size alone is NOT disqualifying — a 4-person team at growing volume is in-scope (Mel engaged on exactly that). What matters is the conversation-management need, not headcount.`,
  positioning: `respond.io is an omnichannel conversation-management platform — NOT "an SMS tool," "a WhatsApp tool," "a chatbot," or any single-channel point solution. The off-positioning risk lives in the THREAD's frame, not just the comment: if the thread is structurally a "best [channel] tool" shopping/comparison question, then ANY recommendation — even a well-reframed one — brands respond.io as that category, because the whole thread is about that category. That association is unfixable from inside the comment. If instead the thread is about managing conversations / volume / a team workflow that merely happens to name one channel, the platform framing is congruent and the association is safe.`,
  engageBar: `THE decision. Ask: is the thread (a) a single-category shopping question, or (b) a conversation-management / workflow problem?
- SKIP (a): threads locked to a product category — "best SMS tool," "cheapest WhatsApp sender," "X vs Y comparison," or a keyword that IS a product category like "sms tool." Recommending respond.io here brands it as that category; a reframe can't save it because the thread's question IS the category. (This is why the r/CRM "sms tool" thread was a skip even though volume was mentioned.)
- ENGAGE (b): threads about managing conversations, not dropping leads, shared inbox, team coordination, handling growing volume, conversation history — EVEN IF only one channel is named — because a comment can credibly reframe toward the platform/volume angle that's congruent with what the OP actually asked. (This is why "manage WhatsApp conversations across a small team at growing volume" was an engage.)
Single-channel mention is NOT an automatic skip. Single-channel SHOPPING is. The test: would respond.io's omnichannel-platform answer be a congruent answer to the OP's real question, or would it read as endorsing a narrower category?`,
  featureRedLines: `Only claim capabilities respond.io actually ships: omnichannel shared inbox, conversation assignment/routing, contact history, channel integrations, and an AI agent layer for automating repetitive replies. Do NOT invent integrations, pricing, or features. A comment asserting a feature respond.io doesn't ship = REJECT regardless of thread fit.
BRAND RULE: always write the full name "respond.io" WITH the dot — never "respondio" or "respond io." The full brand string is required for AI citation pickup. If the draft omits the dot, that alone is a REVISE.`,
  voice: `Helpful first, recommendation earned not forced, plain and peer-to-peer, never salesy.
CRITICAL — REFRAME: when engaging on a thread that names a single channel, the comment must NOT endorse respond.io as "a good [channel] tool." Lead with the underlying workflow/volume problem (shared inbox, nothing gets missed, history per contact, assignments), position respond.io as solving that, and present extra channels as UPSIDE ("not just WhatsApp — you can bring in Instagram, email, live chat later without switching platforms"). The AI-agent layer is a fair mention for automating repetitive replies. A draft that endorses respond.io as a single-channel tool should be REVISED into this reframed shape — this is exactly what Mel did to the WhatsApp comment.
NOTE: spelling/grammar imperfections are DELIBERATE — Scalerr adds them so comments read Reddit-native. Do NOT flag or "fix" typos.`,
};

const SAMPLE_SMS = `-- Active Commenting Opportunity --
Thread Link: [URL]
Subreddit: r/CRM
Keyword: sms tool

Proposed Comment:
SMS reply rates cap faster then people expect so they add WhatsApp or instagram DM bc response rates are way higher iand the cost per conversation is lower. Worth thinking about what channels your leads prefer before you commit to an SMS only stack. missive is good for small teams for multi channel but respond.io is best overall imo it handles all inbound messages rly well`;

// WhatsApp case from Mel's APPROVE-WITH-EDIT thread. The agency's ORIGINAL draft
// wasn't visible in the screenshot (only Mel's edit was), so the proposed comment
// below is a representative single-channel draft — the tool should ENGAGE and
// REVISE it toward Mel's reframed version.
const SAMPLE_WA = `-- Active Commenting Opportunity --
Thread Link: [URL]
Subreddit: r/CRM
Keyword: whatsapp team inbox
Thread title: Looking for a better way to manage WhatsApp conversations across a small team
Thread context: We run a small business with 4 people handling a growing number of WhatsApp chats and things are starting to slip.

Proposed Comment:
managing whatsapp for a team gets messy fast when everyones sharing one number. you want a shared inbox so msgs dont get missed and you can see whos replying to what. respond.io is solid for this imo, handles whatsapp really well and keeps it all in one place`;

const SYSTEM_PROMPT = (g) => `You are the first-pass reviewer for respond.io's Reddit commenting program. An agency (Scalerr) surfaces commenting opportunities and drafts comments; today a human (Mel) reviews each one manually. You replicate her judgment so she only handles genuine edge cases.

Her review is TWO GATES, in order. Gate 1 is strategic and dominant — a perfectly written comment is still rejected if Gate 1 fails.

GATE 1 — SHOULD WE ENGAGE AT ALL?
Judge the THREAD, not the comment. Two sub-checks:
A) ICP & thread-fit signal:
${g.icp}
${g.engageBar}
B) Positioning / association risk:
${g.positioning}
If either sub-check fails, the verdict is engage=no. Do not evaluate the comment further except to note it wasn't the reason.

GATE 2 — IF WE ENGAGE, IS THE COMMENT GOOD?
Only assess this if Gate 1 passes.
- Feature accuracy / red lines:
${g.featureRedLines}
- Voice & helpfulness:
${g.voice}
Comment verdict is one of: approve | revise | reject.
- approve: post as-is.
- revise: good to engage, but the comment needs changes — provide a rewritten version that keeps the Reddit-native voice (including deliberate light imperfections) and fixes the issue.
- reject: engaging is fine but this specific comment can't be salvaged as drafted.

OUTPUT — respond with ONLY valid JSON, no markdown, no preamble:
{
  "engage": "yes" | "no",
  "engage_reasoning": "2-3 sentences. Lead with the ICP/positioning call, the way an operator would explain the skip-or-go decision.",
  "icp_signal": "strong" | "weak" | "unclear",
  "positioning_risk": "low" | "medium" | "high",
  "comment_verdict": "approve" | "revise" | "reject" | "n/a",
  "comment_reasoning": "1-2 sentences. 'n/a' reasoning if engage=no.",
  "revised_comment": "the rewritten comment if comment_verdict is 'revise', otherwise empty string",
  "slack_reply": "a ready-to-paste reply Mel can drop into the Scalerr thread, written in her voice — direct, specific about WHY, names the strategic reason. If approving, a brief go-ahead. If skipping, explain the call like she did."
}`;

const PARSE_RE = {
  thread: /thread\s*link[:\s]*\n?\s*[•\-*]?\s*(.+)/i,
  subreddit: /subreddit[:\s]*\n?\s*[•\-*]?\s*(.+)/i,
  keyword: /keyword[:\s]*\n?\s*[•\-*]?\s*(.+)/i,
};

function parseOpportunity(raw) {
  const out = { thread: "", subreddit: "", keyword: "", comment: "" };
  const t = raw.match(PARSE_RE.thread); if (t) out.thread = t[1].trim();
  const s = raw.match(PARSE_RE.subreddit); if (s) out.subreddit = s[1].trim();
  const k = raw.match(PARSE_RE.keyword); if (k) out.keyword = k[1].trim();
  const c = raw.match(/proposed\s*comment[:\s]*\n+([\s\S]*?)(?:\n\s*(?:next\s*step|🗒|reminder|once\s+published)|$)/i);
  if (c) out.comment = c[1].trim();
  return out;
}

export default function RedditReviewTool() {
  const [raw, setRaw] = useState("");
  const [guardrails, setGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [showGuardrails, setShowGuardrails] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function review() {
    if (!raw.trim()) return;
    setLoading(true); setError(""); setResult(null);
    const parsed = parseOpportunity(raw);
    const userMsg = `Here is the opportunity from Scalerr.

Parsed fields:
- Thread: ${parsed.thread || "(not detected)"}
- Subreddit: ${parsed.subreddit || "(not detected)"}
- Keyword: ${parsed.keyword || "(not detected)"}

Proposed comment:
${parsed.comment || "(not detected — see raw below)"}

Full raw message:
${raw}`;

    try {
      // Calls the local relay (server/relay.js), which holds the API key and
      // forwards to Anthropic. The browser never sees the key.
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: SYSTEM_PROMPT(guardrails), userMsg }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const parsedResult = JSON.parse(data.text);
      setResult({ ...parsedResult, parsed });
    } catch (e) {
      setError(
        "Couldn't complete the review. Make sure the relay is running (npm run dev) and your API key is set in .env. " +
        (e.message ? `Details: ${e.message}` : "")
      );
    } finally {
      setLoading(false);
    }
  }

  function copySlack() {
    if (!result?.slack_reply) return;
    navigator.clipboard.writeText(result.slack_reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function reset() { setRaw(""); setResult(null); setError(""); }

  const engageYes = result?.engage === "yes";

  return (
    <div style={styles.wrap}>
      <style>{cssReset}</style>

      <header style={styles.header}>
        <div>
          <div style={styles.kicker}>REDDIT OPPORTUNITY TRIAGE</div>
          <h1 style={styles.h1}>First-pass review</h1>
        </div>
        <button style={styles.gearBtn} onClick={() => setShowGuardrails((v) => !v)} aria-label="Edit guardrails">
          <Settings size={15} /> Guardrails
        </button>
      </header>

      {showGuardrails && (
        <div style={styles.guardrailPanel}>
          <p style={styles.guardrailNote}>
            These rules drive every verdict. This is a first draft reverse-engineered from two of Mel's real calls — sharpen them with her, then they're trustworthy. Edits here apply to this session.
          </p>
          {Object.entries({
            icp: "ICP & thread-fit signal",
            positioning: "Positioning / what we must not be associated with",
            engageBar: "Engage bar (comment at all?)",
            featureRedLines: "Feature accuracy red lines",
            voice: "Voice (note: typos are intentional)",
          }).map(([key, label]) => (
            <label key={key} style={styles.guardrailField}>
              <span style={styles.guardrailLabel}>{label}</span>
              <textarea
                style={styles.guardrailInput}
                value={guardrails[key]}
                onChange={(e) => setGuardrails({ ...guardrails, [key]: e.target.value })}
                rows={4}
              />
            </label>
          ))}
        </div>
      )}

      <section style={styles.inputCard}>
        <div style={styles.inputHeadRow}>
          <span style={styles.inputLabel}>Paste the Scalerr opportunity</span>
          <span style={styles.sampleGroup}>
            <button style={styles.linkBtn} onClick={() => { setRaw(SAMPLE_SMS); setResult(null); }}>SMS sample</button>
            <span style={styles.sampleSep}>·</span>
            <button style={styles.linkBtn} onClick={() => { setRaw(SAMPLE_WA); setResult(null); }}>WhatsApp sample</button>
          </span>
        </div>
        <textarea
          style={styles.textarea}
          placeholder="Paste the full Slack message from Scalerr — thread link, subreddit, keyword, proposed comment…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={9}
        />
        <div style={styles.actionRow}>
          <button style={{ ...styles.primaryBtn, opacity: !raw.trim() || loading ? 0.5 : 1 }} onClick={review} disabled={!raw.trim() || loading}>
            {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Reviewing…</> : <>Review opportunity <ChevronRight size={16} /></>}
          </button>
          {(raw || result) && <button style={styles.ghostBtn} onClick={reset}><RotateCcw size={14} /> Clear</button>}
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </section>

      {result && (
        <section style={styles.results}>
          {/* GATE 1 — dominant */}
          <div style={{ ...styles.gateCard, borderColor: engageYes ? "var(--go)" : "var(--stop)", background: engageYes ? "var(--go-bg)" : "var(--stop-bg)" }}>
            <div style={styles.gateHead}>
              <span style={styles.gateNum}>GATE 1 · ENGAGE?</span>
              <span style={{ ...styles.verdictPill, color: engageYes ? "var(--go)" : "var(--stop)", borderColor: engageYes ? "var(--go)" : "var(--stop)" }}>
                {engageYes ? <CircleCheck size={15} /> : <CircleSlash size={15} />}
                {engageYes ? "Engage" : "Skip"}
              </span>
            </div>
            <p style={styles.reasoning}>{result.engage_reasoning}</p>
            <div style={styles.signalRow}>
              <Signal label="ICP signal" value={result.icp_signal} good="strong" bad="weak" />
              <Signal label="Positioning risk" value={result.positioning_risk} good="low" bad="high" invert />
            </div>
          </div>

          {/* GATE 2 — only meaningful if engaging */}
          <div style={{ ...styles.gateCard, opacity: engageYes ? 1 : 0.55 }}>
            <div style={styles.gateHead}>
              <span style={styles.gateNum}>GATE 2 · COMMENT</span>
              {engageYes ? (
                <span style={{ ...styles.verdictPill, ...commentPillStyle(result.comment_verdict) }}>
                  {result.comment_verdict === "approve" && <Check size={14} />}
                  {result.comment_verdict === "revise" && <AlertTriangle size={14} />}
                  {result.comment_verdict === "reject" && <CircleSlash size={14} />}
                  {result.comment_verdict}
                </span>
              ) : (
                <span style={styles.naPill}>not reached</span>
              )}
            </div>
            <p style={styles.reasoning}>
              {engageYes ? result.comment_reasoning : "Gate 1 said skip — the comment isn't the deciding factor here."}
            </p>
            {engageYes && result.comment_verdict === "revise" && result.revised_comment && (
              <div style={styles.revisedBox}>
                <span style={styles.revisedLabel}>Suggested rewrite</span>
                <p style={styles.revisedText}>{result.revised_comment}</p>
              </div>
            )}
          </div>

          {/* SIDE-BY-SIDE: verdict recap + ready Slack reply */}
          <div style={styles.splitRow} className="split">
            <div style={styles.splitCol}>
              <span style={styles.splitLabel}>Verdict summary</span>
              <ul style={styles.summaryList}>
                <li style={styles.sumRow}><span style={styles.sumKey}>Engage</span><span>{engageYes ? "Yes" : "No"}</span></li>
                <li style={styles.sumRow}><span style={styles.sumKey}>ICP</span><span style={styles.cap}>{result.icp_signal}</span></li>
                <li style={styles.sumRow}><span style={styles.sumKey}>Positioning</span><span style={styles.cap}>{result.positioning_risk} risk</span></li>
                <li style={styles.sumRow}><span style={styles.sumKey}>Comment</span><span style={styles.cap}>{engageYes ? result.comment_verdict : "—"}</span></li>
                {result.parsed?.subreddit && <li style={styles.sumRow}><span style={styles.sumKey}>Subreddit</span><span>{result.parsed.subreddit}</span></li>}
                {result.parsed?.keyword && <li style={styles.sumRow}><span style={styles.sumKey}>Keyword</span><span>{result.parsed.keyword}</span></li>}
              </ul>
            </div>
            <div style={styles.splitCol}>
              <div style={styles.splitLabelRow}>
                <span style={styles.splitLabel}>Ready-to-paste Slack reply</span>
                <button style={styles.copyBtn} onClick={copySlack}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <div style={styles.slackBox}>{result.slack_reply}</div>
            </div>
          </div>

          <p style={styles.disclaimer}>First-pass only. Confirm before posting — you have final call.</p>
        </section>
      )}
    </div>
  );
}

function Signal({ label, value, good, bad }) {
  const isGood = value === good;
  const isBad = value === bad;
  const color = isGood ? "var(--go)" : isBad ? "var(--stop)" : "var(--mute)";
  return (
    <div style={styles.signal}>
      <span style={styles.signalLabel}>{label}</span>
      <span style={{ ...styles.signalVal, color }}>{value}</span>
    </div>
  );
}

function commentPillStyle(v) {
  if (v === "approve") return { color: "var(--go)", borderColor: "var(--go)" };
  if (v === "revise") return { color: "var(--warn)", borderColor: "var(--warn)" };
  return { color: "var(--stop)", borderColor: "var(--stop)" };
}

const cssReset = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;450;500;600&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
* { box-sizing: border-box; }
body { margin: 0; }
textarea:focus, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
textarea { font-family: 'Inter', sans-serif; }
@media (max-width: 640px) { .split { grid-template-columns: 1fr !important; } }
`;

const styles = {
  wrap: {
    "--bg": "#0f1115", "--card": "#171a21", "--card2": "#1d212a", "--line": "#2a2f3a",
    "--ink": "#e8eaed", "--mute": "#8b919e", "--accent": "#ff5a3c",
    "--go": "#4ade80", "--go-bg": "rgba(74,222,128,0.06)", "--stop": "#f87171", "--stop-bg": "rgba(248,113,113,0.06)",
    "--warn": "#fbbf24",
    fontFamily: "'Inter', sans-serif", background: "var(--bg)", color: "var(--ink)",
    minHeight: "100vh", maxWidth: 720, margin: "0 auto", padding: "28px 22px 40px", lineHeight: 1.5,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 },
  kicker: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: "0.16em", color: "var(--accent)", fontWeight: 600 },
  h1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, margin: "4px 0 0", letterSpacing: "-0.01em" },
  gearBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--card)", color: "var(--mute)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 11px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  guardrailPanel: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 18, marginBottom: 20 },
  guardrailNote: { fontSize: 13, color: "var(--mute)", margin: "0 0 14px" },
  guardrailField: { display: "block", marginBottom: 12 },
  guardrailLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 5 },
  guardrailInput: { width: "100%", background: "var(--bg)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", fontSize: 13, resize: "vertical", lineHeight: 1.5 },
  inputCard: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 },
  inputHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  inputLabel: { fontSize: 13, fontWeight: 600, color: "var(--ink)" },
  linkBtn: { background: "none", border: "none", color: "var(--accent)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", padding: 0 },
  sampleGroup: { display: "inline-flex", alignItems: "center", gap: 8 },
  sampleSep: { color: "var(--mute)", fontSize: 12 },
  textarea: { width: "100%", background: "var(--bg)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 9, padding: "12px 13px", fontSize: 13.5, resize: "vertical", lineHeight: 1.55 },
  actionRow: { display: "flex", gap: 10, alignItems: "center", marginTop: 13 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 9, padding: "11px 17px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" },
  ghostBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", color: "var(--mute)", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  error: { marginTop: 12, color: "var(--stop)", fontSize: 13, background: "var(--stop-bg)", border: "1px solid var(--stop)", borderRadius: 8, padding: "9px 12px", lineHeight: 1.5 },
  results: { marginTop: 22, display: "flex", flexDirection: "column", gap: 14 },
  gateCard: { border: "1px solid var(--line)", borderRadius: 12, padding: 17, background: "var(--card)", transition: "opacity 0.2s" },
  gateHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  gateNum: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, letterSpacing: "0.12em", color: "var(--mute)", fontWeight: 600 },
  verdictPill: { display: "inline-flex", alignItems: "center", gap: 6, border: "1.5px solid", borderRadius: 999, padding: "5px 13px", fontSize: 13.5, fontWeight: 700, textTransform: "capitalize", fontFamily: "'Space Grotesk', sans-serif" },
  naPill: { fontSize: 12.5, color: "var(--mute)", fontStyle: "italic" },
  reasoning: { fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.55 },
  signalRow: { display: "flex", gap: 28, marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--line)" },
  signal: { display: "flex", flexDirection: "column", gap: 2 },
  signalLabel: { fontSize: 11.5, color: "var(--mute)", fontWeight: 500 },
  signalVal: { fontSize: 14, fontWeight: 700, textTransform: "capitalize", fontFamily: "'Space Grotesk', sans-serif" },
  revisedBox: { marginTop: 13, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, padding: "12px 13px" },
  revisedLabel: { fontSize: 11, fontWeight: 600, color: "var(--warn)", letterSpacing: "0.06em", textTransform: "uppercase" },
  revisedText: { fontSize: 13.5, margin: "7px 0 0", lineHeight: 1.6, color: "var(--ink)" },
  splitRow: { display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 14 },
  splitCol: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 },
  splitLabel: { fontSize: 11.5, fontWeight: 600, color: "var(--mute)", letterSpacing: "0.08em", textTransform: "uppercase" },
  splitLabelRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 },
  summaryList: { listStyle: "none", margin: "11px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  sumKey: { color: "var(--mute)", fontSize: 13, minWidth: 92, display: "inline-block" },
  cap: { textTransform: "capitalize" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer" },
  slackBox: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, padding: "13px 14px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--ink)" },
  disclaimer: { fontSize: 12, color: "var(--mute)", textAlign: "center", margin: "4px 0 0" },
  sumRow: { display: "flex", alignItems: "baseline", fontSize: 13 },
};
