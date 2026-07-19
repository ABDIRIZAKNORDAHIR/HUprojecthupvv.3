import { HU_BRAND_GREEN, UNIVERSITY_NAME, APP_NAME } from '../config/appImages';
import { StudentPhotoBackground } from './StudentPhotoBackground';
import { AuthPageNav } from './AuthPageShell';
import '../styles/welcome.css';

interface BrandBackgroundProps {
  children: React.ReactNode;
  variant?: 'light' | 'green' | 'student';
}

/** Brand shell — student photo background on homepage & auth */
export function BrandBackground({ children, variant = 'light' }: BrandBackgroundProps) {
  const isGreen = variant === 'green';
  const isStudent = variant === 'student';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {isStudent ? (
        <StudentPhotoBackground />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: isGreen
              ? `linear-gradient(165deg, ${HU_BRAND_GREEN} 0%, #126b44 55%, #0d5234 100%)`
              : 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 45%, #ecfdf5 100%)',
          }}
        />
      )}

      {!isStudent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(${HU_BRAND_GREEN} 1px, transparent 1px), linear-gradient(90deg, ${HU_BRAND_GREEN} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      <div className={`relative z-10 flex-1 flex flex-col ${isStudent ? 'brand-bg-student-content' : ''}`}>
        {children}
      </div>
    </div>
  );
}

/** Auth pages — same student photo background as homepage */
export function AuthLayout({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <BrandBackground variant="student">
      <div className="auth-page min-h-screen flex flex-col">
        <AuthPageNav />
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-10">
          <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}>{children}</div>
        </div>
        <footer className="auth-page-footer">
          <p>© {new Date().getFullYear()} {APP_NAME} · {UNIVERSITY_NAME}</p>
        </footer>
      </div>
    </BrandBackground>
  );
}
