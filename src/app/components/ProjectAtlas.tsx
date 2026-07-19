import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, CheckCircle2, AlertTriangle, XCircle, Clock, Globe, TrendingUp, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Role } from "../types";

interface ProjectAtlasProps {
  role: Role;
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  approved: { color: "#16A34A", bg: "#F0FDF4", icon: CheckCircle2, label: "Approved" },
  submitted: { color: "#EAB308", bg: "#FEFCE8", icon: Clock, label: "Submitted" },
  under_review: { color: "#EAB308", bg: "#FEFCE8", icon: Clock, label: "Under Review" },
  rejected: { color: "#EF4444", bg: "#FEF2F2", icon: XCircle, label: "Rejected" },
  assigned: { color: "#2563EB", bg: "#EFF6FF", icon: TrendingUp, label: "Assigned" },
  changes_requested: { color: "#EA580C", bg: "#FFF7ED", icon: AlertTriangle, label: "Changes" },
};

const COLORS = ["#16A34A", "#2563EB", "#F59E0B", "#EC4899", "#7C3AED"];

export function ProjectAtlas({ role }: ProjectAtlasProps) {
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [deptStats, setDeptStats] = useState<Array<{ dept: string; count: number }>>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicResult, setTopicResult] = useState<"available" | "pending" | "taken" | null>(null);
  const [topicMatches, setTopicMatches] = useState<Array<Record<string, unknown>>>([]);
  const [topicLoading, setTopicLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topicError, setTopicError] = useState("");

  useEffect(() => {
    api.getAtlasData()
      .then(d => {
        setProjects(d.projects);
        setDeptStats(d.departmentStats);
        setError("");
      })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load atlas data"))
      .finally(() => setLoading(false));
  }, []);

  const checkTopicLocal = (q: string) => {
    const lower = q.toLowerCase();
    const matches = projects.filter(p =>
      String(p.Title).toLowerCase().includes(lower) ||
      String(p.Abstract || "").toLowerCase().includes(lower)
    ).slice(0, 5);
    let result: "available" | "pending" | "taken" = "available";
    if (matches.some(p => p.Status === "approved")) result = "taken";
    else if (matches.some(p => ["submitted", "under_review", "assigned", "pending_teacher", "changes_requested"].includes(String(p.Status)))) {
      result = "pending";
    }
    return { result, matches };
  };

  const checkTopic = async () => {
    if (!topicQuery.trim()) return;
    setTopicLoading(true);
    setTopicResult(null);
    setTopicMatches([]);
    setTopicError("");
    try {
      const r = await api.checkTopic(topicQuery.trim());
      setTopicResult(r.result);
      setTopicMatches(r.matches || []);
    } catch {
      const local = checkTopicLocal(topicQuery.trim());
      setTopicResult(local.result);
      setTopicMatches(local.matches);
    } finally {
      setTopicLoading(false);
    }
  };

  const departments = [...new Set(projects.map(p => String(p.Department || "Other")))];
  const searchLower = projectSearch.trim().toLowerCase();
  const filtered = (deptFilter === "all" ? projects : projects.filter(p => String(p.Department || "Other") === deptFilter))
    .filter(p => !searchLower || [
      String(p.Title), String(p.Abstract || ""), String(p.StudentName || ""),
      String(p.TeacherAssignedId || ""), String(p.StudentUniversityId || ""),
    ].some(s => s.toLowerCase().includes(searchLower)));

  const pieData = deptStats.map((d, i) => ({ name: d.dept, value: d.count, color: COLORS[i % COLORS.length] }));

  const heatmapData = deptStats.map(d => {
    const deptProjects = projects.filter(p => String(p.Department || "Other") === d.dept);
    return {
      dept: d.dept,
      approved: deptProjects.filter(p => p.Status === "approved").length,
      pending: deptProjects.filter(p => ["submitted", "under_review"].includes(String(p.Status))).length,
      rejected: deptProjects.filter(p => p.Status === "rejected").length,
      in_progress: deptProjects.filter(p => ["assigned", "changes_requested"].includes(String(p.Status))).length,
    };
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Project Atlas...</div>;

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto pb-24">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: "linear-gradient(135deg, #16A34A 0%, #2563EB 100%)" }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={20} className="text-white/80" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>University Project Map</span>
          </div>
          <h1 style={{ color: "white", fontSize: 26, fontWeight: 800 }}>Project Atlas</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 4 }}>
            {projects.length} projects across {deptStats.length} departments
          </p>
        </div>
      </motion.div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <motion.div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold mb-3">Topic Occupancy Checker</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={topicQuery} onChange={e => { setTopicQuery(e.target.value); setTopicResult(null); }}
              onKeyDown={e => e.key === "Enter" && checkTopic()}
              placeholder="Check if topic is available..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-gray-50 text-sm" />
          </div>
          <button onClick={checkTopic} disabled={topicLoading || !topicQuery.trim()}
            className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm bg-green-600 disabled:opacity-50">
            {topicLoading ? "Checking..." : "Check"}
          </button>
        </div>
        {topicResult && (
          <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 ${
            topicResult === "available" ? "bg-green-50 border border-green-200" :
            topicResult === "pending" ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"
          }`}>
            {topicResult === "available" && <><CheckCircle2 size={18} className="text-green-600" /><span className="text-sm font-semibold text-green-700">Available — no similar projects in the database</span></>}
            {topicResult === "pending" && <><AlertTriangle size={18} className="text-yellow-600" /><span className="text-sm font-semibold text-yellow-700">Similar topic exists — under review or in progress</span></>}
            {topicResult === "taken" && <><XCircle size={18} className="text-red-600" /><span className="text-sm font-semibold text-red-700">Taken — similar topic already approved</span></>}
          </div>
        )}
        {topicMatches.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase">Matching projects</p>
            {topicMatches.map(m => (
              <div key={String(m.ProjectId)} className="text-sm bg-gray-50 rounded-lg px-3 py-2 border">
                <span className="font-semibold">{String(m.Title)}</span>
                <span className="text-xs text-gray-500 ml-2 capitalize">· {String(m.Status)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border p-5">
          <h3 className="font-bold mb-4">Department Heatmap</h3>
          {heatmapData.length === 0 ? <p className="text-sm text-gray-400">No data yet</p> : heatmapData.map(d => {
            const total = d.approved + d.pending + d.rejected + d.in_progress || 1;
            return (
              <div key={d.dept} className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold min-w-[40px]">{d.dept}</span>
                <div className="flex-1 flex h-6 rounded-lg overflow-hidden gap-0.5">
                  {d.approved > 0 && <div className="h-full bg-green-500" style={{ width: `${(d.approved / total) * 100}%` }} />}
                  {d.pending > 0 && <div className="h-full bg-yellow-500" style={{ width: `${(d.pending / total) * 100}%` }} />}
                  {d.rejected > 0 && <div className="h-full bg-red-500" style={{ width: `${(d.rejected / total) * 100}%` }} />}
                  {d.in_progress > 0 && <div className="h-full bg-blue-500" style={{ width: `${(d.in_progress / total) * 100}%` }} />}
                </div>
                <span className="text-xs text-gray-500">{total}</span>
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold mb-3">By Department</h3>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <h3 className="font-bold">All Projects</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-8 pr-3 py-1.5 rounded-lg border text-xs w-40 sm:w-48" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border text-xs">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="divide-y">
          {filtered.map(p => {
            const cfg = statusConfig[String(p.Status)] || statusConfig.assigned;
            return (
              <div key={String(p.ProjectId)} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                  <cfg.icon size={16} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{String(p.Title)}</p>
                  <p className="text-xs text-gray-500">{String(p.StudentName || "Unassigned")} · {String(p.Department || "—")} · {String(p.TeacherAssignedId)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <Link to={`/projects/${p.ProjectId}`} className="text-xs text-blue-600 font-semibold">Open</Link>
              </div>
            );
          })}
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-600" /> Projects by Department</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={pieData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
