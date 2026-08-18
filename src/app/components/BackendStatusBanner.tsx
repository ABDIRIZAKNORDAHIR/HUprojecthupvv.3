import { useEffect, useState } from 'react';
import { checkApiConnection } from '../api/client';

export function BackendStatusBanner() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      const ok = await checkApiConnection();
      if (!cancelled) setOnline(ok);
    };

    probe();
    const id = setInterval(probe, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (online !== false) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-[#06301f] text-white text-sm px-4 py-2.5 text-center shadow-md"
    >
      ProjectHub cannot reach the university server right now. Please try again in a moment.
    </div>
  );
}
