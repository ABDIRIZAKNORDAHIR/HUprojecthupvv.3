import { motion } from 'motion/react';
import { X, Mail, Phone, BookOpen, FolderKanban } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { formatUniversityId } from '../utils/universityId';
import type { User } from '../api/client';

interface UserProfileModalProps {
  profile: User;
  currentProjects?: Array<Record<string, unknown>>;
  onClose: () => void;
}

export function UserProfileModal({ profile, currentProjects = [], onClose }: UserProfileModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar firstName={profile.FirstName} lastName={profile.LastName}
              profileImageUrl={profile.ProfileImageUrl} role={profile.Role} size="lg" />
            <div>
              <h2 className="font-bold text-lg">{profile.FirstName} {profile.LastName}</h2>
              <p className="font-mono text-sm text-green-700">{formatUniversityId(profile.UniversityId)}</p>
              <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-100 mt-1 inline-block">{profile.Role}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {profile.Email}</div>
          {profile.Phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {profile.Phone}</div>}
          {profile.Department && <div className="flex items-center gap-2 text-gray-600"><BookOpen size={14} /> {profile.Department}</div>}
          {profile.ContactInfo && (
            <div><p className="text-xs font-semibold text-gray-500 mb-1">Contact</p><p className="text-gray-700">{profile.ContactInfo}</p></div>
          )}
          {profile.Bio && (
            <div><p className="text-xs font-semibold text-gray-500 mb-1">About</p><p className="text-gray-700 leading-relaxed">{profile.Bio}</p></div>
          )}
          {currentProjects.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FolderKanban size={12} /> Current projects</p>
              <div className="space-y-2">
                {currentProjects.map(p => (
                  <div key={String(p.ProjectId)} className="p-2 rounded-lg bg-gray-50 border text-xs">
                    <p className="font-semibold">{String(p.Title)}</p>
                    <p className="text-gray-500 capitalize">{String(p.Status).replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
