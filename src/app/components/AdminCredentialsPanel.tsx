import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Briefcase, Key, Mail, Copy, Check, Trash2 } from 'lucide-react';
import { api, type User } from '../api/client';
import { formatUniversityId } from '../utils/universityId';
import { AdminDeleteDialog } from './AdminDeleteDialog';

export function AdminCredentialsPanel({ onChange }: { onChange?: () => void }) {
  const [staff, setStaff] = useState<User[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.getAdminUsers('admin'), api.getAdminUsers('teacher')])
      .then(([a, t]) => setStaff([...a.users, ...t.users]))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteAdminUser(deleteTarget.UserId);
      setDeleteTarget(null);
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!staff.length) return null;

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-purple-600" />
            <h3 className="font-bold text-sm">Admin & Teacher Credentials</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">View credentials and manage teacher accounts</p>
        </div>
        {error && <p className="mx-5 mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
        <div className="divide-y">
          {staff.map(u => (
            <motion.div key={u.UserId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 sm:p-5 hover:bg-gray-50/80 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    u.Role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
                  }`}>
                    {u.Role === 'admin' ? <Shield size={18} /> : <Briefcase size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{u.FirstName} {u.LastName}</p>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: u.Role === 'admin' ? '#F5F3FF' : '#EFF6FF',
                        color: u.Role === 'admin' ? '#7C3AED' : '#2563EB',
                      }}>
                      {u.Role}
                    </span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {u.Role !== 'admin' && (
                    <div className="rounded-lg border bg-gray-50 px-3 py-2">
                      <p className="text-[10px] uppercase font-bold text-gray-400">University ID</p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="font-mono text-sm font-bold text-green-700">{formatUniversityId(u.UniversityId)}</p>
                        <button type="button" onClick={() => copy(u.UniversityId, `id-${u.UserId}`)}
                          className="text-gray-400 hover:text-purple-600">
                          {copied === `id-${u.UserId}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                      <Mail size={10} /> Email {u.Role === 'admin' && '(login)'}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm font-medium truncate">{u.Email}</p>
                      <button type="button" onClick={() => copy(u.Email, `em-${u.UserId}`)}
                        className="text-gray-400 hover:text-purple-600 flex-shrink-0">
                        {copied === `em-${u.UserId}` ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1">
                      <Key size={10} /> Password
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="font-mono text-sm font-bold text-amber-900">
                        {u.PlainPassword || '—'}
                      </p>
                      {u.PlainPassword && (
                        <button type="button" onClick={() => copy(u.PlainPassword!, `pw-${u.UserId}`)}
                          className="text-amber-600 hover:text-amber-800 flex-shrink-0">
                          {copied === `pw-${u.UserId}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {u.Role === 'admin' ? (
                <p className="text-[11px] text-purple-600 mt-2">Admin signs in with email + password only — no University ID required</p>
              ) : (
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => setDeleteTarget(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
                    <Trash2 size={13} /> Delete Teacher Account
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <AdminDeleteDialog
        user={deleteTarget}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
