import type { Role } from '../types';

const avatarGradients: Record<Role, string> = {
  student: 'linear-gradient(135deg, #16A34A, #22C55E)',
  teacher: 'linear-gradient(135deg, #2563EB, #38BDF8)',
  admin: 'linear-gradient(135deg, #7C3AED, #A855F7)',
};

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  role?: Role;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { box: 32, font: 11 },
  md: { box: 40, font: 13 },
  lg: { box: 48, font: 15 },
  xl: { box: 96, font: 28 },
};

export function UserAvatar({
  firstName = '',
  lastName = '',
  profileImageUrl,
  role = 'student',
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
  const { box, font } = sizeMap[size];

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={`${firstName} ${lastName}`.trim() || 'Profile'}
        className={`rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm ${className}`}
        style={{ width: box, height: box }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white flex-shrink-0 ring-2 ring-white shadow-sm ${className}`}
      style={{
        width: box,
        height: box,
        background: avatarGradients[role],
        fontSize: font,
        fontWeight: 700,
      }}
    >
      {initials}
    </div>
  );
}
