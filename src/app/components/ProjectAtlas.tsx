import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Search, CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp, BarChart3,
  Layers, Building2, X, ArrowUpRight, PieChart as PieIcon, Compass, ShieldCheck,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router";
import { api } from "../api/client";
import type { Role } from "../types";
import { PageHero } from "./PageHero";
import { AnimatedCounter } from "./AnimatedCounter";
import { WaitingMark } from "./WaitingIcon";
import { HU_IMAGES } from "../config/appImages";

interface ProjectAtlasProps {
  role: Role;
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  approved: { color: "#047857", bg: "#ecfdf5", icon: CheckCircle2, label: "Approved" },
  submitted: { color: "#b45309", bg: "#fff7e6", icon: Clock, label: "Submitted" },
  under_review: { color: "#b45309", bg: "#fff7e6", icon: Clock, label: "Under review" },
  pending_teacher: { color: "#b45309", bg: "#fff7e6", icon: Clock, label: "Awaiting teacher" },
  rejected: { color: "#b91c1c", bg: "#fef2f2", icon: XCircle, label: "Rejected" },
  assigned: { color: "#2563eb", bg: "#eff6ff", icon: TrendingUp, label: "Assigned" },
  changes_requested: { color: "#c2410c", bg: "#fff7ed", icon: AlertTriangle, label: "Changes asked" },
};

const COLORS = ["#10b981", "#0f766e", "#2563eb", "#f59e0b", "#7c3aed", "#ec4899"];

const HEAT_SEGMENTS = [
  { key: "approved", label: "Approved", color: "#10b981" },
  { key: "pending", label: "In review", color: "#f59e0b" },
  { key: "in_progress", label: "In progress", color: "#2563eb" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
] as const;

const tooltipStyle = {
  borderRadius: 14,
  border: "1px solid #e3eee8",
  boxShadow: "0 18px 40px rgba(6,48,31,.12)",
  fontSize: 12,
  fontWeight: 700,
} as const;

export function ProjectAtlas({ role: _role }: ProjectAtlasProps) {
  const reducedMotion = useReducedMotion();
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
      pending: deptProjects.filter(p => ["submitted", "under_review", "pending_teacher"].includes(String(p.Status))).length,
      rejected: deptProjects.filter(p => p.Status === "rejected").length,
      in_progress: deptProjects.filter(p => ["assigned", "changes_requested"].includes(String(p.Status))).length,
    };
  });

  const totals = useMemo(() => {
    const approved = projects.filter(p => p.Status === "approved").length;
    const review = projects.filter(p =>
      ["submitted", "under_review", "pending_teacher"].includes(String(p.Status))
    ).length;
    return { approved, review };
  }, [projects]);

  const kpis = [
    { key: 'all', icon: Layers, tone: 'emerald', value: projects.length, label: 'Projects mapped' },
    { key: 'approved', icon: ShieldCheck, tone: 'teal', value: totals.approved, label: 'Approved so far' },
    { key: 'review', icon: WaitingMark, tone: 'amber', value: totals.review, label: 'Waiting on review', waiting: true },
    { key: 'depts', icon: Building2, tone: 'blue', value: deptStats.length, label: 'Departments active' },
  ] as const;

  const topicMeta = {
    available: { icon: CheckCircle2, title: 'Topic is free', body: 'Nothing similar exists in the database — this idea is open to claim.' },
    pending: { icon: AlertTriangle, title: 'Something similar is in progress', body: 'A close topic is under review or being built right now.' },
    taken: { icon: XCircle, title: 'Topic already approved', body: 'An approved project covers this ground — narrow the angle before submitting.' },
  } as const;

  if (loading) {
    return (
      <div className="atlas p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto pb-mobile-nav">
        <div className="atlas-skeleton atlas-skeleton--hero" />
        <div className="atlas-kpis">
          {[1, 2, 3, 4].map(i => <div key={i} className="atlas-skeleton atlas-skeleton--kpi" />)}
        </div>
        <div className="atlas-skeleton atlas-skeleton--block" />
      </div>
    );
  }

  return (
    <div className="atlas p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto pb-mobile-nav">
      <PageHero
        icon={Compass}
        eyebrow="University project map"
        title="Project Atlas"
        subtitle="Every project across the university on one map — check whether a topic is free before a single line is written."
        image={HU_IMAGES.campus}
      >
        <div className="atlas-hero-panel">
          <span className="atlas-hero-panel__icon"><Compass size={20} /></span>
          <div>
            <strong><AnimatedCounter value={projects.length} /></strong>
            <em>{deptStats.length} department{deptStats.length === 1 ? '' : 's'} covered</em>
          </div>
        </div>
      </PageHero>

      {error && (
        <p className="atlas-alert" role="alert"><AlertTriangle size={15} /> {error}</p>
      )}

      <div className="atlas-kpis">
        {kpis.map((kpi, i) => (
          <motion.article
            key={kpi.key}
            className={`atlas-kpi atlas-kpi--${kpi.tone}`}
            initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="atlas-kpi__icon">
              {'waiting' in kpi ? <WaitingMark size={18} /> : <kpi.icon size={18} />}
            </span>
            <div>
              <strong><AnimatedCounter value={kpi.value} /></strong>
              <p>{kpi.label}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <section className="atlas-checker">
        <div className="atlas-checker__head">
          <span><Search size={18} /></span>
          <div>
            <h3>Topic occupancy checker</h3>
            <p>Type an idea and Atlas searches every title and abstract already stored.</p>
          </div>
        </div>

        <div className="atlas-checker__field">
          <Search size={16} />
          <input
            value={topicQuery}
            onChange={e => { setTopicQuery(e.target.value); setTopicResult(null); }}
            onKeyDown={e => e.key === "Enter" && checkTopic()}
            placeholder="e.g. mobile payment fraud detection"
            aria-label="Topic to check"
          />
          {topicQuery && (
            <button type="button" className="atlas-checker__clear" onClick={() => { setTopicQuery(''); setTopicResult(null); setTopicMatches([]); }} aria-label="Clear topic">
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="atlas-checker__go"
            onClick={checkTopic}
            disabled={topicLoading || !topicQuery.trim()}
          >
            {topicLoading ? 'Checking…' : 'Check topic'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {topicResult && (
            <motion.div
              key={topicResult}
              className={`atlas-verdict atlas-verdict--${topicResult}`}
              initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>
                {topicResult === 'pending'
                  ? <WaitingMark size={18} />
                  : (() => { const Icon = topicMeta[topicResult].icon; return <Icon size={18} />; })()}
              </span>
              <div>
                <strong>{topicMeta[topicResult].title}</strong>
                <p>{topicMeta[topicResult].body}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {topicMatches.length > 0 && (
          <div className="atlas-matches">
            <p>Closest matches</p>
            <ul>
              {topicMatches.map(m => {
                const cfg = statusConfig[String(m.Status)] || statusConfig.assigned || statusConfig.approved;
                return (
                  <li key={String(m.ProjectId)}>
                    <span style={{ background: cfg.bg, color: cfg.color }}><cfg.icon size={13} /></span>
                    <strong>{String(m.Title)}</strong>
                    <em style={{ color: cfg.color }}>{cfg.label}</em>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="atlas-charts">
        <section className="report-chart">
          <div className="report-chart__head">
            <div>
              <span className="report-chart__icon"><BarChart3 size={16} /></span>
              <div>
                <h3>Department heatmap</h3>
                <p>How each department's workload breaks down</p>
              </div>
            </div>
            <em>Status mix</em>
          </div>

          {heatmapData.length === 0 ? (
            <p className="atlas-muted">No department data yet.</p>
          ) : (
            <>
              <ul className="atlas-heat">
                {heatmapData.map((d, rowIndex) => {
                  const total = d.approved + d.pending + d.rejected + d.in_progress || 1;
                  return (
                    <li key={d.dept}>
                      <span className="atlas-heat__label" title={d.dept}>{d.dept}</span>
                      <span className="atlas-heat__bar">
                        {HEAT_SEGMENTS.map(seg => {
                          const value = d[seg.key];
                          if (!value) return null;
                          return (
                            <motion.i
                              key={seg.key}
                              title={`${seg.label}: ${value}`}
                              style={{ background: seg.color }}
                              initial={reducedMotion ? undefined : { width: 0 }}
                              animate={{ width: `${(value / total) * 100}%` }}
                              transition={{ duration: 0.7, delay: rowIndex * 0.06, ease: [0.22, 1, 0.36, 1] }}
                            />
                          );
                        })}
                      </span>
                      <span className="atlas-heat__total">{total}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="report-legend">
                {HEAT_SEGMENTS.map(seg => (
                  <span key={seg.key}><i style={{ background: seg.color }} />{seg.label}</span>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="report-chart">
          <div className="report-chart__head">
            <div>
              <span className="report-chart__icon report-chart__icon--teal"><PieIcon size={16} /></span>
              <div>
                <h3>By department</h3>
                <p>Share of all mapped projects</p>
              </div>
            </div>
            <em>Split</em>
          </div>

          {pieData.length === 0 ? (
            <p className="atlas-muted">No projects to chart yet.</p>
          ) : (
            <>
              <div className="report-donut">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={4}
                      cornerRadius={8}
                      dataKey="value"
                      strokeWidth={0}
                      animationDuration={reducedMotion ? 0 : 900}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="report-donut__center">
                  <strong>{projects.length}</strong>
                  <span>Projects</span>
                </div>
              </div>
              <div className="report-legend">
                {pieData.map(item => (
                  <span key={item.name}>
                    <i style={{ background: item.color }} />{item.name}<strong>{item.value}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="atlas-panel">
        <header className="atlas-panel__head">
          <div>
            <h3>All projects</h3>
            <p>{filtered.length} shown of {projects.length} mapped</p>
          </div>
          <div className="atlas-panel__tools">
            <label className="atlas-search">
              <Search size={14} />
              <input
                type="search"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder="Search title, student or HU ID"
                aria-label="Search projects"
              />
              {projectSearch && (
                <button type="button" onClick={() => setProjectSearch('')} aria-label="Clear search"><X size={13} /></button>
              )}
            </label>
            <div className="atlas-select">
              <Building2 size={14} />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} aria-label="Filter by department">
                <option value="all">All departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </header>

        {filtered.length === 0 ? (
          <div className="atlas-empty">
            <span><Compass size={26} /></span>
            <strong>{projects.length === 0 ? 'The atlas is still empty' : 'Nothing matches those filters'}</strong>
            <p>
              {projects.length === 0
                ? 'Once students create projects they are mapped here automatically.'
                : 'Try a different search term or switch back to all departments.'}
            </p>
          </div>
        ) : (
          <ul className="atlas-rows">
            {filtered.map((p, i) => {
              const cfg = statusConfig[String(p.Status)] || statusConfig.assigned || statusConfig.approved;
              const waiting = ['submitted', 'under_review', 'pending_teacher'].includes(String(p.Status));
              return (
                <motion.li
                  key={String(p.ProjectId)}
                  initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.35) }}
                >
                  <Link to={`/projects/${p.ProjectId}`} className="atlas-row">
                    <span className="atlas-row__icon" style={{ background: cfg.bg, color: cfg.color }}>
                      {waiting ? <WaitingMark size={16} /> : <cfg.icon size={16} />}
                    </span>
                    <span className="atlas-row__identity">
                      <strong>{String(p.Title)}</strong>
                      <em>
                        {String(p.StudentName || 'Unassigned')} · {String(p.Department || '—')}
                        {p.TeacherAssignedId ? ` · ${String(p.TeacherAssignedId)}` : ''}
                      </em>
                    </span>
                    <span className="atlas-row__status" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="atlas-row__open">Open <ArrowUpRight size={13} /></span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      {pieData.length > 0 && (
        <section className="report-chart">
          <div className="report-chart__head">
            <div>
              <span className="report-chart__icon report-chart__icon--blue"><BarChart3 size={16} /></span>
              <div>
                <h3>Projects by department</h3>
                <p>Volume comparison across faculties</p>
              </div>
            </div>
            <em>Volume</em>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pieData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="atlasBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef4f1" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5d7b72', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5d7b72' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(16,185,129,.07)' }} contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                name="Projects"
                fill="url(#atlasBar)"
                radius={[10, 10, 4, 4]}
                maxBarSize={72}
                animationDuration={reducedMotion ? 0 : 900}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
