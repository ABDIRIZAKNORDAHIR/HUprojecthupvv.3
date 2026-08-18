import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { FolderKanban, Clock, Plus, ChevronRight, AlertCircle, GraduationCap, X, IdCard, FileText, Upload } from 'lucide-react';
import { Link } from 'react-router';
import { api, type Project } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHero } from '../components/PageHero';
import { APP_IMAGES } from '../config/appImages';
import { UniversityIdLookup, type LookupPerson } from '../components/UniversityIdLookup';
import { WaitingMark } from '../components/WaitingIcon';

const statusStyle: Record<string, { bg: string; text: string; waiting?: boolean }> = {
  pending_teacher: { bg: '#FFF7E6', text: '#B45309', waiting: true },
  assigned: { bg: '#EFF6FF', text: '#2563EB' },
  submitted: { bg: '#FFF7E6', text: '#B45309', waiting: true },
  under_review: { bg: '#FFF7E6', text: '#B45309', waiting: true },
  approved: { bg: '#F0FDF4', text: '#16A34A' },
  rejected: { bg: '#FEF2F2', text: '#EF4444' },
  changes_requested: { bg: '#FFF7ED', text: '#EA580C' },
};

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AssignedProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPropose, setShowPropose] = useState(false);
  const [teachersByCat, setTeachersByCat] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [teacherIdInput, setTeacherIdInput] = useState('');
  const [foundTeacher, setFoundTeacher] = useState<LookupPerson | null>(null);
  const [teacherPickMode, setTeacherPickMode] = useState<'id' | 'list'>('id');
  const [proposal, setProposal] = useState({ title: '', abstract: '', description: '' });
  const [proposalPdf, setProposalPdf] = useState<{ name: string; data: string; size: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!user?.UserId) return;
    setLoading(true);
    api.getProjects().then(r => setProjects(r.projects)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [user?.UserId]);

  useEffect(() => { load(); }, [load]);

  const openPropose = async () => {
    setShowPropose(true);
    setFoundTeacher(null);
    setTeacherIdInput('');
    setSelectedTeacher(null);
    try {
      const r = await api.getTeachers();
      setTeachersByCat(r.byCategory);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teachers');
    }
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    const teacherId = teacherPickMode === 'id' ? foundTeacher?.UserId : selectedTeacher;
    if (!teacherId) return;
    setSubmitting(true);
    try {
      const res = await api.proposeProject({
        teacherId,
        ...(teacherPickMode === 'id' && teacherIdInput ? { teacherUniversityId: teacherIdInput } : {}),
        ...proposal,
        ...(proposalPdf ? { attachmentName: proposalPdf.name, attachmentData: proposalPdf.data } : {}),
      });
      setShowPropose(false);
      setProposal({ title: '', abstract: '', description: '' });
      setProposalPdf(null);
      setSelectedTeacher(null);
      setFoundTeacher(null);
      setTeacherIdInput('');
      alert(res.message || 'Project sent to teacher');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  };

  const pickProposalPdf = (file?: File) => {
    if (!file) return;
    setError('');
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files can be attached to a project proposal.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('The PDF must be 3 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProposalPdf({ name: file.name, data: String(reader.result), size: file.size });
    reader.onerror = () => setError('Could not read that PDF.');
    reader.readAsDataURL(file);
    if (pdfRef.current) pdfRef.current.value = '';
  };

  const isStudent = user?.Role === 'student';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6 pb-24">
      <PageHero
        icon={FolderKanban}
        eyebrow="Project portfolio"
        title={isStudent ? 'My projects' : 'Assigned projects'}
        subtitle={isStudent
          ? 'Track every project you own and send new topics to a supervisor.'
          : 'Projects students have assigned to you for supervision.'}
        image={APP_IMAGES.projectPlanning}
        showImageCaption
      >
        {isStudent && (
          <motion.button whileHover={{ scale: 1.03 }} onClick={openPropose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-green-700 font-semibold text-sm shadow-sm shrink-0">
            <Plus size={16} /> Assign to Teacher
          </motion.button>
        )}
      </PageHero>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <FolderKanban size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No projects yet</p>
          {isStudent && (
            <button onClick={openPropose} className="mt-3 text-green-600 font-semibold text-sm">Assign your first project to a teacher →</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Project ID', 'Title', 'Teacher', 'Assigned', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const st = statusStyle[p.Status] || statusStyle.assigned || { bg: '#F1F5F9', text: '#475569' };
                return (
                  <tr key={p.ProjectId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-green-700">{p.TeacherAssignedId}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-sm">{p.Title}</p></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.TeacherName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500"><Clock size={12} className="inline mr-1" />{formatDate(p.AssignedAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                        style={{ background: st.bg, color: st.text }}>
                        {st.waiting && <WaitingMark size={12} />}
                        {p.Status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.ProjectId}`} className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                        Open <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Teacher picker modal */}
      {showPropose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Assign Project to Teacher</h2>
                <p className="text-sm text-gray-500">Choose a teacher by category — they will approve or reject</p>
              </div>
              <button type="button" onClick={() => setShowPropose(false)} aria-label="Close project assignment dialog">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePropose} className="p-6 space-y-5">
              <div>
                <label htmlFor="proposal-title" className="text-sm font-semibold">Project Title *</label>
                <input id="proposal-title" value={proposal.title} onChange={e => setProposal(p => ({ ...p, title: e.target.value }))} required
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm" placeholder="e.g. AI-Powered Healthcare System" />
              </div>
              <div>
                <label htmlFor="proposal-abstract" className="text-sm font-semibold">Abstract</label>
                <textarea id="proposal-abstract" value={proposal.abstract} onChange={e => setProposal(p => ({ ...p, abstract: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm" rows={2} />
              </div>
              <div>
                <label htmlFor="proposal-description" className="text-sm font-semibold">Description</label>
                <textarea id="proposal-description" value={proposal.description} onChange={e => setProposal(p => ({ ...p, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm" rows={3}
                  placeholder="Describe your project goals and approach..." />
              </div>

              <div>
                <label className="text-sm font-semibold">Project PDF <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  ref={pdfRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => pickProposalPdf(e.target.files?.[0])}
                />
                {proposalPdf ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-green-800">
                      <FileText size={17} className="shrink-0" />
                      <span className="truncate">{proposalPdf.name}</span>
                      <em className="shrink-0 text-xs font-normal not-italic text-green-600">
                        {(proposalPdf.size / 1024).toFixed(0)} KB
                      </em>
                    </span>
                    <button type="button" onClick={() => setProposalPdf(null)} className="text-xs font-bold text-red-600">Remove</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfRef.current?.click()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm font-semibold text-gray-600 transition hover:border-green-400 hover:bg-green-50"
                  >
                    <Upload size={17} /> Attach project PDF (maximum 3 MB)
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block">Select Teacher *</label>
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => { setTeacherPickMode('id'); setSelectedTeacher(null); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${teacherPickMode === 'id' ? 'bg-green-50 border-green-400 text-green-800' : 'hover:bg-gray-50'}`}>
                    <IdCard size={14} className="inline mr-1" /> Enter Teacher HU ID
                  </button>
                  <button type="button" onClick={() => { setTeacherPickMode('list'); setFoundTeacher(null); setTeacherIdInput(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${teacherPickMode === 'list' ? 'bg-green-50 border-green-400 text-green-800' : 'hover:bg-gray-50'}`}>
                    <GraduationCap size={14} className="inline mr-1" /> Browse by Department
                  </button>
                </div>

                {teacherPickMode === 'id' ? (
                  <UniversityIdLookup
                    role="teacher"
                    label="Teacher HU ID"
                    value={teacherIdInput}
                    onChange={v => {
                      setTeacherIdInput(v);
                      setSelectedTeacher(null);
                    }}
                    onFound={t => {
                      setFoundTeacher(t);
                      if (t) setSelectedTeacher(t.UserId);
                    }}
                  />
                ) : Object.keys(teachersByCat).length === 0 ? (
                  <p className="text-sm text-gray-400">Loading teachers...</p>
                ) : (
                  Object.entries(teachersByCat).map(([category, teachers]) => (
                    <div key={category} className="mb-4">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                        <GraduationCap size={12} /> {category}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {teachers.map(t => (
                          <button key={String(t.UserId)} type="button"
                            onClick={() => setSelectedTeacher(Number(t.UserId))}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedTeacher === t.UserId ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'hover:border-gray-300'
                            }`}>
                            <p className="font-semibold text-sm">{String(t.FirstName)} {String(t.LastName)}</p>
                            <p className="text-xs text-gray-500">{String(t.UniversityId)} · {String(t.Department)}</p>
                            <p className="text-xs text-gray-400 mt-1">{Number(t.ActiveProjects)} active projects</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <motion.button type="submit"
                disabled={(teacherPickMode === 'id' ? !foundTeacher : !selectedTeacher) || submitting || !proposal.title}                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16A34A, #2563EB)' }}>
                {submitting ? 'Sending to teacher...' : foundTeacher && teacherPickMode === 'id'
                  ? `Send to ${foundTeacher.FirstName} ${foundTeacher.LastName}`
                  : 'Send to Teacher for Approval'}              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
