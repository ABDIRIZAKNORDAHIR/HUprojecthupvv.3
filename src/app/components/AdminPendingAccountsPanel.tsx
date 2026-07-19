import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { UserCheck, UserX, Clock, Shield } from 'lucide-react';
import { api } from '../api/client';

export function AdminPendingAccountsPanel({ onChange }: { onChange?: () => void }) {
  const [pending, setPending] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.getPendingRegistrations()
      .then(r => setPending(r.pending))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (userId: number) => {
    setActionId(userId);
    setError('');
    try {
      const r = await api.approveAccount(userId);
      setMessage(r.message);
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (userId: number) => {
    if (!window.confirm('Reject and permanently delete this account? They will never be able to use it.')) return;
    setActionId(userId);
    setError('');
    try {
      const r = await api.rejectAccount(userId, 'Registration not approved by administrator');
      setMessage(r.message);
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gradient-to-r from-amber-50 to-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-amber-600" />
          <h3 className="font-bold">Pending Account Approvals</h3>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {pending.length}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex items-center gap-1"><Shield size={12} /> Admin decision required</span>
      </div>

      {message && <p className="mx-5 mt-4 text-sm text-green-700 bg-green-50 p-3 rounded-xl">{message}</p>}
      {error && <p className="mx-5 mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      {pending.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No accounts waiting for approval</p>
      ) : (
        <div className="divide-y">
          {pending.map(p => (
            <div key={String(p.UserId)} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-green-700">{String(p.UniversityId)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 capitalize font-semibold">{String(p.Role)}</span>
                </div>
                <p className="font-semibold mt-1">{String(p.FirstName)} {String(p.LastName)}</p>
                <p className="text-xs text-gray-500">{String(p.Email)} · {String(p.Department || 'No department')}</p>
                {p.PlainPassword && (
                  <p className="text-xs mt-1 font-mono text-amber-800 bg-amber-50 inline-block px-2 py-0.5 rounded">Password: {String(p.PlainPassword)}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Registered {new Date(String(p.CreatedAt)).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <motion.button whileTap={{ scale: 0.97 }} disabled={actionId === Number(p.UserId)}
                  onClick={() => approve(Number(p.UserId))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                  <UserCheck size={16} /> Accept
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} disabled={actionId === Number(p.UserId)}
                  onClick={() => reject(Number(p.UserId))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                  <UserX size={16} /> Reject
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
