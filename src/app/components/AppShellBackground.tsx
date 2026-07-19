/** Subtle branded backdrop for the logged-in application */
export function AppShellBackground() {
  return (
    <div className="app-shell-bg" aria-hidden>
      <div className="app-shell-bg-gradient" />
      <div className="app-shell-bg-grid" />
      <div className="app-shell-bg-orb app-shell-bg-orb--1" />
      <div className="app-shell-bg-orb app-shell-bg-orb--2" />
    </div>
  );
}
