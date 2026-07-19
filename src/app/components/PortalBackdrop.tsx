import { BrandBackground } from './BrandBackground';

interface PortalBackdropProps {
  children: React.ReactNode;
}

/** Uses the same homepage student photo background */
export function PortalBackdrop({ children }: PortalBackdropProps) {
  return (
    <BrandBackground variant="student">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="relative z-10 w-full flex justify-center">{children}</div>
      </div>
    </BrandBackground>
  );
}
