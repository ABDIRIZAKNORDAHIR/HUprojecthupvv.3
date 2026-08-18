const BRAND = 'Hormuud ProjectHub';

const EXACT: Record<string, string> = {
  '/': `${BRAND} — Hormuud University`,
  '/about': `About — ${BRAND}`,
  '/contact': `Contact — ${BRAND}`,
  '/privacy': `Privacy — ${BRAND}`,
  '/terms': `Acceptable use — ${BRAND}`,
  '/ai-notice': `Review tools — ${BRAND}`,
  '/login/student': `Student sign in — ${BRAND}`,
  '/login/teacher': `Teacher sign in — ${BRAND}`,
  '/login/admin': `Staff sign in — ${BRAND}`,
  '/register': `Create account — ${BRAND}`,
  '/register/student': `Student registration — ${BRAND}`,
  '/register/teacher': `Teacher registration — ${BRAND}`,
  '/projects': `My projects — ${BRAND}`,
  '/atlas': `Project Atlas — ${BRAND}`,
  '/settings': `Settings — ${BRAND}`,
  '/team': `My team — ${BRAND}`,
  '/feedback': `Feedback — ${BRAND}`,
  '/scores': `Progress — ${BRAND}`,
  '/my-teacher': `My teachers — ${BRAND}`,
  '/messages': `Messages — ${BRAND}`,
  '/class-assignments': `Class assignments — ${BRAND}`,
  '/students': `Students — ${BRAND}`,
  '/ai-queue': `Review queue — ${BRAND}`,
  '/submissions': `Submissions — ${BRAND}`,
  '/analytics': `Reports — ${BRAND}`,
  '/admin/overview': `Administration — ${BRAND}`,
  '/admin/health': `System health — ${BRAND}`,
  '/admin/users': `Users — ${BRAND}`,
  '/batch-scanner': `Originality scanner — ${BRAND}`,
};

export function pageTitleFor(pathname: string, signedIn = false): string {
  if (pathname.startsWith('/projects/') && pathname !== '/projects') return `Project — ${BRAND}`;
  if (pathname.startsWith('/students/') && pathname !== '/students') return `Student record — ${BRAND}`;
  if (/^\/class-assignments\/[^/]+/.test(pathname)) return `Assignment review — ${BRAND}`;
  if (pathname === '/' && signedIn) return `Dashboard — ${BRAND}`;
  return EXACT[pathname] || BRAND;
}
