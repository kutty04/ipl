import { useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Sound ──────────────────────────────────────────────────────────────────────
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const note = (freq, t, dur, vol = 0.15, shape = "sine") => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = shape; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + dur);
    };
    if (type === "click") note(700, 0, 0.07, 0.08);
    if (type === "bat") { note(280, 0, 0.06, 0.3, "square"); note(140, 0, 0.18, 0.15); }
    if (type === "success") { note(523, 0, 0.13); note(659, 0.11, 0.13); note(784, 0.22, 0.22); }
    if (type === "back") note(420, 0, 0.08, 0.07);
    if (type === "error") { note(300, 0, 0.1, 0.12); note(250, 0.12, 0.15, 0.1); }
  } catch (_) {}
}

// ── Data ──────────────────────────────────────────────────────────────────────
const TEAMS = [
  { name: "CSK", color: "#F5C518", text: "#111" },
  { name: "MI",  color: "#004BA0", text: "#fff" },
  { name: "RCB", color: "#CC0000", text: "#fff" },
  { name: "KKR", color: "#3A225D", text: "#f5a623" },
  { name: "SRH", color: "#F7A721", text: "#111" },
  { name: "DC",  color: "#0078BC", text: "#fff" },
  { name: "RR",  color: "#E84B8A", text: "#fff" },
  { name: "PBKS", color: "#D71920", text: "#fff" },
];

const LEGENDS = [
  { name: "Virat Kohli", short: "King Kohli", team: "RCB", teamColor: "#CC0000", emoji: "👑", query: "How many sixes did Virat Kohli hit in his career?" },
  { name: "MS Dhoni",    short: "Captain Cool", team: "CSK", teamColor: "#F5C518", emoji: "🧤", query: "Top run scorers for Chennai Super Kings across all seasons" },
  { name: "Rohit Sharma", short: "Hitman",    team: "MI",  teamColor: "#004BA0", emoji: "🏆", query: "How many runs did Rohit Sharma score in each season?" },
];

const QUESTION_GROUPS = [
  {
    id: "easy", label: "🟢 Easy", color: "#2E7D32", bg: "#F1F8E9", border: "#A5D6A7",
    questions: [
      "How many matches did Chennai Super Kings win?",
      "Which venue hosted the most matches?",
      "Who won Player of the Match the most times?",
      "Which team won the toss most often?",
      "How many matches were played in each season?",
      "Which city hosted the most IPL matches?",
      "How many matches did Mumbai Indians win at home?",
    ],
  },
  {
    id: "medium", label: "🟡 Medium", color: "#E65100", bg: "#FFF8E1", border: "#FFE082",
    questions: [
      "Who scored the most runs overall?",
      "Top 5 bowlers by total wickets taken",
      "How many sixes did Virat Kohli hit in his career?",
      "Which bowler has the best economy rate with min 50 overs?",
      "Who hit the most fours overall?",
      "Which team scored the most runs in a single match?",
    ],
  },
  {
    id: "hard", label: "🔴 Hard", color: "#B71C1C", bg: "#FFEBEE", border: "#EF9A9A",
    questions: [
      "Who scored the most runs in finals only?",
      "Which batsman averages the most runs per match in Mumbai?",
      "Top run scorers for Chennai Super Kings across all seasons",
      "Which bowler took the most wickets against Mumbai Indians?",
      "How many runs did Rohit Sharma score in each season?",
      "Which team has the best win rate when batting first?",
      "Who scored the most runs in the 2021 season?",
    ],
  },
];

// ── SVG Cricket Ball ──────────────────────────────────────────────────────────
function Ball({ size = 22, spin = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={spin ? "spin" : ""} style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="bg" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#EF5350" />
          <stop offset="100%" stopColor="#B71C1C" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#bg)" stroke="#8B0000" strokeWidth="1" />
      <path d="M20 2 Q10 10 10 20 Q10 30 20 38" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <path d="M20 2 Q30 10 30 20 Q30 30 20 38" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
    </svg>
  );
}

function Stumps({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <rect x="8"  y="10" width="4" height="24" rx="1" fill="#D7B896" />
      <rect x="18" y="10" width="4" height="24" rx="1" fill="#D7B896" />
      <rect x="28" y="10" width="4" height="24" rx="1" fill="#D7B896" />
      <rect x="7"  y="8"  width="6" height="3"  rx="1.5" fill="#A0785A" />
      <rect x="17" y="8"  width="6" height="3"  rx="1.5" fill="#A0785A" />
      <rect x="27" y="8"  width="6" height="3"  rx="1.5" fill="#A0785A" />
    </svg>
  );
}

// ── Browse Drawer ──────────────────────────────────────────────────────────────
function BrowseDrawer({ onQuery, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer-in" style={{ width: "min(520px,100vw)", background: "#FFF8F0", height: "100vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #EDE7F6", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#FFF8F0", zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Stumps size={28} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17 }}>Explore Questions</div>
              <div style={{ fontSize: 12, color: "#90A4AE" }}>20 questions · 3 difficulty levels</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "6px 14px" }}>✕ Close</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
          {QUESTION_GROUPS.map(g => (
            <div key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: g.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{g.label}</div>
                <div style={{ flex: 1, height: 1, background: g.border }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {g.questions.map(q => (
                  <button key={q} className="q-btn" onClick={() => { playSound("click"); onQuery(q); onClose(); }}>{q}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Results Page ───────────────────────────────────────────────────────────────
function ResultsPage({ question, result, error, loading, onBack, onNewQuery }) {
  const [sqlOpen, setSqlOpen] = useState(false);
  return (
    <div className="page-in" style={{ minHeight: "100vh", background: "#F0F4FF" }}>
      {/* Top bar */}
      <div style={{ background: "#1565C0", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 12px rgba(21,101,192,0.3)" }}>
        <button className="btn" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: 14 }}
          onClick={() => { playSound("back"); onBack(); }}>← Back</button>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Question</div>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{question}</div>
        </div>
        <Ball size={28} />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Ball size={64} spin />
            <div style={{ marginTop: 20, color: "#546E7A", fontSize: 16, fontWeight: 500 }}>Generating SQL & querying database...</div>
            <div style={{ marginTop: 6, color: "#90A4AE", fontSize: 13 }}>Powered by Groq Llama3.3-70B</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="fade-up" style={{ background: "#FFEBEE", border: "1.5px solid #EF9A9A", borderRadius: 14, padding: "24px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏏💥</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#B71C1C", marginBottom: 6 }}>Query Bowled Out!</div>
            <div style={{ color: "#C62828", fontSize: 14 }}>{error}</div>
            <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => { playSound("click"); onBack(); }}>Try Again</button>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stats row */}
            <div className="fade-up" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { icon: "📊", label: "Rows Returned", val: result.rowCount, bg: "#E3F2FD", color: "#1565C0" },
                { icon: "📋", label: "Columns", val: result.columns.length, bg: "#E8F5E9", color: "#2E7D32" },
                { icon: "🏏", label: "Status", val: "Six! ✓", bg: "#FFF8E1", color: "#E65100" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.icon} {s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* SQL card */}
            <div className="fade-up" style={{ background: "#1A1A2E", borderRadius: 14, overflow: "hidden", animationDelay: "0.06s" }}>
              <button className="btn" style={{ width: "100%", background: "transparent", color: "#90CAF9", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600 }}
                onClick={() => { playSound("click"); setSqlOpen(o => !o); }}>
                <span>📝 Generated SQL</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{sqlOpen ? "▲ hide" : "▼ show"}</span>
              </button>
              {sqlOpen && (
                <pre style={{ margin: 0, padding: "0 18px 18px", fontSize: 13, color: "#A5D6A7", fontFamily: "'Courier New',monospace", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {result.sql}
                </pre>
              )}
            </div>

            {/* Results table */}
            <div className="fade-up" style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", animationDelay: "0.12s" }}>
              {result.rows.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="result-table">
                    <thead>
                      <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="row-anim" style={{ animationDelay: `${i * 0.03}s` }}>
                          {result.columns.map(c => (
                            <td key={c}>{row[c] === null ? <span style={{ color: "#B0BEC5" }}>—</span> : String(row[c])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "#90A4AE" }}>No rows returned for this query.</div>
              )}
              {result.rowCount >= 20 && (
                <div style={{ padding: "10px 18px", borderTop: "1px solid #EEF2F8", fontSize: 12, color: "#90A4AE" }}>
                  Showing up to 20 rows · Refine question for fewer results
                </div>
              )}
            </div>

            {/* Bottom action */}
            <div className="fade-up" style={{ textAlign: "center", animationDelay: "0.2s" }}>
              <button className="btn btn-blue" onClick={() => { playSound("bat"); onBack(); }}>🏏 Ask Another Question</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Home Page ──────────────────────────────────────────────────────────────────
function HomePage({ onQuery, onBrowse, onConnectDb }) {
  const [question, setQuestion] = useState("");
  const [hovered, setHovered] = useState(null);

  const submit = (q) => {
    const text = (q || question).trim();
    if (!text) return;
    playSound("bat");
    onQuery(text);
  };

  return (
    <div className="page-in-left" style={{ minHeight: "100vh", background: "#FFF8F0" }}>
      {/* Navbar */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #EDE7F6", padding: "0 28px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Ball size={30} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: "#1A1A2E" }}>DataTalk AI</div>
            <div style={{ fontSize: 10, color: "#90A4AE", marginTop: -2 }}>Ask your data in plain English</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {TEAMS.map(t => (
            <span key={t.name} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: t.color, color: t.text, fontSize: 9, fontWeight: 700, letterSpacing: 0.3, boxShadow: `0 2px 8px ${t.color}55`, border: "2px solid rgba(255,255,255,0.9)" }}>
              {t.name}
            </span>
          ))}
          <button className="btn btn-ghost" style={{ marginLeft: 8, padding: "7px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }} onClick={onConnectDb}>
            🔌 Connect DB
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(155deg,#1565C0 0%,#1A237E 55%,#4A148C 100%)", padding: "70px 28px 90px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Floating decorative balls */}
        {[{top:"18%",left:"6%",s:20,d:"0s"},{top:"72%",left:"4%",s:14,d:"1.2s"},{top:"22%",right:"8%",s:18,d:"0.6s"},{top:"65%",right:"6%",s:26,d:"1.8s"},{top:"45%",left:"15%",s:12,d:"0.9s"}].map((p, i) => (
          <div key={i} style={{ position: "absolute", ...p, opacity: 0.2, animation: `float 3.5s ease-in-out ${p.d} infinite` }}><Ball size={p.s} /></div>
        ))}

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>🏟️ Featured: IPL 2008–2022 · 260,920 Deliveries</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(28px,5vw,52px)", fontWeight: 700, color: "#fff", marginBottom: 14, lineHeight: 1.15 }}>
            Ask your database<br />anything, in plain English
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginBottom: 40, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
            No SQL needed. Just type your question — we'll handle the rest.<br />
            <span style={{ opacity: 0.6, fontSize: 14 }}>Powered by Groq AI · Works with any PostgreSQL database</span>
          </p>

          {/* Search box */}
          <div style={{ maxWidth: 620, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="e.g. Who scored the most runs in IPL finals?"
              rows={2}
              style={{ width: "100%", border: "none", padding: "18px 22px", fontSize: 16, background: "transparent", color: "#1A1A2E", resize: "none", fontFamily: "inherit", display: "block" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #F0F4F8" }}>
              <span style={{ fontSize: 12, color: "#90A4AE" }}>Enter to search · Shift+Enter for newline</span>
              <button className="btn btn-blue" style={{ padding: "9px 22px", fontSize: 14 }} onClick={() => submit()} disabled={!question.trim()}>
                🏏 Run Query
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Legends section */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#90A4AE", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 20 }}>
          🌟 Ask about your favourite legends
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 40 }}>
          {LEGENDS.map(l => (
            <button key={l.name} className="btn" onClick={() => { playSound("click"); submit(l.query); }}
              style={{ background: "#fff", border: `2px solid ${l.teamColor}33`, borderRadius: 16, padding: "20px 16px", textAlign: "center", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${l.teamColor}30`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{l.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1A1A2E", marginBottom: 2 }}>{l.name}</div>
              <div style={{ fontSize: 11, color: l.teamColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{l.team} · {l.short}</div>
              <div style={{ fontSize: 12, color: "#78909C", lineHeight: 1.4 }}>{l.query}</div>
            </button>
          ))}
        </div>

        {/* Browse CTA */}
        <div style={{ background: "linear-gradient(135deg,#FFF8E1,#FFFDE7)", border: "1.5px solid #FFE082", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#1A1A2E", marginBottom: 4 }}>
              🏏 Not sure what to ask?
            </div>
            <div style={{ fontSize: 14, color: "#78909C" }}>Browse all 20 curated questions · Easy, Medium &amp; Hard</div>
          </div>
          <button className="btn btn-gold" onClick={() => { playSound("click"); onBrowse(); }}>
            Explore Questions →
          </button>
        </div>

        {/* Connect Your Own DB promo banner */}
        <div style={{ background: "linear-gradient(135deg,#E8EAF6,#EDE7F6)", border: "1.5px solid #C5CAE9", borderRadius: 16, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ fontSize: 36, flexShrink: 0 }}>🔌</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: "#1A1A2E", marginBottom: 6 }}>
                Not a cricket fan? No problem.
              </div>
              <div style={{ fontSize: 14, color: "#5C6BC0", lineHeight: 1.6 }}>
                Connect your own PostgreSQL database and ask questions from it — in plain English, no SQL needed. Works with any data: sales, inventory, users, logs, you name it.
              </div>
            </div>
          </div>
          <button className="btn" style={{ background: "#3949AB", color: "#fff", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 700, flexShrink: 0, boxShadow: "0 4px 16px rgba(57,73,171,0.35)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(57,73,171,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(57,73,171,0.35)"; }}
            onClick={() => { playSound("click"); onConnectDb(); }}>
            Connect Your Database →
          </button>
        </div>

        {/* Footer team badges */}
        <div style={{ borderTop: "1px solid #EDE7F6", paddingTop: 24, paddingBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#B0BEC5", marginBottom: 14 }}>All teams · 2008 – 2022</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {TEAMS.map(t => (
              <span key={t.name} title={t.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: t.color, color: t.text, fontSize: 12, fontWeight: 700, boxShadow: `0 2px 8px ${t.color}44` }}>
                {t.name}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: "#CFD8DC" }}>DataTalk AI · Groq Llama3.3-70B · Supabase PostgreSQL</div>
        </div>
      </div>
    </div>
  );
}
// ── Connect Page (Custom Database) ──────────────────────────────────────────────
function ConnectPage({ onConnected, onBack }) {
  const [connStr, setConnStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!connStr.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: connStr.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      playSound("success");
      onConnected({ connectionString: connStr.trim(), ...data });
    } catch (e) { setError(e.message); playSound("error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-in" style={{ minHeight: "100vh", background: "#F0F4FF" }}>
      <nav style={{ background: "#fff", borderBottom: "1px solid #EDE7F6", padding: "0 28px", height: 62, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <button className="btn btn-ghost" style={{ padding: "7px 16px" }} onClick={onBack}>← Back to IPL</button>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16 }}>🔌 Connect Your Database</div>
      </nav>
      <div style={{ maxWidth: 680, margin: "60px auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🗄️</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32, fontWeight: 700, color: "#1A1A2E", marginBottom: 10 }}>Connect Any PostgreSQL Database</h1>
          <p style={{ color: "#546E7A", fontSize: 15, lineHeight: 1.6 }}>Paste your PostgreSQL connection string — we'll auto-discover your schema and let you query it in plain English.</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1.5px solid #E8E0F0" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#546E7A", display: "block", marginBottom: 8 }}>PostgreSQL Connection String</label>
          <textarea
            value={connStr}
            onChange={e => setConnStr(e.target.value)}
            placeholder="postgresql://username:password@host:5432/database"
            rows={3}
            style={{ width: "100%", border: "1.5px solid #CFD8DC", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontFamily: "'Courier New',monospace", color: "#1A1A2E", background: "#F8FAFF", resize: "none", transition: "border 0.15s", display: "block" }}
            onFocus={e => e.target.style.borderColor = "#1565C0"}
            onBlur={e => e.target.style.borderColor = "#CFD8DC"}
          />
          {error && (
            <div style={{ background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 13, color: "#C62828" }}>⚠️ {error}</div>
          )}
          <button className="btn btn-blue" style={{ marginTop: 20, width: "100%", padding: 14, fontSize: 15, opacity: loading || !connStr.trim() ? 0.6 : 1 }}
            onClick={handleConnect} disabled={loading || !connStr.trim()}>
            {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Ball size={20} spin /> Connecting & discovering schema...</span> : "🔌 Connect & Discover Schema"}
          </button>
        </div>
        <div style={{ marginTop: 24, background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E65100", marginBottom: 8 }}>ℹ️ Supported formats</div>
          <div style={{ fontSize: 12, color: "#78909C", fontFamily: "'Courier New',monospace", lineHeight: 2 }}>
            postgresql://user:pass@host:5432/dbname<br />
            postgres://user:pass@host:5432/dbname?sslmode=require<br />
            postgresql://project.id:pass@aws-pooler.supabase.com:6543/postgres
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "#90A4AE", textAlign: "center" }}>🔒 Your connection string is used only for the current session and never stored.</div>
      </div>
    </div>
  );
}

// ── Custom DB Home (after connected) ──────────────────────────────────────────
function CustomHomePage({ db, onQuery, onDisconnect }) {
  const [question, setQuestion] = useState("");
  const tableNames = Object.keys(db.tables || {});

  return (
    <div className="page-in-left" style={{ minHeight: "100vh", background: "#F0F4FF" }}>
      <nav style={{ background: "#1A237E", padding: "0 28px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🗄️</span>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>Custom Database</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{db.tableCount} tables · {db.columnCount} columns</div>
          </div>
        </div>
        <button className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13 }} onClick={onDisconnect}>⬅ IPL Mode</button>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px" }}>
        {/* Search box */}
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", marginBottom: 28 }}>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (question.trim()) { playSound("bat"); onQuery(question.trim()); } } }}
            placeholder="Ask anything about your database in plain English..."
            rows={2} style={{ width: "100%", border: "none", padding: "18px 22px", fontSize: 16, background: "transparent", color: "#1A1A2E", resize: "none", fontFamily: "inherit", display: "block" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: "1px solid #F0F4F8" }}>
            <span style={{ fontSize: 12, color: "#90A4AE" }}>Enter to search · Shift+Enter for newline</span>
            <button className="btn btn-blue" style={{ padding: "9px 22px", fontSize: 14 }} onClick={() => { if (question.trim()) { playSound("bat"); onQuery(question.trim()); } }} disabled={!question.trim()}>▶ Run Query</button>
          </div>
        </div>

        {/* Schema explorer */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#546E7A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>📋 Discovered Schema — {db.tableCount} tables</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
          {tableNames.map(tbl => (
            <div key={tbl} style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1.5px solid #E8E0F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A2E" }}>📁 {tbl}</div>
                {db.rowCounts?.[tbl] !== undefined && (
                  <span style={{ fontSize: 11, background: "#E3F2FD", color: "#1565C0", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{db.rowCounts[tbl].toLocaleString()} rows</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {db.tables[tbl].slice(0, 6).map(col => (
                  <div key={col.column} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: col.pk ? "#1565C0" : "#37474F", fontWeight: col.pk ? 600 : 400 }}>{col.pk ? "🔑 " : ""}{col.column}</span>
                    <span style={{ color: "#90A4AE", fontFamily: "'Courier New',monospace", fontSize: 11 }}>{col.type}</span>
                  </div>
                ))}
                {db.tables[tbl].length > 6 && <div style={{ fontSize: 11, color: "#90A4AE", marginTop: 2 }}>+{db.tables[tbl].length - 6} more columns</div>}
              </div>
              <button className="btn" style={{ marginTop: 10, width: "100%", background: "#F0F4FF", color: "#1565C0", borderRadius: 8, padding: "6px 0", fontSize: 12, fontWeight: 600 }}
                onClick={() => { const q = `Show first 10 rows from ${tbl}`; playSound("click"); onQuery(q); }}>Preview table →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");   // "home" | "connect" | "customHome" | "results"
  const [browseOpen, setBrowseOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customDb, setCustomDb] = useState(null);   // { connectionString, tables, schemaText, rowCounts, ... }

  const runQuery = async (q, overrideDb = null) => {
    const db = overrideDb || customDb;
    setQuestion(q);
    setResult(null);
    setError(null);
    setLoading(true);
    setPage("results");
    try {
      const body = { question: q };
      if (db) { body.connectionString = db.connectionString; body.customSchema = db.schemaText; }
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult(data);
      playSound("success");
    } catch (e) {
      setError(e.message);
      playSound("error");
    } finally {
      setLoading(false);
    }
  };

  const backFromResults = () => {
    setResult(null); setError(null);
    setPage(customDb ? "customHome" : "home");
  };

  return (
    <>
      {page === "home" && (
        <HomePage
          onQuery={runQuery}
          onBrowse={() => { playSound("click"); setBrowseOpen(true); }}
          onConnectDb={() => { playSound("click"); setPage("connect"); }}
        />
      )}
      {page === "connect" && (
        <ConnectPage
          onConnected={(db) => { setCustomDb(db); setPage("customHome"); }}
          onBack={() => setPage("home")}
        />
      )}
      {page === "customHome" && customDb && (
        <CustomHomePage
          db={customDb}
          onQuery={(q) => runQuery(q)}
          onDisconnect={() => { setCustomDb(null); setPage("home"); }}
        />
      )}
      {page === "results" && (
        <ResultsPage
          question={question}
          result={result}
          error={error}
          loading={loading}
          onBack={backFromResults}
          onNewQuery={runQuery}
        />
      )}
      {browseOpen && (
        <BrowseDrawer onQuery={runQuery} onClose={() => setBrowseOpen(false)} />
      )}
    </>
  );
}
