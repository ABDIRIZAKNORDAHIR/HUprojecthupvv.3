import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Trash2, Shield, UserCheck, UserX, Key, Eye, EyeOff, Pencil, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, type User } from '../api/client';
import { exportToExcel, exportToPdf } from '../utils/exportReport';
import { ExportButtons } from '../components/ExportButtons';
import { AdminPendingAccountsPanel } from '../components/AdminPendingAccountsPanel';
import { AdminDeleteDialog } from '../components/AdminDeleteDialog';
import { formatUniversityId, normalizeUniversityId, validateUniversityId, UNIVERSITY_ID_HINT } from '../utils/universityId';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editId, setEditId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

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
    admin: '#7C3AED', teacher: '#2563EB', student: '#16A34A',
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
    setEditPassword('');
    setError('');
  };

  const handleSaveAccount = async () => {
    if (!editUser) return;
    const payload: { universityId?: string; password?: string } = {};
    const idNorm = normalizeUniversityId(editId);
    if (idNorm && idNorm !== editUser.UniversityId) {
      const check = validateUniversityId(editId);
      if (!check.ok) return setError(check.error);
      payload.universityId = check.id;
    }
    if (editPassword.trim()) {
      if (editPassword.length < 8) return setError('Password must be at least 8 characters');
      payload.password = editPassword;
    }
    if (!payload.universityId && !payload.password) {
      return setError('Change the University ID and/or enter a new password');
    }
    setSaving(true);
    setError('');
    try {
      const r = await api.updateAdminUserAccount(editUser.UserId, payload);
      setSuccess(r.message);
      setEditUser(null);
      load();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const fmtId = (id: string) => formatUniversityId(id);

  const canDelete = canEdit;

  const exportUsers = (format: 'excel' | 'pdf') => {
    const headers = ['HU ID', 'Name', 'Email', 'Password', 'Role', 'Department'];
    const rows = users.map(u => [
      u.UniversityId, `${u.FirstName} ${u.LastName}`, u.Email, u.PlainPassword || '—', u.Role, u.Department || '—',
    ]);
    if (format === 'excel') exportToExcel('projecthub-users', headers, rows, 'Users');
    else exportToPdf('ProjectHub — Users Report', headers, rows, 'users.pdf');
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6 pb-mobile-nav">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 sm:p-6 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">User Management</h1>
            <p className="text-white/80 text-sm mt-1 max-w-2xl">
              Approve registrations, edit accounts, message any student or teacher directly, or permanently delete accounts.
            </p>
          </div>
        </div>
      </motion.div>

      <AdminPendingAccountsPanel onChange={load} />

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100">{success}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(stats.usersByRole as Array<{ Role: string; Count: number }>)?.map(r => (
            <motion.div key={r.Role} whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl border p-4 shadow-sm">
              <p style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>{r.Role}s</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: roleColors[r.Role] }}>{r.Count}</p>
            </motion.div>
          ))}
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <p style={{ fontSize: 12, color: '#64748B' }}>Pending Review</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#EAB308' }}>{stats.pendingReview as number}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
        {['', 'pending', 'student', 'teacher', 'admin'].map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === r ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {r === 'pending' ? 'Pending Approval' : r || 'All'}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, email, HU000 ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
        </div>
        </div>
        <ExportButtons
          onExportExcel={() => exportUsers('excel')}
          onExportPdf={() => exportUsers('pdf')}
        />
        <button type="button" onClick={() => setShowPasswords(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50">
          {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPasswords ? 'Hide' : 'Show'} Passwords
        </button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map(u => (
          <div key={u.UserId} className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-green-700">{fmtId(u.UniversityId)}</p>
                <p className="font-semibold mt-1">{u.FirstName} {u.LastName}</p>
                <p className="text-xs text-gray-500">{u.Email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0"
                style={{ background: `${roleColors[u.Role]}15`, color: roleColors[u.Role] }}>{u.Role}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{u.Department || 'No department'}</p>
            {showPasswords && u.PlainPassword && (
              <p className="text-xs mt-2 flex items-center gap-1 font-mono bg-amber-50 text-amber-900 px-2 py-1 rounded-lg border border-amber-100">
                <Key size={12} /> {u.PlainPassword}
              </p>
            )}
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
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-purple-200 text-purple-700 text-sm font-semibold hover:bg-purple-50">
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
          </div>
        ))}
      </div>

      {users.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">No users in this view</p>
          <p className="text-sm text-gray-400 mt-1">{searchQuery ? `No users match "${searchQuery}"` : 'Try a different filter or wait for new registrations'}</p>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['HU ID', 'Name', 'Email', 'Password', 'Role', 'Department', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.UserId} className={`border-b hover:bg-gray-50 ${u.Role === 'admin' || u.Role === 'teacher' ? 'bg-purple-50/30' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-green-700">
                    {u.Role === 'admin' ? '—' : fmtId(u.UniversityId)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{u.FirstName} {u.LastName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.Email}</td>
                  <td className="px-4 py-3">
                    {showPasswords && u.PlainPassword ? (
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded">{u.PlainPassword}</span>
                    ) : (
                      <span className="text-xs text-gray-400">••••••••</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{ background: `${roleColors[u.Role]}15`, color: roleColors[u.Role] }}>{u.Role}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.Department || '—'}</td>
                  <td className="px-4 py-3">
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-700 text-xs font-semibold hover:bg-purple-50">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              </p>
              <p className="text-xs text-gray-400 mb-4">Email cannot be changed here: {editUser.Email}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">University ID</label>
                  <input value={editId} onChange={e => setEditId(e.target.value)}
                    placeholder="HU000-1234-5678-9012"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                  <p className="text-[11px] text-gray-400 mt-1">{UNIVERSITY_ID_HINT}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">New password (optional)</label>
                  <input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
                <button type="button" onClick={handleSaveAccount} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40">
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
