import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Scan, Download, AlertTriangle, FileSpreadsheet, CheckCircle2,
  Search, ShieldCheck, Layers, X, Database, ArrowRight, Radar,
  Award, IdCard, Building2, GraduationCap, CalendarDays, BadgeCheck,
} from "lucide-react";
import { api } from "../api/client";
import { mapApiRowToSubmission } from "../utils/mapSubmissions";
import { getScoreColor, type Submission } from "../types";
import { exportMultiSheetExcel, exportMultiSectionPdf } from "../utils/exportReport";
import { PageHero } from "./PageHero";
import { AnimatedCounter } from "./AnimatedCounter";
import { WaitingMark } from "./WaitingIcon";
import { UserAvatar } from "./UserAvatar";
import { HU_IMAGES } from "../config/appImages";

interface OriginalOwner {
  projectId: number | null;
  teacherAssignedId?: string | null;
  title: string;
  status?: string;
  claimedAt?: string | null;
  studentId?: number | null;
  name: string;
  universityId: string;
  department: string;
  className: string;
  studyMode?: string;
  photo: string | null;
  similarity?: number;
}

interface MatrixRow {
  id: string;
  student: string;
  avatar: string;
  photo?: string | null;
  project: string;
  uniqueness: number;
  collidesWith: string;
  action: "Approve" | "Review" | "Reject";
  aiSuggestion?: string;
  isOriginal: boolean;
  universityId: string;
  departmentName: string;
  className: string;
  studyMode: string;
  assignedAt: string | null;
  originalOwner: OriginalOwner | null;
  laterCopies: OriginalOwner[];
}

const ACTION_META = {
  Approve: { color: "#047857", bg: "#ecfdf5", border: "#bbf7d0" },
  Review: { color: "#b45309", bg: "#fff7e6", border: "#fde3ac" },
  Reject: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
} as const;

/** Below this uniqueness score a submission is worth a closer look. */
const FLAG_THRESHOLD = 70;

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "",
    last: parts.slice(1).join(" "),
  };
}

function formatClaimed(raw?: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function identityLine(s: Submission) {
  return [
    s.university_id,
    s.department_name,
    s.class_name,
    s.study_mode,
  ].filter(Boolean).join(" · ");
}

function ownerFromRow(row: MatrixRow): OriginalOwner {
  return row.originalOwner || {
    projectId: Number(row.id) || null,
    title: row.project,
    claimedAt: row.assignedAt,
    name: row.student,
    universityId: row.universityId,
    department: row.departmentName,
    className: row.className,
    studyMode: row.studyMode,
    photo: row.photo || null,
  };
}

function actionMeta(action: MatrixRow["action"]) {
  return ACTION_META[action] || ACTION_META.Review;
}

/** Match every search token against student, project, HU ID, or abstract. */
function matchesSubmissionSearch(s: Submission, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = [
    s.student_name,
    s.project_title,
    s.university_id,
    s.department,
    s.department_name,
    s.class_name,
    s.abstract,
    s.id,
  ].map(v => String(v || "").toLowerCase()).join(" ");
  return tokens.every(token => haystack.includes(token));
}

function OriginJar({
  owner,
  uniqueness,
  copies,
}: {
  owner: OriginalOwner;
  uniqueness?: number;
  copies: number;
}) {
  const names = splitName(owner.name);
  return (
    <article className="origin-jar">
      <div className="origin-jar__lid" aria-hidden="true" />
      <span className="origin-jar__seal">
        <Award size={14} /> Original owner
      </span>
      <div className="origin-jar__body">
        <UserAvatar
          firstName={names.first}
          lastName={names.last}
          profileImageUrl={owner.photo}
          role="student"
          size="xl"
          className="origin-jar__photo"
        />
        <div className="origin-jar__who">
          <p className="origin-jar__eyebrow">This topic belongs to</p>
          <h4>{owner.name}</h4>
          <ul className="origin-jar__facts">
            <li><IdCard size={14} /><span>HU ID</span><strong>{owner.universityId || "—"}</strong></li>
            <li><Building2 size={14} /><span>Department</span><strong>{owner.department || "—"}</strong></li>
            <li>
              <GraduationCap size={14} />
              <span>Class</span>
              <strong>{[owner.className, owner.studyMode].filter(Boolean).join(" · ") || "—"}</strong>
            </li>
            <li><CalendarDays size={14} /><span>Registered</span><strong>{formatClaimed(owner.claimedAt)}</strong></li>
          </ul>
        </div>
        <div className="origin-jar__project">
          <em>Original project</em>
          <strong>{owner.title || "Untitled topic"}</strong>
          <p>
            {uniqueness != null ? `${uniqueness}% uniqueness` : "First registered owner"}
            {copies ? ` · ${copies} later overlapping claim${copies === 1 ? "" : "s"}` : " · no later overlap"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function BatchScanner() {
  const reducedMotion = useReducedMotion();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<MatrixRow[] | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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

  const pending = useMemo(
    () => submissions.filter(s => s.status === "pending" || s.status === "changes_requested"),
    [submissions],
  );

  const visible = useMemo(() => {
    const q = search.trim();
    if (!q) return pending;
    return pending.filter(s => matchesSubmissionSearch(s, q));
  }, [pending, search]);

  const visibleFlagged = useMemo(
    () => visible.filter(s => (s.athena.uniqueness_score || 0) < FLAG_THRESHOLD),
    [visible],
  );

  const averageUniqueness = pending.length
    ? Math.round(pending.reduce((sum, s) => sum + (s.athena.uniqueness_score || 0), 0) / pending.length)
    : 0;

  const collisions = results ? results.filter(r => !r.isOriginal && r.collidesWith !== "None").length : 0;
  const originalCount = results ? results.filter(r => r.isOriginal).length : 0;

  const clusters = useMemo(() => {
    if (!results?.length) return [];
    const map = new Map<string, { key: string; original: OriginalOwner; scannedOriginal?: MatrixRow; copies: MatrixRow[] }>();
    for (const row of results) {
      const owner = ownerFromRow(row);
      const key = String(owner.projectId || row.id);
      if (!map.has(key)) {
        map.set(key, { key, original: owner, copies: [] });
      }
      const cluster = map.get(key)!;
      if (row.isOriginal) {
        cluster.scannedOriginal = row;
        cluster.original = owner;
      } else {
        cluster.copies.push(row);
        if (!cluster.scannedOriginal && row.originalOwner) cluster.original = row.originalOwner;
      }
    }
    return [...map.values()];
  }, [results]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = visible.map(s => s.id);
    const allVisibleSelected = ids.length > 0 && ids.every(id => selected.has(id));
    if (allVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const selectFlagged = () => {
    setSelected(prev => {
      const next = new Set(prev);
      visibleFlagged.forEach(s => next.add(s.id));
      return next;
    });
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
        const action = r.action === "Reject" || r.action === "Review" || r.action === "Approve"
          ? r.action
          : "Review";
        return {
          id: String(r.projectId),
          student: r.student,
          avatar: s?.student_avatar || r.student.slice(0, 2).toUpperCase(),
          photo: r.photo || s?.student_photo || null,
          project: r.project,
          uniqueness: r.uniqueness,
          collidesWith: typeof r.collidesWith === "string" ? r.collidesWith : "None",
          action,
          aiSuggestion: r.aiSuggestion,
          isOriginal: Boolean(r.isOriginal),
          universityId: r.universityId || s?.university_id || "",
          departmentName: r.department || s?.department_name || "",
          className: r.className || s?.class_name || "",
          studyMode: r.studyMode || s?.study_mode || "",
          assignedAt: r.assignedAt || s?.arrived_at || null,
          originalOwner: r.originalOwner || null,
          laterCopies: r.laterCopies || [],
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

  const exportResults = (format: "excel" | "pdf") => {
    if (!results?.length) return;
    const headers = [
      "Original owner", "HU ID", "Department", "Class",
      "Checked student", "Project", "Uniqueness %", "Suggested action", "Review note",
    ];
    const rows = results.map(r => {
      const owner = ownerFromRow(r);
      return [
        owner.name,
        owner.universityId,
        owner.department,
        owner.className,
        r.student,
        r.project,
        r.uniqueness,
        r.action,
        r.aiSuggestion || "",
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const sections = [{ title: "Originality scan results", sheetName: "Scan", headers, rows }];
    if (format === "excel") {
      exportMultiSheetExcel(`projecthub-batch-scan-${stamp}`, sections);
    } else {
      exportMultiSectionPdf("ProjectHub — Originality scan", sections, `batch-scan-${stamp}.pdf`);
    }
  };

  const verdicts = useMemo(() => {
    const base = { Approve: 0, Review: 0, Reject: 0 };
    results?.forEach(r => { base[r.action] += 1; });
    return base;
  }, [results]);

  const kpis = [
    { key: "queue", icon: Layers, tone: "emerald", value: pending.length, label: "Waiting in queue" },
    { key: "selected", icon: CheckCircle2, tone: "teal", value: selected.size, label: "Chosen for this scan" },
    { key: "originals", icon: Award, tone: "blue", value: results ? originalCount : averageUniqueness, suffix: results ? "" : "%", label: results ? "Original owners" : "Average uniqueness" },
    { key: "collisions", icon: AlertTriangle, tone: "amber", value: collisions, label: "Later overlapping claims" },
  ] as const;

  return (
    <div className="scanlab p-4 sm:p-6 space-y-5 max-w-screen-2xl mx-auto pb-mobile-nav">
      <PageHero
        icon={Database}
        eyebrow="Admin originality office"
        title="Originality scanner"
        subtitle="Find the student who first belongs to a topic — name, HU ID, photo, department, and class — not who submitted one second earlier."
        image={HU_IMAGES.lab}
      >
        <div className="scanlab-hero-panel">
          <span className="scanlab-hero-panel__icon">
            <Award size={20} />
          </span>
          <div>
            <strong><AnimatedCounter value={pending.length} /></strong>
            <em>Submissions ready to scan</em>
          </div>
          <div className="scanlab-hero-panel__pipeline">
            <span>Select</span>
            <ArrowRight size={12} />
            <span>Match topic</span>
            <ArrowRight size={12} />
            <span>Name the original</span>
          </div>
        </div>
      </PageHero>

      <div className="scanlab-kpis">
        {kpis.map((kpi, i) => (
          <motion.article
            key={kpi.key}
            className={`scanlab-kpi scanlab-kpi--${kpi.tone}`}
            initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="scanlab-kpi__icon"><kpi.icon size={18} /></span>
            <div>
              <strong>
                <AnimatedCounter value={kpi.value} />{"suffix" in kpi ? kpi.suffix : ""}
              </strong>
              <p>{kpi.label}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            className="scanlab-alert scanlab-alert--error"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="alert"
          >
            <AlertTriangle size={15} /> {error}
          </motion.p>
        )}
        {scanMessage && (
          <motion.p
            className="scanlab-alert scanlab-alert--ok"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="status"
          >
            <CheckCircle2 size={15} /> {scanMessage}
          </motion.p>
        )}
      </AnimatePresence>

      <section className="scanlab-panel">
        <header className="scanlab-panel__head">
          <div>
            <h3>Pending submissions</h3>
            <p>
              {selected.size} selected · {visible.length}
              {search.trim() ? ` match${visible.length === 1 ? "" : "es"}` : " available"}
              {visibleFlagged.length ? ` · ${visibleFlagged.length} below ${FLAG_THRESHOLD}%` : ""}
            </p>
          </div>
          <div className="scanlab-panel__tools">
            <label className="scanlab-search">
              <Search size={14} />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, project, or HU ID"
                aria-label="Search pending submissions by student, project, or HU ID"
                autoComplete="off"
                spellCheck={false}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={13} />
                </button>
              )}
            </label>
            {visibleFlagged.length > 0 && (
              <button type="button" className="scanlab-chip scanlab-chip--amber" onClick={selectFlagged}>
                <AlertTriangle size={13} /> Select flagged ({visibleFlagged.length})
              </button>
            )}
            {visible.length > 0 && (
              <button type="button" className="scanlab-chip" onClick={selectAll}>
                {visible.every(s => selected.has(s.id)) && visible.length > 0
                  ? "Clear visible"
                  : "Select visible"}
              </button>
            )}
          </div>
        </header>

        <div className="scanlab-list">
          {scanning && !reducedMotion && (
            <motion.span
              className="scanlab-list__sweep"
              aria-hidden="true"
              initial={{ y: "-10%" }}
              animate={{ y: "110%" }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="scanlab-skeleton" />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="scanlab-empty">
              <span><Radar size={26} /></span>
              <strong>Nothing to scan yet</strong>
              <p>Once students submit their projects they appear here, ready for an originality check.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="scanlab-empty">
              <span><Search size={26} /></span>
              <strong>No match for “{search}”</strong>
              <p>Try a different student name, HU ID, or project title.</p>
            </div>
          ) : (
            <ul className="scanlab-rows">
              {visible.map((s, i) => {
                const score = s.athena.uniqueness_score || 0;
                const color = getScoreColor(score);
                const isSelected = selected.has(s.id);
                const names = splitName(s.student_name);
                return (
                  <motion.li
                    key={s.id}
                    initial={reducedMotion ? undefined : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.035, 0.4) }}
                  >
                    <label className={`scanlab-row${isSelected ? " is-selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        disabled={scanning}
                      />
                      <span className="scanlab-row__box" aria-hidden="true">
                        <CheckCircle2 size={13} />
                      </span>
                      <UserAvatar
                        firstName={names.first}
                        lastName={names.last}
                        profileImageUrl={s.student_photo}
                        role="student"
                        size="sm"
                      />
                      <span className="scanlab-row__identity">
                        <strong>{s.student_name}</strong>
                        <em>{s.project_title}</em>
                        <small>{identityLine(s) || s.department}</small>
                      </span>
                      <span className="scanlab-row__meter" aria-hidden="true">
                        <motion.i
                          style={{ background: color }}
                          initial={reducedMotion ? undefined : { width: 0 }}
                          animate={{ width: `${Math.min(100, score)}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </span>
                      <span
                        className="scanlab-row__score"
                        style={{ background: `${color}15`, color }}
                      >
                        {score || "—"}%
                      </span>
                    </label>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <motion.button
          type="button"
          whileHover={reducedMotion || !selected.size ? undefined : { scale: 1.01 }}
          whileTap={reducedMotion || !selected.size ? undefined : { scale: 0.99 }}
          onClick={runScan}
          disabled={selected.size < 1 || scanning || pending.length === 0}
          className="scanlab-run"
        >
          {scanning ? (
            <motion.span
              className="scanlab-run__spin"
              animate={reducedMotion ? undefined : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            >
              <Scan size={18} />
            </motion.span>
          ) : (
            <Scan size={18} />
          )}
          {scanning
            ? "Finding original owners…"
            : `Run originality scan${selected.size ? ` · ${selected.size} selected` : ""}`}
        </motion.button>
      </section>

      <AnimatePresence>
        {results && (
          <motion.section
            className="scanlab-results"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <header className="scanlab-results__head">
              <div>
                <h3><ShieldCheck size={16} /> Original owners · {results.length} submissions</h3>
                <p>Each jar names the student who first registered the topic. Later similar projects are listed underneath.</p>
              </div>
              <div className="scanlab-results__actions">
                <button type="button" onClick={() => exportResults("excel")}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button type="button" onClick={() => exportResults("pdf")}>
                  <Download size={14} /> PDF
                </button>
              </div>
            </header>

            <div className="scanlab-verdicts">
              {(Object.keys(ACTION_META) as (keyof typeof ACTION_META)[]).map(action => (
                <span
                  key={action}
                  className="scanlab-verdict"
                  style={{
                    background: ACTION_META[action].bg,
                    color: ACTION_META[action].color,
                    borderColor: ACTION_META[action].border,
                  }}
                >
                  <strong>{verdicts[action]}</strong> {action}
                </span>
              ))}
            </div>

            <div className="origin-jars">
              {clusters.map((cluster, i) => {
                const uniqueness = cluster.scannedOriginal?.uniqueness;
                const laterFromDb = cluster.scannedOriginal?.laterCopies || [];
                const laterCount = cluster.copies.length || laterFromDb.length;
                return (
                  <motion.div
                    key={cluster.key}
                    className="origin-cluster"
                    initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  >
                    <OriginJar
                      owner={cluster.original}
                      uniqueness={uniqueness}
                      copies={laterCount}
                    />

                    {cluster.copies.length > 0 && (
                      <ul className="origin-copies">
                        <li className="origin-copies__label">Later overlapping claims</li>
                        {cluster.copies.map(row => {
                          const names = splitName(row.student);
                          const meta = actionMeta(row.action);
                          return (
                            <li key={row.id} className="origin-copy">
                              <UserAvatar
                                firstName={names.first}
                                lastName={names.last}
                                profileImageUrl={row.photo}
                                role="student"
                                size="md"
                              />
                              <div className="origin-copy__who">
                                <strong>{row.student}</strong>
                                <em>{row.project}</em>
                                <small>
                                  {[row.universityId, row.departmentName, row.className].filter(Boolean).join(" · ") || "Student record"}
                                </small>
                              </div>
                              <div className="origin-copy__score">
                                <span style={{ color: getScoreColor(row.uniqueness) }}>{row.uniqueness}%</span>
                                <span
                                  className="scanlab-table__action"
                                  style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                                >
                                  {row.action === "Review" && <WaitingMark size={12} />}
                                  {row.action}
                                </span>
                              </div>
                              {row.aiSuggestion ? <p className="origin-copy__note">{row.aiSuggestion}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {!cluster.copies.length && laterFromDb.length > 0 && (
                      <ul className="origin-copies">
                        <li className="origin-copies__label">Later overlapping claims in the database</li>
                        {laterFromDb.map((copy, idx) => {
                          const names = splitName(copy.name);
                          return (
                            <li key={String(copy.projectId || idx)} className="origin-copy">
                              <UserAvatar
                                firstName={names.first}
                                lastName={names.last}
                                profileImageUrl={copy.photo}
                                role="student"
                                size="md"
                              />
                              <div className="origin-copy__who">
                                <strong>{copy.name}</strong>
                                <em>{copy.title}</em>
                                <small>
                                  {[copy.universityId, copy.department, copy.className].filter(Boolean).join(" · ") || "Student record"}
                                </small>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {!cluster.copies.length && laterFromDb.length === 0 && cluster.scannedOriginal && (
                      <p className="origin-cluster__unique">
                        <BadgeCheck size={15} /> Unique topic — this student is the original owner.
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
