import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  FileSpreadsheet, FileText, ChevronLeft, ChevronRight
} from "lucide-react";
import type { Submission } from "../types";
import { getScoreColor } from "../types";
import { exportToExcel, exportToPdf } from "../utils/exportReport";

interface SubmissionsTableProps {
  data: Submission[];
  onExport?: (format: "pdf" | "excel") => void;
}

type SortKey = "student_name" | "project_title" | "uniqueness" | "submission_date" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

export function SubmissionsTable({ data, onExport }: SubmissionsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submission_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = [...data];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.student_name.toLowerCase().includes(q) ||
        s.project_title.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    if (scoreFilter === "high") result = result.filter(s => s.athena.uniqueness_score > 80);
    if (scoreFilter === "medium") result = result.filter(s => s.athena.uniqueness_score >= 50 && s.athena.uniqueness_score <= 80);
    if (scoreFilter === "low") result = result.filter(s => s.athena.uniqueness_score < 50);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "uniqueness") cmp = a.athena.uniqueness_score - b.athena.uniqueness_score;
      else if (sortKey === "student_name") cmp = a.student_name.localeCompare(b.student_name);
      else if (sortKey === "project_title") cmp = a.project_title.localeCompare(b.project_title);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else cmp = a.submission_date.localeCompare(b.submission_date);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, search, sortKey, sortDir, statusFilter, scoreFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-green-600" /> : <ChevronDown size={12} className="text-green-600" />;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(s => s.id)));
  };

  const handleExport = (format: "pdf" | "excel") => {
    const headers = ["Student", "Project", "Uniqueness Score", "AI Confidence", "Status", "Submission Date", "AI Suggestion"];
    const rows = filtered.map(s => [
      s.student_name, s.project_title, s.athena.uniqueness_score, s.athena.ai_confidence,
      s.status, s.submission_date, s.athena.ai_suggestion,
    ]);
    if (format === "excel") {
      exportToExcel("projecthub-submissions", headers, rows, "Submissions");
    } else {
      exportToPdf("ProjectHub — Submissions Report", headers, rows, "submissions.pdf");
    }
    onExport?.(format);
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#FEFCE8", text: "#EAB308" },
    approved: { bg: "#F0FDF4", text: "#16A34A" },
    rejected: { bg: "#FEF2F2", text: "#EF4444" },
    changes_requested: { bg: "#EFF6FF", text: "#2563EB" },
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search submissions..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-white">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={scoreFilter} onChange={e => { setScoreFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg border border-border text-sm bg-white">
          <option value="all">All AI Scores</option>
          <option value="high">High (&gt;80%)</option>
          <option value="medium">Medium (50-80%)</option>
          <option value="low">Low (&lt;50%)</option>
        </select>
        <div className="flex gap-1">
          <motion.button whileHover={{ scale: 1.03 }} onClick={() => handleExport("excel")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <FileSpreadsheet size={14} /> Excel
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} onClick={() => handleExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <FileText size={14} /> PDF
          </motion.button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selected.size === paged.length && paged.length > 0}
                  onChange={toggleAll} className="rounded border-gray-300" />
              </th>
              {([
                ["student_name", "Student"],
                ["project_title", "Project"],
                ["uniqueness", "AI Score"],
                ["status", "Status"],
                ["submission_date", "Date"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th key={key} className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort(key)}>
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                    <SortIcon col={key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left">
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>AI Verdict</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((s, i) => {
              const scoreColor = getScoreColor(s.athena.uniqueness_score);
              const sc = statusColors[s.status] || statusColors.pending;
              return (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: scoreColor }}>{s.student_avatar}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.student_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span style={{ fontSize: 12, color: "#374151" }}>{s.project_title}</span></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono font-bold text-xs"
                      style={{ background: `${scoreColor}15`, color: scoreColor }}>
                      {s.athena.uniqueness_score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{ background: sc.bg, color: sc.text }}>{s.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3"><span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-mono)" }}>{s.submission_date}</span></td>
                  <td className="px-4 py-3"><span style={{ fontSize: 11, color: "#64748B" }} className="line-clamp-1 max-w-[200px]">{s.athena.ai_suggestion}</span></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: "#64748B" }}>Rows per page:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="px-2 py-1 rounded border border-border text-xs">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#64748B" }}>{filtered.length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </motion.button>
          <span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-mono)" }}>
            {page + 1} / {Math.max(1, totalPages)}
          </span>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-gray-50">
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
