const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

// Keys are loaded from:
// - Local dev: .env file (gitignored)
// - Production: Environment variables set in Render dashboard

const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || "").trim() });

// ─── IPL Schema + Prompt Engineering ─────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a PostgreSQL expert. Convert English questions into precise SQL SELECT queries.

DATABASE SCHEMA:

Table 1: ipl_matches
Columns: id (INTEGER PK), season (TEXT), city (TEXT), date (TEXT), match_type (TEXT),
  player_of_match (TEXT), venue (TEXT), team1 (TEXT), team2 (TEXT),
  toss_winner (TEXT), toss_decision (TEXT), winner (TEXT), result (TEXT),
  result_margin (TEXT), target_runs (TEXT), target_overs (TEXT),
  super_over (TEXT), method (TEXT), umpire1 (TEXT), umpire2 (TEXT)

Table 2: ipl_deliveries
Columns: match_id (INTEGER FK→ipl_matches.id), inning (INTEGER), batting_team (TEXT),
  bowling_team (TEXT), over (INTEGER), ball (INTEGER), batter (TEXT),
  bowler (TEXT), non_striker (TEXT), batsman_runs (INTEGER), extra_runs (INTEGER),
  total_runs (INTEGER), extras_type (TEXT), is_wicket (INTEGER),
  player_dismissed (TEXT), dismissal_kind (TEXT), fielder (TEXT)

CRITICAL DATA NOTES — follow these exactly:

1. TEAM NAMES — always stored as full names. Map short forms automatically:
   CSK / Chennai      → use ILIKE '%Chennai Super Kings%'
   MI / Mumbai Indians → use ILIKE '%Mumbai Indians%'
   RCB                → use ILIKE '%Royal Challengers%'
   KKR                → use ILIKE '%Kolkata Knight Riders%'
   DC / Delhi         → use ILIKE '%Delhi%'
   SRH / Hyderabad    → use ILIKE '%Sunrisers Hyderabad%'
   RR / Rajasthan     → use ILIKE '%Rajasthan Royals%'
   PBKS / KXIP / Punjab → use ILIKE '%Punjab%' OR ILIKE '%Kings XI%'
   GT                 → use ILIKE '%Gujarat Titans%'
   LSG                → use ILIKE '%Lucknow Super Giants%'

PLAYER NAME ALIASES — names in DB use initials. Always use ILIKE with partial match:
   Virat Kohli       → batter ILIKE '%Kohli%'
   Rohit Sharma      → batter ILIKE '%RG Sharma%' OR batter ILIKE '%Rohit%'
   MS Dhoni          → batter ILIKE '%MS Dhoni%'
   Sachin Tendulkar  → batter ILIKE '%SR Tendulkar%'
   AB de Villiers    → batter ILIKE '%AB de Villiers%'
   Chris Gayle       → batter ILIKE '%CH Gayle%'
   David Warner      → batter ILIKE '%DA Warner%'
   Jos Buttler       → batter ILIKE '%JC Buttler%'
   When unsure of exact name format, use ILIKE '%LastName%'

2. result_margin is TEXT — always CAST before numeric compare:
   CAST(result_margin AS INTEGER) > 100

3. Wickets: SUM(is_wicket) — is_wicket is 0 or 1

4. player_dismissed — NULL or empty string when no dismissal:
   WHERE player_dismissed IS NOT NULL AND player_dismissed != ''

5. Batsman runs — use batsman_runs (not total_runs) for individual scores

6. season is TEXT: "2021", "2022", "2007/08" etc.

7. Join: ipl_deliveries.match_id = ipl_matches.id

8. ECONOMY RATE = ROUND(SUM(d.total_runs)::NUMERIC / NULLIF(COUNT(*), 0) * 6, 2)
   Filter: COUNT(*) >= 300 (min 50 overs = 300 balls) for meaningful economy

9. BATTING AVERAGE = ROUND(SUM(d.batsman_runs)::NUMERIC / NULLIF(COUNT(DISTINCT d.match_id), 0), 2)

10. HOME MATCHES — derive from venue containing the city:
    Mumbai Indians home = venue ILIKE '%Mumbai%' OR venue ILIKE '%Wankhede%' OR venue ILIKE '%Brabourne%' OR venue ILIKE '%DY Patil%'
    Chennai home = venue ILIKE '%Chennai%' OR venue ILIKE '%Chepauk%'
    Use m.venue for joins with ipl_matches

11. FINALS — match_type = 'Final' in ipl_matches

12. WIN RATE BATTING FIRST:
    Teams that win when batting first = toss_decision = 'bat' AND winner = toss_winner
    Win rate = COUNT(CASE WHEN winner = team THEN 1 END)::NUMERIC / COUNT(*) * 100

13. SIXES = SUM(CASE WHEN d.batsman_runs = 6 THEN 1 ELSE 0 END)
    FOURS = SUM(CASE WHEN d.batsman_runs = 4 THEN 1 ELSE 0 END)

14. RUNS PER SEASON — join deliveries with matches on match_id to get season

15. result column values: 'runs' (batting first team won) or 'wickets' (batting second won)

SQL RULES:
- Return ONLY the raw SQL query — no explanation, no markdown, no backticks, no comments
- Only SELECT queries — never INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER
- Use aliases: m for ipl_matches, d for ipl_deliveries
- Use ILIKE for all text matching with % wildcards
- Default LIMIT 20 unless user specifies more (max 100)
- Round all decimals to 2 places
- Use NULLIF to prevent division by zero
`;


// ─── Helper: call Groq to generate SQL ───────────────────────────────────────
async function generateSQL(question, errorContext = null) {
  const userMessage = errorContext
    ? `Question: ${question}\n\nYour previous SQL attempt failed with this error:\n"${errorContext}"\n\nFix the SQL and return only the corrected query.`
    : `Question: ${question}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // Only active Llama3.3-70B on Groq as of 2025
    max_tokens: 512,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  let sql = completion.choices[0].message.content.trim();
  // Strip accidental markdown fences
  sql = sql.replace(/```sql|```/gi, "").trim();
  return sql;
}

// ─── Helper: run SQL on Supabase ─────────────────────────────────────────────
async function runQuery(sql) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(sql);
    await client.end();
    return { success: true, result };
  } catch (err) {
    await client.end().catch(() => {});
    return { success: false, error: err.message };
  }
}

// ─── Route: Generate SQL + Execute (with self-correction) ────────────────────
app.post("/api/query", async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim().length < 3) {
    return res.status(400).json({ error: "Question is too short." });
  }

  // ── Attempt 1: generate SQL ──
  let sql;
  try {
    sql = await generateSQL(question);
  } catch (err) {
    console.error("Groq error:", err.message);
    return res.status(500).json({ error: "Failed to generate SQL from Groq." });
  }

  // Safety check — only SELECT allowed
  const isSelect = (q) => q.trim().split(/\s+/)[0].toUpperCase() === "SELECT";
  if (!isSelect(sql)) {
    return res.status(400).json({ error: "Only SELECT queries are allowed.", sql });
  }

  // ── Run query (attempt 1) ──
  let { success, result, error } = await runQuery(sql);

  // ── Self-correction: if DB failed, ask Groq to fix it ──
  if (!success) {
    console.log(`⚠️  Attempt 1 failed: ${error}`);
    console.log(`🔄  Self-correcting with error context...`);

    try {
      sql = await generateSQL(question, error);
    } catch (groqErr) {
      console.error("Groq retry error:", groqErr.message);
      return res.status(500).json({
        error: "Query failed and self-correction also failed.",
        detail: error,
        sql,
      });
    }

    if (!isSelect(sql)) {
      return res.status(400).json({ error: "Only SELECT queries are allowed.", sql });
    }

    // ── Run query (attempt 2) ──
    ({ success, result, error } = await runQuery(sql));

    if (!success) {
      console.error("❌ Failed after self-correction:", error);
      return res.status(500).json({
        error: "Query failed even after self-correction. Try rephrasing.",
        sql,
        detail: error,
      });
    }

    console.log(`✅ Self-correction succeeded!`);
  }

  return res.json({
    sql,
    columns: result.fields.map((f) => f.name),
    rows: result.rows,
    rowCount: result.rowCount,
  });
});

// ─── Route: Example Questions ─────────────────────────────────────────────────
app.get("/api/examples", (_, res) => {
  res.json([
    "Which batsman scored the most runs overall?",
    "Top 5 bowlers by total wickets taken",
    "How many matches did CSK win?",
    "Which venue hosted the most matches?",
    "List matches where result_margin was over 100",
    "Which player won Player of the Match most times?",
    "Which team won the toss most often?",
    "Show total runs scored per season",
  ]);
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_, res) => res.send("Text-to-SQL API (IPL) is running ✅"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));