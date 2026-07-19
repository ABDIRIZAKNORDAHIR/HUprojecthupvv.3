import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Scan, Download, AlertTriangle, Sparkles, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import { mapApiRowToSubmission } from "../utils/mapSubmissions";
import { getScoreColor, type Submission } from "../types";
import { exportMultiSheetExcel, exportMultiSectionPdf } from "../utils/exportReport";

interface MatrixRow {
  id: string;
  student: string;
  avatar: string;
  project: string;
  uniqueness: number;
  collidesWith: string;
  action: "Approve" | "Review" | "Reject";
  aiSuggestion?: string;
}

export function BatchScanner() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<MatrixRow[] | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getSubmissionsList();
      setSubmissions(res.submissions.map(mapApiRowToSubmission));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = submissions.filter(s =>
    s.status === "pending" || s.status === "changes_requested"
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending.map(s => s.id)));
  };

  const runScan = async () => {
    if (!selected.size) return;
    setScanning(true);
    setError("");
    setScanMessage("");
    setResults(null);
    try {
      const projectIds = Array.from(selected).map(id => parseInt(id, 10));
      const res = await api.batchScan(projectIds);
      setScanMessage(res.message);
      const rows: MatrixRow[] = res.results.map(r => {
        const s = submissions.find(sub => sub.id === String(r.projectId));
        return {
          id: String(r.projectId),
          student: r.student,
          avatar: s?.student_avatar || r.student.slice(0, 2).toUpperCase(),
          project: r.project,
          uniqueness: r.uniqueness,
          collidesWith: r.collidesWith,
          action: r.action,
          aiSuggestion: r.aiSuggestion,
        };
      });
      setResults(rows);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch scan failed");
    } finally {
      setScanning(false);
    }
  };

  const exportResults = (format: 'excel' | 'pdf') => {
    if (!results?.length) return;
    const headers = ['Student', 'Project', 'Uniqueness %', 'Collides With', 'Suggested Action', 'AI Suggestion'];
    const rows = results.map(r => [r.student, r.project, r.uniqueness, r.collidesWith, r.action, r.aiSuggestion || '']);
    const stamp = new Date().toISOString().slice(0, 10);
    const sections = [{ title: 'Batch AI Scan Results', headers, rows }];
    if (format === 'excel') {
      exportMultiSheetExcel(`projecthub-batch-scan-${stamp}`, sections);
    } else {
      exportMultiSectionPdf('ProjectHub — Batch AI Scan', sections, `batch-scan-${stamp}.pdf`);
    }
  };

  const actionColors = { Approve: "#16A34A", Review: "#EAB308", Reject: "#EF4444" };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto pb-mobile-nav">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Scan size={20} className="text-white/80" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Admin Tool · Teacher-only AI</span>
          </div>
          <h1 style={{ color: "white", fontSize: 26, fontWeight: 800 }}>
            Batch AI Scanner
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 4 }}>
            Select submissions → Athena compares against your SQL database → Export advisory results for teachers
          </p>
        </div>
      </motion.div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
      {scanMessage && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 flex items-center gap-2">
          <CheckCircle2 size={16} /> {scanMessage}
        </p>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Pending Submissions</h3>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: "#64748B" }}>{selected.size} selected · {pending.length} available</span>
            {pending.length > 0 && (
              <button type="button" onClick={selectAll} className="text-xs font-semibold text-purple-600 hover:underline">
                {selected.size === pending.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No pending submissions to scan — students must submit projects first</p>
        ) : (
          <div className="space-y-2">
            {pending.map((s, i) => (
              <motion.label key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected.has(s.id) ? "border-green-300 bg-green-50/30" : "border-border hover:bg-gray-50"
                }`}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" />
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: getScoreColor(s.athena.uniqueness_score) }}>{s.student_avatar}</div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.student_name}</p>
                  <p style={{ fontSize: 11, color: "#64748B" }} className="truncate">{s.project_title}</p>
                </div>
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${getScoreColor(s.athena.uniqueness_score)}15`, color: getScoreColor(s.athena.uniqueness_score) }}>
                  {s.athena.uniqueness_score || "—"}%
                </span>
              </motion.label>
            ))}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={runScan} disabled={selected.size < 1 || scanning || pending.length === 0}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #16A34A, #2563EB)" }}>
          {scanning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Sparkles size={18} />
            </motion.div>
          ) : <Scan size={18} />}
          {scanning ? "Athena is analyzing via SQL..." : `Run Batch AI Scan (${selected.size} selected)`}
        </motion.button>
      </div>

      {results && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                Similarity Matrix ({results.length} submissions)
              </h3>
              <p style={{ fontSize: 12, color: "#64748B" }}>Saved to database — visible to teachers in AI Review Queue</p>
            </div>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => exportResults('excel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-gray-50">
                <FileSpreadsheet size={14} /> Export Excel
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} onClick={() => exportResults('pdf')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-gray-50">
                <Download size={14} /> Export PDF
              </motion.button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Student", "Uniqueness", "Collides With", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: getScoreColor(row.uniqueness) }}>{row.avatar}</div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{row.student}</span>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.project}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-sm" style={{ color: getScoreColor(row.uniqueness) }}>{row.uniqueness}%</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.collidesWith === "None" ? (
                        <span style={{ fontSize: 12, color: "#64748B" }}>None</span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-700 text-xs font-semibold">
                          <AlertTriangle size={12} /> {row.collidesWith}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: `${actionColors[row.action]}15`, color: actionColors[row.action] }}>
                        {row.action === "Review" && "⚠ "}{row.action}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
