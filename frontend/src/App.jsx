import { useState, useCallback } from "react";

const API = "http://localhost:5000/api/lrc";

async function post(path, body) {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Bit table component ──────────────────────────────────────
function BitTable({ rows, chars, lrc, badColumns }) {
  const bad = new Set(badColumns ?? []);

  const renderBits = (bits) =>
    bits.split("").map((b, i) => (
      <span key={i} className={`bit${bad.has(i) ? " bad" : ""}`}>{b}</span>
    ));

  return (
    <div className="bit-table-wrapper">
      <table className="bit-table">
        <thead>
          <tr>
            <th>Char</th>
            <th>Bits (b7 → b0)</th>
          </tr>
        </thead>
        <tbody>
          {/* column index guide */}
          <tr className="col-header">
            <td />
            <td>
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={`bit${bad.has(i) ? " bad-col" : ""}`}
                  style={{ color: bad.has(i) ? "var(--error)" : "var(--text-muted)", fontWeight: bad.has(i) ? 700 : 400 }}
                >
                  {i}
                </span>
              ))}
            </td>
          </tr>
          {rows.map((bits, i) => (
            <tr key={i}>
              <td className="char-cell">{chars?.[i] ?? "·"}</td>
              <td className="bits-cell">{renderBits(bits)}</td>
            </tr>
          ))}
          {lrc && (
            <tr className="lrc-row">
              <td className="char-cell">LRC</td>
              <td className="bits-cell">{renderBits(lrc)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Verdict component ────────────────────────────────────────
function Verdict({ check }) {
  if (!check) return null;
  if (check.error)
    return (
      <div className="verdict error">
        <span className="verdict-icon">⚠️</span>
        <span>{check.error}</span>
      </div>
    );
  if (check.valid)
    return (
      <div className="verdict valid">
        <span className="verdict-icon">✅</span>
        <span>No error detected — LRC matches</span>
      </div>
    );
  const cols = check.bad_columns.map((c) => `b${c}`).join(", ");
  return (
    <>
      <div className="verdict invalid">
        <span className="verdict-icon">❌</span>
        <span>Error detected in column(s): {cols}</span>
      </div>
      <div className="info-box">
        <strong>Expected LRC:</strong> {check.expected_lrc}
        {"  "}|{"  "}
        <strong>Received LRC:</strong> {check.received_lrc}
        <br />
        <strong>Diff (XOR):</strong>{" "}
        <span style={{ fontFamily: "var(--mono)", letterSpacing: ".12em" }}>
          {check.diff_bits}
        </span>
        <br />
        ⚠️ <em>Note:</em> LRC cannot detect an even number of flips in the same column.
      </div>
    </>
  );
}

// ── Main app ─────────────────────────────────────────────────
export default function App() {
  // Sender state
  const [text, setText] = useState("HELLO");
  const [result, setResult] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");

  // Receiver state
  const [rxText, setRxText] = useState("");
  const [rxLrc, setRxLrc] = useState("");
  const [check, setCheck] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Corrupt button state
  const [corruptLoading, setCorruptLoading] = useState(false);

  // ── Generate LRC
  const handleGenerate = useCallback(async () => {
    setGenError("");
    setGenLoading(true);
    setResult(null);
    setCheck(null);
    try {
      const data = await post("generate", { text });
      setResult(data);
      setRxText(text);
      setRxLrc(data.lrc);
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenLoading(false);
    }
  }, [text]);

  // ── Verify LRC
  const handleVerify = useCallback(async () => {
    setVerifyError("");
    setVerifyLoading(true);
    setCheck(null);
    try {
      const data = await post("verify", { text: rxText, lrc: rxLrc });
      setCheck(data);
    } catch (e) {
      setVerifyError(e.message);
      setCheck({ error: e.message });
    } finally {
      setVerifyLoading(false);
    }
  }, [rxText, rxLrc]);

  // ── Corrupt (flip random bit)
  const handleCorrupt = useCallback(async () => {
    if (!rxText) return;
    setCorruptLoading(true);
    setCheck(null);
    try {
      const data = await post("corrupt", { text: rxText });
      setRxText(data.corrupted);
    } catch (e) {
      // silently ignore
    } finally {
      setCorruptLoading(false);
    }
  }, [rxText]);

  // ── Derived: bad columns from last verify
  const badCols = check && !check.error && !check.valid ? check.bad_columns : [];
  const rxRows = check?.rows ?? [];
  const rxChars = check?.chars ?? [];

  return (
    <div className="app">
      {/* Hero */}
      <header className="hero">
        <div className="hero-badge">⚡ Error Detection</div>
        <h1>LRC Visualiser</h1>
        <p>
          Longitudinal Redundancy Check — visualise XOR column parity,
          simulate bit corruption and catch transmission errors in real time.
        </p>
      </header>

      {/* ── Sender card ── */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon icon-blue">📤</div>
          Sender
        </div>

        <div className="input-group">
          <input
            id="sender-input"
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); setCheck(null); }}
            placeholder="Type a message…"
          />
          <button
            id="btn-generate"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!text.trim() || genLoading}
          >
            {genLoading ? <span className="spinner" /> : "⚡"}
            Generate LRC
          </button>
        </div>

        {genError && <div className="conn-error">🔌 {genError} — is the Flask backend running?</div>}

        {result && (
          <BitTable
            rows={result.rows}
            chars={result.chars}
            lrc={result.lrc}
          />
        )}
      </div>

      {/* ── Receiver card ── */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon icon-green">📥</div>
          Receiver
          <span style={{ marginLeft: "auto", fontSize: ".8rem", color: "var(--text-muted)", fontWeight: 400 }}>
            Edit fields to simulate corruption
          </span>
        </div>

        <div className="input-group">
          <input
            id="rx-text"
            type="text"
            value={rxText}
            onChange={(e) => { setRxText(e.target.value); setCheck(null); }}
            placeholder="Received message"
          />
        </div>

        <div className="input-group">
          <input
            id="rx-lrc"
            type="text"
            className="mono"
            value={rxLrc}
            onChange={(e) => { setRxLrc(e.target.value); setCheck(null); }}
            placeholder="Received LRC (8 bits)"
            maxLength={8}
          />
          <button
            id="btn-corrupt"
            className="btn btn-danger"
            onClick={handleCorrupt}
            disabled={!rxText || corruptLoading}
            title="Flip a random bit in the received message"
          >
            {corruptLoading ? <span className="spinner" /> : "💥"}
            Flip Random Bit
          </button>
          <button
            id="btn-verify"
            className="btn btn-ghost"
            onClick={handleVerify}
            disabled={!rxText || !rxLrc || verifyLoading}
          >
            {verifyLoading ? <span className="spinner" /> : "🔍"}
            Verify
          </button>
        </div>

        {verifyError && <div className="conn-error">🔌 {verifyError}</div>}

        {check && !check.error && (
          <BitTable
            rows={rxRows}
            chars={rxChars}
            lrc={rxLrc}
            badColumns={badCols}
          />
        )}

        <Verdict check={check} />
      </div>


    </div>
  );
}
