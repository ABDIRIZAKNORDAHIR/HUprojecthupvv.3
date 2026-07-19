import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, FolderKanban, Users, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import { formatUniversityId } from "../utils/universityId";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [people, setPeople] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setProjects([]); setPeople([]); setError(""); return; }
    setLoading(true);
    setError("");
    try {
      const r = await api.search(q.trim());
      setProjects(r.projects);
      setPeople(r.people);
    } catch (e) {
      setProjects([]);
      setPeople([]);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    if (!open) { setQuery(""); setError(""); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const goProject = (id: number) => {
    onClose();
    navigate(`/projects/${id}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.98, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            className="fixed top-[12%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl border border-border shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-purple-50 to-green-50">
              <Search size={18} className="text-purple-600 flex-shrink-0" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email, HU000 ID, or project title..."
                className="flex-1 text-sm outline-none bg-transparent" />
              {loading && <Loader2 size={16} className="text-gray-400 animate-spin" />}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl m-2">{error}</p>}
              {!loading && query && !error && projects.length === 0 && people.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
              )}
              {projects.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">Projects ({projects.length})</p>
                  {projects.map(p => (
                    <button key={String(p.ProjectId)} onClick={() => goProject(Number(p.ProjectId))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left">
                      <FolderKanban size={16} className="text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{String(p.Title)}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {String(p.TeacherAssignedId)} · {String(p.StudentName || p.Status)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {people.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">People ({people.length})</p>
                  {people.map(p => (
                    <div key={String(p.UserId)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                      <Users size={16} className="text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{String(p.FirstName)} {String(p.LastName)}</p>
                        <p className="text-xs text-gray-500">
                          {formatUniversityId(String(p.UniversityId))} · <span className="capitalize">{String(p.Role)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!query && (
                <div className="text-center py-10 px-4">
                  <Search size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">Search everywhere</p>
                  <p className="text-xs text-gray-400 mt-1">Names, emails, HU000 IDs, project titles</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
