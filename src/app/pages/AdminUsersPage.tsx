import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Users, Trash2, Shield, UserCheck, UserX, Pencil, Search, MessageSquare,
  GraduationCap, Presentation, ShieldCheck, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, type User } from '../api/client';
import { exportToExcel, exportToPdf } from '../utils/exportReport';
import { ExportButtons } from '../components/ExportButtons';
import { AdminPendingAccountsPanel } from '../components/AdminPendingAccountsPanel';
import { AdminDeleteDialog } from '../components/AdminDeleteDialog';
import { WaitingBadge, WaitingMark } from '../components/WaitingIcon';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { PageHero } from '../components/PageHero';
import { UserAvatar } from '../components/UserAvatar';
import { HU_IMAGES } from '../config/appImages';
import { formatUniversityId, validateUniversityId, UNIVERSITY_ID_HINT } from '../utils/universityId';

const ROLE_META: Record<string, { color: string; bg: string; icon: typeof Users; label: string }> = {
  admin: { color: '#047857', bg: '#ecfdf5', icon: ShieldCheck, label: 'Administrators' },
  teacher: { color: '#0f766e', bg: '#eafcf9', icon: Presentation, label: 'Teachers' },
  student: { color: '#2563eb', bg: '#eff6ff', icon: GraduationCap, label: 'Students' },
};

const FILTERS = [
  { id: '', label: 'Everyone' },
  { id: 'pending', label: 'Waiting' },
  { id: 'student', label: 'Students' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'admin', label: 'Admins' },
];

export function AdminUsersPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editId, setEditId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const load = () => {
    Promise.all([
      api.getAdminUsers(filter || undefined, searchDebounced || undefined),
      api.getAdminStats(),
    ]).then(([u, s]) => {
      setUsers(u.users);
      setStats(s);
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load users'));
  };

  // Reload only when server-side filter inputs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter, searchDebounced]);

  const handleDelete = async () => {
    if (!confirmUser) return;
    setDeleting(confirmUser.UserId);
    setError('');
    try {
      const r = await api.deleteAdminUser(confirmUser.UserId);
      setSuccess(r.message);
      setConfirmUser(null);
      load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed — please try again or restart the server');
    } finally {
      setDeleting(null);
    }
  };

  const roleColors: Record<string, string> = {
    admin: ROLE_META.admin.color, teacher: ROLE_META.teacher.color, student: ROLE_META.student.color,
  };

  const handleApprove = async (u: User) => {
    setDeleting(u.UserId);
    setError('');
    try {
      const r = await api.approveAccount(u.UserId);
      setSuccess(r.message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setDeleting(null);
    }
  };

  const handleRejectPending = async (u: User) => {
    if (!window.confirm(`Reject and permanently delete ${u.FirstName} ${u.LastName}?`)) return;
    setDeleting(u.UserId);
    setError('');
    try {
      const r = await api.rejectAccount(u.UserId);
      setSuccess(r.message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setDeleting(null);
    }
  };

  const isPending = (u: User & { AccountStatus?: string }) => u.AccountStatus === 'pending';

  const canEdit = (u: User & { AccountStatus?: string }) =>
    !isPending(u) && (u.Role === 'student' || u.Role === 'teacher');

  const canMessage = (u: User & { AccountStatus?: string }) =>
    !isPending(u) && (u.Role === 'student' || u.Role === 'teacher');

  const messageUser = async (u: User) => {
    setError('');
    try {
      const r = await api.startDirectMessage(u.UserId, `${u.FirstName} ${u.LastName}`);
      navigate('/messages', { state: { openConversationId: r.conversationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start conversation');
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditId(formatUniversityId(u.UniversityId));
    setEditEmail(u.Email || '');
    setEditPassword('');
    setSavedHint('');
    setError('');
  };

  const persistAccount = async (opts?: { includePassword?: boolean; close?: boolean }) => {
    if (!editUser) return;
    const payload: { universityId?: string; email?: string; password?: string } = {};

    const idCheck = validateUniversityId(editId);
    if (!idCheck.ok) return setError(idCheck.error);
    payload.universityId = idCheck.id;

    const email = editEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError('Enter a valid email address');
    }
    payload.email = email;

    const password = editPassword.trim();
    if (opts?.includePassword || password) {
      if (password && password.length < 8) return setError('Password must be at least 8 characters');
      if (password) payload.password = password;
    }

    const sameId = payload.universityId === editUser.UniversityId;
    const sameEmail = payload.email === String(editUser.Email || '').toLowerCase();
    if (sameId && sameEmail && !payload.password) {
      if (opts?.close) setEditUser(null);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const r = await api.updateAdminUserAccount(editUser.UserId, payload);
      setSuccess(r.message);
      setSavedHint('Saved');
      if (r.user) {
        setEditUser(r.user);
        setUsers(prev => prev.map(u => u.UserId === r.user.UserId ? { ...u, ...r.user } : u));
        setEditId(formatUniversityId(r.user.UniversityId));
        setEditEmail(r.user.Email || '');
      }
      if (payload.password) setEditPassword('');
      load();
      setTimeout(() => { setSuccess(''); setSavedHint(''); }, 4000);
      if (opts?.close) setEditUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = () => persistAccount({ includePassword: true, close: true });

  const fmtId = (id: string) => formatUniversityId(id);

  const exportUsers = (format: 'excel' | 'pdf') => {
    const headers = ['HU ID', 'Name', 'Email', 'Role', 'Department'];
    const rows = users.map(u => [
      u.UniversityId, `${u.FirstName} ${u.LastName}`, u.Email, u.Role, u.Department || '—',
    ]);
    if (format === 'excel') exportToExcel('projecthub-users', headers, rows, 'Users');
    else exportToPdf('ProjectHub — Users Report', headers, rows, 'users.pdf');
  };

  const roleCounts = useMemo(() => {
    const rows = (stats?.usersByRole as Array<{ Role: string; Count: number }>) || [];
    return rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.Role]: Number(row.Count) || 0 }), {});
  }, [stats]);

  const directoryTotal = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);
  const waitingCount = Number(stats?.pendingAccounts ?? stats?.pendingReview ?? 0);
  const statCards = [
    ...['student', 'teacher', 'admin'].map(role => ({
      key: role,
      label: ROLE_META[role]?.label ?? role,
      value: roleCounts[role] || 0,
      color: ROLE_META[role]?.color ?? '#2563eb',
      bg: ROLE_META[role]?.bg ?? '#eff6ff',
      icon: ROLE_META[role]?.icon ?? Users,
      waiting: false,
    })),
    {
      key: 'waiting',
      label: 'Waiting for approval',
      value: waitingCount,
      color: '#b45309',
      bg: '#fff7e6',
      icon: Users,
      waiting: true,
    },
  ];

  return (
    <div className="dashboard-canvas p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 pb-mobile-nav">
      <PageHero
        icon={ShieldCheck}
        eyebrow="Governance center"
        title="User management"
        subtitle="Approve registrations, edit accounts, message any student or teacher, and keep the directory clean."
        image={HU_IMAGES.convocation}
      >
        <div className="usermgmt-hero-stat">
          <span><Users size={18} /></span>
          <div>
            <strong><AnimatedCounter value={directoryTotal} /></strong>
            <em>Accounts in directory</em>
          </div>
        </div>
      </PageHero>

      <AdminPendingAccountsPanel onChange={load} />

      <AnimatePresence>
        {error && (
          <motion.p key="err" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-100 font-semibold">
            <AlertCircle size={16} /> {error}
          </motion.p>
        )}
        {success && (
          <motion.p key="ok" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100 font-semibold">
            <CheckCircle2 size={16} /> {success}
          </motion.p>
        )}
      </AnimatePresence>

      {stats && (
        <div className="usermgmt-stats">
          {statCards.map(({ key, label, value, color, bg, icon: Icon, waiting }, index) => (
            <motion.article
              key={key}
              initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: reducedMotion ? 0 : index * 0.06 }}
              whileHover={reducedMotion ? undefined : { y: -4 }}
              className={`usermgmt-stat${waiting ? ' is-waiting' : ''}`}
              style={{ '--stat-color': color } as React.CSSProperties}
            >
              <span className="usermgmt-stat__icon" style={{ background: bg, color }}>
                {waiting ? <WaitingMark size={18} /> : <Icon size={18} />}
              </span>
              <div>
                <strong><AnimatedCounter value={value} /></strong>
                <p>{label}</p>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <div className="usermgmt-toolbar">
        <div className="usermgmt-segments" role="tablist" aria-label="Filter accounts">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`usermgmt-segment${filter === id ? ' is-active' : ''}`}
            >
              {filter === id && (
                <motion.span layoutId="usermgmt-segment" className="usermgmt-segment__pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <span>
                {id === 'pending' && <WaitingMark size={12} />}
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="usermgmt-toolbar__right">
          <div className="usermgmt-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, email or HU000 ID…"
              aria-label="Search accounts"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={13} /></button>
            )}
          </div>
          <ExportButtons
            onExportExcel={() => exportUsers('excel')}
            onExportPdf={() => exportUsers('pdf')}
          />
        </div>
      </div>

      <p className="usermgmt-count">
        Showing <strong>{users.length}</strong> {users.length === 1 ? 'account' : 'accounts'}
        {filter ? ` · ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()}` : ''}
        {searchDebounced ? ` · matching “${searchDebounced}”` : ''}
      </p>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map((u, index) => (
          <motion.div
            key={u.UserId}
            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reducedMotion ? 0 : Math.min(index, 8) * 0.03 }}
            className="usermgmt-card"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <UserAvatar
                  firstName={u.FirstName}
                  lastName={u.LastName}
                  profileImageUrl={u.ProfileImageUrl}
                  role={u.Role}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{u.FirstName} {u.LastName}</p>
                  <p className="font-mono text-xs font-bold text-emerald-700">{u.Role === 'admin' ? '—' : fmtId(u.UniversityId)}</p>
                  <p className="text-xs text-gray-500 truncate">{u.Email}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0"
                style={{ background: `${roleColors[u.Role] || '#2563eb'}15`, color: roleColors[u.Role] || '#2563eb' }}>{u.Role}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{u.Department || 'No department'}</p>
            {isPending(u) && <WaitingBadge size={11} className="mt-2">Waiting for your approval</WaitingBadge>}
            {isPending(u) ? (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => handleApprove(u)} disabled={deleting === u.UserId}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">
                  <UserCheck size={14} /> Accept
                </button>
                <button type="button" onClick={() => handleRejectPending(u)} disabled={deleting === u.UserId}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold">
                  <UserX size={14} /> Reject
                </button>
              </div>
            ) : canEdit(u) ? (
              <div className="mt-3 flex flex-col gap-2">
                {canMessage(u) && (
                  <button type="button" onClick={() => messageUser(u)}
                    className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                    <MessageSquare size={14} /> Message {u.Role}
                  </button>
                )}
                <div className="flex gap-2">
                <button type="button" onClick={() => openEdit(u)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50">
                  <Pencil size={14} /> Edit ID / Password
                </button>
                <button type="button" onClick={() => { setConfirmUser(u); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">
                  <Trash2 size={14} /> Delete Account
                </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 flex items-center gap-1"><Shield size={12} /> Protected admin account</p>
            )}
          </motion.div>
        ))}
      </div>

      {users.length === 0 && !error && (
        <div className="usermgmt-empty">
          <span><Users size={30} /></span>
          <h3>No accounts in this view</h3>
          <p>{searchQuery ? `Nothing matches “${searchQuery}”` : 'Try a different filter or wait for new registrations.'}</p>
          {(searchQuery || filter) && (
            <button type="button" onClick={() => { setSearchQuery(''); setFilter(''); }}>Reset filters</button>
          )}
        </div>
      )}

      {/* Desktop table */}
      {users.length > 0 && (
      <div className="hidden md:block usermgmt-table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                {['Account', 'HU ID', 'Email', 'Role', 'Department', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <motion.tr
                  key={u.UserId}
                  initial={reducedMotion ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: reducedMotion ? 0 : Math.min(index, 10) * 0.025 }}
                  className={isPending(u) ? 'is-waiting' : ''}
                >
                  <td>
                    <div className="usermgmt-identity">
                      <UserAvatar
                        firstName={u.FirstName}
                        lastName={u.LastName}
                        profileImageUrl={u.ProfileImageUrl}
                        role={u.Role}
                        size="md"
                      />
                      <div>
                        <strong>{u.FirstName} {u.LastName}</strong>
                        {isPending(u) && <WaitingBadge size={11} className="mt-1 flex w-fit">Waiting for approval</WaitingBadge>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm font-bold text-emerald-700">
                    {u.Role === 'admin' ? '—' : fmtId(u.UniversityId)}
                  </td>
                  <td className="text-sm text-gray-600">{u.Email}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{ background: `${roleColors[u.Role] || '#2563eb'}15`, color: roleColors[u.Role] || '#2563eb' }}>{u.Role}</span>
                  </td>
                  <td className="text-sm text-gray-500">{u.Department || '—'}</td>
                  <td>
                    {isPending(u) ? (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => handleApprove(u)} disabled={deleting === u.UserId}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold">
                          <UserCheck size={13} /> Accept
                        </button>
                        <button type="button" onClick={() => handleRejectPending(u)} disabled={deleting === u.UserId}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold">
                          <UserX size={13} /> Reject
                        </button>
                      </div>
                    ) : canEdit(u) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {canMessage(u) && (
                          <button type="button" onClick={() => messageUser(u)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
                            <MessageSquare size={13} /> Message
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50">
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" onClick={() => { setConfirmUser(u); setError(''); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
                          <Trash2 size={13} /> Delete Account
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Shield size={12} /> Protected</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AdminDeleteDialog
        user={confirmUser}
        loading={deleting === confirmUser?.UserId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmUser(null)}
      />

      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="font-bold text-lg text-gray-900 mb-1">Edit Account</h2>
              <p className="text-sm text-gray-600 mb-4">
                {editUser.FirstName} {editUser.LastName} · <span className="capitalize">{editUser.Role}</span>
                {savedHint ? <span className="ml-2 text-emerald-700 font-semibold">· {savedHint}</span> : null}
              </p>
              <p className="text-xs text-gray-500 mb-4">University ID, email, and password are saved automatically when you leave a field — or press Save.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">University ID</label>
                  <input value={editId} onChange={e => setEditId(e.target.value)}
                    onBlur={() => persistAccount()}
                    placeholder="HU000-1234-5678-9012"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <p className="text-[11px] text-gray-400 mt-1">{UNIVERSITY_ID_HINT}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    onBlur={() => persistAccount()}
                    placeholder="you@hu.edu.so"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">New password (optional)</label>
                  <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                    onBlur={() => { if (editPassword.trim().length >= 8) persistAccount({ includePassword: true }); }}
                    placeholder="Leave blank to keep current password"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
                <button type="button" onClick={handleSaveAccount} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
