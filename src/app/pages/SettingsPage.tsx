import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, User, Camera, Trash2, Lock, Shield, Mail, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, setToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { Role } from '../types';

const MAX_IMAGE_BYTES = 400_000;

export function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', department: '', phone: '', bio: '', contactInfo: '',
    className: '', studyMode: 'full_time',
  });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const notifications = usePushNotifications();

  const isAdmin = user?.Role === 'admin';

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.FirstName || '',
        lastName: user.LastName || '',
        department: user.Department || '',
        phone: user.Phone || '',
        bio: user.Bio || '',
        contactInfo: user.ContactInfo || '',
        className: user.ClassName || '',
        studyMode: (user.StudyMode as string) || 'full_time',
      });
      setProfileImageUrl(user.ProfileImageUrl || null);
      setAdminEmail(user.Email || '');
    }
  }, [user]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPG or PNG image');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be under 400KB. Try a smaller photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfileImageUrl(String(reader.result));
    reader.readAsDataURL(file);
    setError('');
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    try {
      await api.updateProfile({ ...profile, profileImageUrl });
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profile save failed');
    }
  };

  const handleSaveCredentials = async () => {
    if (isAdmin) {
      if (!currentPassword) {
        setError('Enter your current password to update your email');
        return;
      }
      if (!adminEmail || adminEmail === user?.Email) {
        setError('Enter a new email address');
        return;
      }
      try {
        const res = await api.updateCredentials({ currentPassword, email: adminEmail });
        setToken(res.token);
        await refreshUser();
        setCurrentPassword('');
        setCredentialsSaved(true);
        setTimeout(() => setCredentialsSaved(false), 2500);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed');
      }
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (!currentPassword || !newPassword) {
      setError('Enter current and new password');
      return;
    }
    try {
      const res = await api.updateCredentials({ currentPassword, newPassword });
      setToken(res.token);
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCredentialsSaved(true);
      setTimeout(() => setCredentialsSaved(false), 2500);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password update failed');
    }
  };

  const role = (user?.Role || 'student') as Role;

  const enableNotifications = async () => {
    setNotificationBusy(true);
    await notifications.subscribe();
    setNotificationBusy(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-mobile-nav">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-green-600" />
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Settings</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg" role="alert">{error}</p>}

      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User size={18} className="text-blue-600" />
          <h2 className="font-bold text-lg">My Profile</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-border/60">
          <UserAvatar
            firstName={profile.firstName}
            lastName={profile.lastName}
            profileImageUrl={profileImageUrl}
            role={role}
            size="xl"
          />
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={handleImagePick} />
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              <Camera size={16} /> Upload Photo
            </motion.button>
            {profileImageUrl && (
              <button type="button" onClick={() => setProfileImageUrl(null)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <Trash2 size={16} /> Remove
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {isAdmin ? user?.Email : `${user?.UniversityId} · ${user?.Email ?? ''}`} · {user?.Role}
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">First Name</label>
            <input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Last Name</label>
            <input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Department</label>
          <input value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        {user?.Role === 'student' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Class (e.g. BIT 9)</label>
              <input value={profile.className} onChange={e => setProfile(p => ({ ...p, className: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="BIT 9" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Study mode</label>
              <select value={profile.studyMode} onChange={e => setProfile(p => ({ ...p, studyMode: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
              </select>
            </div>
          </div>
        )}
        <div>
          <label className="text-sm font-semibold text-gray-700">Phone Number</label>
          <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="+252..." />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Contact Information</label>
          <input value={profile.contactInfo} onChange={e => setProfile(p => ({ ...p, contactInfo: e.target.value }))}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Preferred contact method, office hours..." />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Biography / About</label>
          <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Short bio visible when others view your profile..." />
        </div>
        <motion.button whileHover={{ scale: 1.02 }} onClick={handleSaveProfile}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm">
          <Save size={16} /> {profileSaved ? 'Profile Saved!' : 'Save Profile'}
        </motion.button>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          {isAdmin ? <Mail size={18} className="text-purple-600" /> : <Lock size={18} className="text-purple-600" />}
          <h2 className="font-bold text-lg">{isAdmin ? 'Admin Email' : 'Change Password'}</h2>
        </div>

        {isAdmin ? (
          <>
            <p className="text-sm text-gray-500 flex items-start gap-2">
              <Shield size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              Email only. The administrator password is not changed from this screen.
            </p>
            <div>
              <label className="text-sm font-semibold text-gray-700">Login Email</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                placeholder="you@hu.edu.so"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Current Password (to confirm email change)</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
            </div>
            <motion.button whileHover={{ scale: 1.02 }} onClick={handleSaveCredentials}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm">
              <Mail size={16} /> {credentialsSaved ? 'Email saved' : 'Save email'}
            </motion.button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Password only — ID and email are fixed
            </p>
            <div>
              <label className="text-sm font-semibold text-gray-700">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} onClick={handleSaveCredentials}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm">
              <Lock size={16} /> {credentialsSaved ? 'Password Updated!' : 'Save New Password'}
            </motion.button>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6 space-y-4">
        <h2 className="font-bold text-lg">Notifications</h2>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Push notifications</p>
          <p className="text-xs text-gray-500 mb-3">
            Enable these only if you want this device to show updates when ProjectHub is not open.
          </p>
          {!notifications.supported ? (
            <p className="text-xs text-gray-500">Notifications are not supported in this browser.</p>
          ) : notifications.subscribed ? (
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-700" role="status">
              <Bell size={16} /> Notifications enabled
            </p>
          ) : notifications.permission === 'denied' ? (
            <p className="text-xs text-amber-700" role="status">
              Notifications are blocked. You can allow them from your browser’s site settings.
            </p>
          ) : (
            <button
              type="button"
              onClick={enableNotifications}
              disabled={notificationBusy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Bell size={16} /> {notificationBusy ? 'Enabling…' : 'Enable notifications'}
            </button>
          )}
          {notifications.error && (
            <p className="text-xs text-red-600 mt-2" role="alert">{notifications.error}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-6">
        <h2 className="font-bold text-lg mb-2">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of ProjectHub on this device.</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          type="button"
          onClick={() => { logout(); navigate('/', { replace: true }); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100"
        >
          <LogOut size={16} /> Log out
        </motion.button>
      </div>
    </div>
  );
}
