import { useState, useEffect, useCallback } from "react";
import { Shield, FileText, User, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Trash2, Download, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";
import api from "../services/api";

const STATUS_COLORS = {
  GRANTED: { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
  REVOKED: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  EXPIRED: { bg: "rgba(107,114,128,0.15)", text: "#9ca3af", border: "rgba(107,114,128,0.3)" },
};

const PII_BADGE_COLORS = {
  AADHAAR: "#f59e0b",
  PAN: "#8b5cf6",
  PHONE: "#3b82f6",
  EMAIL: "#06b6d4",
  PASSPORT: "#ec4899",
};

export default function DpdpPanel() {
  const [consents, setConsents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, consentsRes] = await Promise.all([
        api.get("/dpdp/stats"),
        api.get(`/dpdp/all?page=${page}&limit=${LIMIT}${statusFilter ? `&status=${statusFilter}` : ""}`)
      ]);
      setStats(statsRes.data.data);
      setConsents(consentsRes.data.data || []);
      setTotal(consentsRes.data.total || 0);
    } catch (e) {
      console.error("DPDP fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = consents.filter(c =>
    !search ||
    c.dataSubjectName?.toLowerCase().includes(search.toLowerCase()) ||
    c.dataSubjectEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.file?.originalName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>DPDP Compliance Console</h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>India Digital Personal Data Protection Act 2023 — Consent & PII Management</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Consents", value: stats.total, color: "#6366f1", icon: <FileText size={18} /> },
            { label: "Active (Granted)", value: stats.granted, color: "#10b981", icon: <CheckCircle size={18} /> },
            { label: "Revoked", value: stats.revoked, color: "#ef4444", icon: <XCircle size={18} /> },
            { label: "Expired", value: stats.expired, color: "#9ca3af", icon: <Clock size={18} /> },
            { label: "PII Files", value: stats.piiFiles, color: "#f59e0b", icon: <AlertTriangle size={18} /> },
            { label: "Compliance Rate", value: `${stats.complianceRate}%`, color: "#06b6d4", icon: <Shield size={18} /> },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: s.color, marginBottom: 6 }}>{s.icon}<span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span></div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or file…" style={{ width: "100%", paddingLeft: 36, paddingRight: 12, height: 40, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 14 }}>
          <option value="">All Statuses</option>
          <option value="GRANTED">Granted</option>
          <option value="REVOKED">Revoked</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <button onClick={fetchData} style={{ height: 40, padding: "0 18px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Refresh</button>
      </div>

      {/* Consent Table */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-color)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                {["Data Subject", "File", "Purpose", "PII Types", "Status", "Expires", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>No consent records found</td></tr>
              ) : filtered.map(c => {
                const s = STATUS_COLORS[c.status] || STATUS_COLORS.EXPIRED;
                const isExpanded = expanded === c.id;
                return (
                  <>
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : c.id)}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.dataSubjectName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.dataSubjectEmail}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-primary)", maxWidth: 180 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.file?.originalName || "—"}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", maxWidth: 160 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.purpose}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(c.file?.sensitiveTypes || []).map(t => (
                            <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${PII_BADGE_COLORS[t]}22`, color: PII_BADGE_COLORS[t] || "#6366f1", border: `1px solid ${PII_BADGE_COLORS[t] || "#6366f1"}44` }}>{t}</span>
                          ))}
                          {(!c.file?.sensitiveTypes?.length) && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{c.status}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button title="View audit trail" style={{ background: "rgba(99,102,241,0.12)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#6366f1" }}>
                            <Eye size={14} />
                          </button>
                          {isExpanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-exp`}>
                        <td colSpan={7} style={{ padding: "0 16px 16px", background: "var(--bg-secondary)" }}>
                          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--border-color)", marginTop: 8 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 14 }}>
                              <div><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Lawful Basis</span><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.lawfulBasis}</div></div>
                              <div><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Masked Aadhaar</span><div style={{ fontWeight: 600, color: "#f59e0b", fontFamily: "monospace" }}>{c.file?.maskedAadhaar || "—"}</div></div>
                              <div><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Created</span><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{new Date(c.createdAt).toLocaleString("en-IN")}</div></div>
                              <div><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Access Logs</span><div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.accessLogs?.length || 0} entries</div></div>
                            </div>
                            {c.accessLogs?.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>RECENT ACCESS LOG</div>
                                {c.accessLogs.slice(0, 5).map(log => (
                                  <div key={log.id} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border-color)", fontSize: 12 }}>
                                    <span style={{ color: "#6366f1", fontWeight: 600, minWidth: 80 }}>{log.action}</span>
                                    <span style={{ color: "var(--text-primary)" }}>{log.accessedByName}</span>
                                    <span style={{ color: "var(--text-secondary)" }}>{new Date(log.timestamp).toLocaleString("en-IN")}</span>
                                    <span style={{ color: "var(--text-secondary)" }}>{log.ipAddress}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.retentionNotice && (
                              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", fontSize: 12, color: "#f59e0b" }}>
                                📋 {c.retentionNotice}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--border-color)" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page * LIMIT >= total ? "not-allowed" : "pointer", opacity: page * LIMIT >= total ? 0.4 : 1 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
