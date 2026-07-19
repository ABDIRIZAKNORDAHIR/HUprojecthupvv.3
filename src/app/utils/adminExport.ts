import type { ReportSection } from './exportReport';

type AdminLive = Awaited<ReturnType<typeof import('../api/client').api.getAdminLive>>;
type AdminStats = Record<string, unknown>;

export function buildAdminReportSections(
  live: AdminLive | null,
  stats: AdminStats | null
): ReportSection[] {
  const usersByRole = (stats?.usersByRole as Array<{ Role: string; Count: number }>) || [];
  const projectsByStatus = (stats?.projectsByStatus as Array<{ Status: string; Count: number }>) || [];

  const summaryRows: unknown[][] = [
    ['Online Users Now', live?.onlineCount ?? 0],
    ['Total Submissions', stats?.totalSubmissions ?? 0],
    ['Pending Review', stats?.pendingReview ?? 0],
    ['Pending Account Approvals', stats?.pendingAccounts ?? 0],
    ['Pending Assignment Requests', stats?.pendingAssignments ?? 0],
    ...usersByRole.map(r => [`${r.Role.charAt(0).toUpperCase()}${r.Role.slice(1)} Accounts`, r.Count]),
    ...projectsByStatus.map(p => [`Projects — ${String(p.Status).replace(/_/g, ' ')}`, p.Count]),
  ];

  const onlineRows = (live?.onlineUsers || []).map(u => [
    u.UniversityId,
    `${u.FirstName} ${u.LastName}`,
    u.Role,
    u.Department || '—',
    u.LastSeenAt ? new Date(String(u.LastSeenAt)).toLocaleString() : '—',
  ]);

  const loginRows = (live?.recentLogins || []).map(u => [
    u.UniversityId,
    `${u.FirstName} ${u.LastName}`,
    u.Role,
    u.Department || '—',
    u.LastLoginAt ? new Date(String(u.LastLoginAt)).toLocaleString() : 'Never',
  ]);

  const studentRows = (live?.students || []).map(s => [
    s.UniversityId,
    `${s.FirstName} ${s.LastName}`,
    s.Department || '—',
    s.ProjectCount,
    s.LatestStatus || 'none',
    s.LastLoginAt ? new Date(String(s.LastLoginAt)).toLocaleString() : 'Never',
    s.IsOnline ? 'Online' : 'Offline',
  ]);

  const activityRows = (live?.recentActivity || []).map(a => [
    a.actor || 'System',
    a.detail,
    a.extra,
    a.time ? new Date(String(a.time)).toLocaleString() : '—',
  ]);

  return [
    {
      sheetName: 'Statistics Summary',
      headers: ['Metric', 'Value'],
      rows: summaryRows,
    },
    {
      sheetName: 'Online Users',
      headers: ['HU ID', 'Name', 'Role', 'Department', 'Last Seen'],
      rows: onlineRows.length ? onlineRows : [['—', 'No users online', '—', '—', '—']],
    },
    {
      sheetName: 'Recent Sign-ins',
      headers: ['HU ID', 'Name', 'Role', 'Department', 'Last Login'],
      rows: loginRows.length ? loginRows : [['—', 'No sign-ins recorded', '—', '—', '—']],
    },
    {
      sheetName: 'Student Accounts',
      headers: ['HU ID', 'Name', 'Department', 'Projects', 'Latest Status', 'Last Login', 'Online'],
      rows: studentRows.length ? studentRows : [['—', 'No students', '—', 0, '—', '—', '—']],
    },
    {
      sheetName: 'Recent Activity',
      headers: ['User', 'Action', 'Status', 'Time'],
      rows: activityRows.length ? activityRows : [['—', 'No recent activity', '—', '—']],
    },
  ];
}
