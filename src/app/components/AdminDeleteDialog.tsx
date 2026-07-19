import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatUniversityId } from '../utils/universityId';

export interface DeleteTarget {
  UserId: number;
  FirstName: string;
  LastName: string;
  Role: string;
  UniversityId?: string;
  Email?: string;
}

interface AdminDeleteDialogProps {
  user: DeleteTarget | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminDeleteDialog({ user, loading, onConfirm, onCancel }: AdminDeleteDialogProps) {
  if (!user) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Delete Account</h2>
                  <p className="text-white/85 text-sm capitalize">{user.Role} · permanent action</p>
                </div>
              </div>
              <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-gray-50 border p-4">
              <p className="font-semibold text-gray-900">{user.FirstName} {user.LastName}</p>
              {user.UniversityId && (
                <p className="text-sm font-mono text-green-700 mt-1">{formatUniversityId(user.UniversityId)}</p>
              )}
              {user.Email && <p className="text-sm text-gray-500 mt-0.5">{user.Email}</p>}
            </div>

            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-2"><span className="text-red-500">•</span> Login and profile removed forever</li>
              <li className="flex gap-2"><span className="text-red-500">•</span> All projects, teams, and submissions deleted</li>
              <li className="flex gap-2"><span className="text-red-500">•</span> This cannot be undone</li>
            </ul>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onCancel} disabled={loading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Trash2 size={16} />
                {loading ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
