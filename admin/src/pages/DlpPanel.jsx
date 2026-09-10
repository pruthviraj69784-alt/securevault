import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Shield, Activity, BarChart2, CheckCircle, XCircle, Clock, Eye, Zap, Radio } from "lucide-react";
import api from "../services/api";

const SEV_COLORS = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.35)" },
  HIGH:     { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", border: "rgba(245,158,11,0.35)" },
  MEDIUM:   { bg: "rgba(99,102,241,0.15)", text: "#6366f1", border: "rgba(99,102,241,0.35)" },
  LOW:      { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.35)" },
};

const STATUS_COLORS = {
  OPEN:          { bg: "rgba(239,68,68,0.15)",  text: "#ef4444" },
  INVESTIGATING: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  RESOLVED:      { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  BLOCKED:       { bg: "rgba(107,114,128,0.15)",text: "#9ca3af" },
};

function RiskGauge({ value }) {
  const color = value >= 70 ? "#ef4444" : value >= 40 ? "#f59e0b" : "#10b981";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={60} cy={60} r={45} fill="none" stroke="var(--border-color)" strokeWidth={10} />
        <circle cx={60} cy={60} r={45} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 800, color }}>{value}</span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>RISK INDEX</span>
      </div>
    </div>
  );
}

export default function DlpPanel() {
  const [metrics, setMetrics]   = useState(null);
  const [alerts, setAlerts]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [sevFilter, setSevFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [tab, setTab]           = useState("alerts"); // "alerts" | "report"
  const [liveAlerts, setLiveAlerts] = useState([]);
  const wsRef = useRef(null);
  const LIMIT = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (sevFilter) params.set("severity", sevFilter);
      if (statusFilter) params.set("status", statusFilter);

      const [mRes, aRes, rRes] = await Promise.all([
        api.get("/dlp/metrics"),
        api.get(`/dlp/alerts?${params}`),
        api.get("/dlp/compliance-report"),
      ]);
      setMetrics(mRes.data.data);
      setAlerts(aRes.data.data || []);
      setTotal(aRes.data.total || 0);
      setReport(rRes.data.data);
    } catch (e) {
      console.error("DLP fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [page, sevFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live WebSocket for DLP_ALERT events
  useEffect(() => {
    const token = localStorage.getItem("sv_admin_token");
    if (!token) return;
    try {
      const wsBase = (import.meta.env.VITE_WS_URL || "ws://localhost:5000").replace(/^http/, "ws");
      const ws = new WebSocket(`${wsBase}?token=${token}`);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "DLP_ALERT") {
            setLiveAlerts(prev => [msg.data, ...prev].slice(0, 20));
          }
        } catch {}
      };
      return () => ws.close();
    } catch {}
  }, []);

  const mitigate = async (id, action) => {
    try {
      await api.post(`/dlp/alerts/${id}/mitigate`, { action });
      fetchData();
    } catch (e) {
      console.error("Mitigate failed", e);
    }
  };

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#ef4444,#b91c1c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Data Leak Prevention</h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Real-time monitoring · Anomaly detection · Compliance dashboard</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {liveAlerts.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Radio size={14} color="#ef4444" className="pulse" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>LIVE · {liveAlerts.length} new</span>
            </div>
          )}
          <button onClick={fetchData} style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Refresh</button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 28 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-color)", padding: "24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <RiskGauge value={metrics.riskIndex} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Organisation Risk</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14 }}>
            {[
              { label: "Total Alerts", value: metrics.totalAlerts, color: "#6366f1" },
              { label: "Open", value: metrics.openAlerts, color: "#ef4444" },
              { label: "Critical", value: metrics.criticalAlerts, color: "#ef4444" },
              { label: "High", value: metrics.highAlerts, color: "#f59e0b" },
              { label: "Resolved", value: metrics.resolvedAlerts, color: "#10b981" },
            ].map(m => (
              <div key={m.label} style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)", padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
            {/* Channel breakdown */}
            <div style={{ background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)", padding: "16px 18px", gridColumn: "span 2" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>BY CHANNEL</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(metrics.channelBreakdown || {}).map(([ch, cnt]) => (
                  <div key={ch} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.25)", fontWeight: 600 }}>
                    {ch}: {cnt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Alert Feed */}
      {liveAlerts.length > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} /> LIVE ALERT STREAM
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {liveAlerts.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "var(--text-primary)" }}>
                <span style={{ ...SEV_COLORS[a.severity], padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{a.severity}</span>
                <span style={{ fontWeight: 600 }}>{a.rule}</span>
                <span style={{ color: "var(--text-secondary)" }}>{a.channel}</span>
                <span style={{ color: "var(--text-secondary)", marginLeft: "auto" }}>{new Date(a.timestamp).toLocaleTimeString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border-color)" }}>
        {[["alerts", "Alerts"], ["report", "Compliance Report"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", background: "none", border: "none", borderBottom: tab === t ? "2px solid #6366f1" : "2px solid transparent", color: tab === t ? "#6366f1" : "var(--text-secondary)", fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 14, marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === "alerts" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[["", "All Severity"], ["CRITICAL", "Critical"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]].map(([v, l]) => (
              <button key={v} onClick={() => { setSevFilter(v); setPage(1); }} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${sevFilter === v ? "#6366f1" : "var(--border-color)"}`, background: sevFilter === v ? "rgba(99,102,241,0.15)" : "var(--bg-card)", color: sevFilter === v ? "#6366f1" : "var(--text-secondary)", cursor: "pointer", fontWeight: sevFilter === v ? 700 : 400, fontSize: 13 }}>{l}</button>
            ))}
            <div style={{ marginLeft: "auto" }}>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 13 }}>
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>

          {/* Alerts Table */}
          <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-color)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                  {["Severity", "Rule", "Channel", "File / User", "Risk Score", "Status", "Time", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading…</td></tr>
                ) : alerts.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>No alerts found</td></tr>
                ) : alerts.map(a => {
                  const sc = SEV_COLORS[a.severity] || SEV_COLORS.LOW;
                  const stc = STATUS_COLORS[a.status] || STATUS_COLORS.OPEN;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{a.severity}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>{a.ruleTriggered}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#6366f1", fontWeight: 600 }}>{a.channel}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{a.file?.originalName || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{a.user?.email || a.ipAddress}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 50, height: 6, borderRadius: 3, background: "var(--border-color)", overflow: "hidden" }}>
                            <div style={{ width: `${a.riskScore}%`, height: "100%", background: a.riskScore >= 70 ? "#ef4444" : a.riskScore >= 40 ? "#f59e0b" : "#10b981", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{a.riskScore}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: stc.bg, color: stc.text }}>{a.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {a.status === "OPEN" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => mitigate(a.id, "INVESTIGATE")} title="Investigate" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#f59e0b", fontSize: 11, fontWeight: 600 }}>Investigate</button>
                            <button onClick={() => mitigate(a.id, "BLOCK")} title="Block" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 600 }}>Block</button>
                            <button onClick={() => mitigate(a.id, "RESOLVE")} title="Resolve" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#10b981", fontSize: 11, fontWeight: 600 }}>Resolve</button>
                          </div>
                        )}
                        {a.status !== "OPEN" && <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{total} total alerts</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
                <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", opacity: page * LIMIT >= total ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "report" && report && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Report Header */}
          <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-color)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Compliance Report</h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{report.framework}</p>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Generated: {new Date(report.generatedAt).toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 14 }}>
              {Object.entries(report.summary).filter(([k]) => typeof report.summary[k] !== "object").map(([k, v]) => (
                <div key={k} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{k.replace(/([A-Z])/g, " $1").trim()}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Violations */}
          <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-color)", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Top Violations</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {report.topViolations.map((v, i) => {
                const sc = SEV_COLORS[v.severity] || SEV_COLORS.LOW;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: sc.bg, color: sc.text }}>{v.severity}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{v.rule}</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{v.count}×</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-color)", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recommendations</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {report.recommendations.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <span style={{ color: "#6366f1", fontWeight: 700 }}>→</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
