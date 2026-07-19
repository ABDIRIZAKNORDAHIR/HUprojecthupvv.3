import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Users, Activity, Globe, Sparkles, CheckCircle2, Circle, BarChart3, Trash2, Link2, UserPlus, GraduationCap } from "lucide-react";
import { Link } from "react-router";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { KPICard } from "./KPICard";
import { ExportButtons, exportAdminDashboardReport } from "./ExportButtons";
import { buildAdminReportSections } from "../utils/adminExport";
import { AdminPendingAccountsPanel } from "./AdminPendingAccountsPanel";
import { AdminCredentialsPanel } from "./AdminCredentialsPanel";
import { AdminDeleteDialog, type DeleteTarget } from "./AdminDeleteDialog";
import { api } from "../api/client";
import { formatUniversityId } from "../utils/universityId";
import { PageHero } from "./PageHero";
import { APP_IMAGES } from "../config/appImages";
import type { ViewId } from "../types";

interface AdminDashboardProps {
  activeView: ViewId;
}

export function AdminDashboard({ activeView }: AdminDashboardProps) {
  const [live, setLive] = useState<Awaited<ReturnType<typeof api.getAdminLive>> | null>(null);
  const [connections, setConnections] = useState<Awaited<ReturnType<typeof api.getAdminConnections>> | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof api.getAdminCharts>> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingStudent, setDeletingStudent] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [loadErr, setLoadErr] = useState('');

  const load = useCallback(() => {
    Promise.all([api.getAdminLive(), api.getAdminStats(), api.getAdminCharts(), api.getAdminConnections()])
      .then(([l, s, c, conn]) => {
        setLive(l); setStats(s); setCharts(c); setConnections(conn);
        setLoadErr('');
      })
      .catch(e => setLoadErr(e instanceof Error ? e.message : 'Failed to load dashboard data'));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (activeView !== "dashboard") {
    return (
      <div className="p-6 max-w-screen-2xl mx-auto">
        <p className="text-gray-500">Use sidebar navigation for admin tools.</p>
      </div>
    );
  }

  const studentCount = (stats?.usersByRole as Array<{ Role: string; Count: number }>)?.find(r => r.Role === 'student')?.Count || 0;
  const pendingReview = (stats?.pendingReview as number) || 0;
  const pendingAccounts = (stats?.pendingAccounts as number) || 0;

  const roleChartData = (charts?.usersByRole || []).map(r => ({
    name: r.Role.charAt(0).toUpperCase() + r.Role.slice(1),
    count: Number(r.count),
  }));
  const projectChartData = (charts?.projectsByStatus || []).map(p => ({
    name: String(p.Status || 'unknown'),
    count: Number(p.count),
  }));
  const loginChartData = (charts?.weeklyLogins || []).map(d => ({
    day: d.day ? new Date(String(d.day)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
    logins: Number(d.count),
  }));
  const deptChartData = (charts?.studentsByDepartment || []).map(d => ({
    dept: String(d.dept),
    students: Number(d.count),
  }));
  const PIE_COLORS = ['#7C3AED', '#2563EB', '#16A34A', '#EAB308', '#EA580C', '#64748B'];

  const exportReport = (format: 'excel' | 'pdf') => {
    const sections = buildAdminReportSections(live, stats);
    exportAdminDashboardReport(sections, format);
  };

  const deleteStudent = async () => {
    if (!deleteTarget) return;
    setDeletingStudent(deleteTarget.UserId);
    setDeleteErr('');
    try {
      const r = await api.deleteAdminUser(deleteTarget.UserId);
      setDeleteMsg(r.message);
      setDeleteTarget(null);
      load();
      setRefreshKey(k => k + 1);
      setTimeout(() => setDeleteMsg(''), 5000);
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingStudent(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-screen-2xl mx-auto pb-mobile-nav">
      <PageHero
        title="Admin"
        subtitle={`${live?.onlineCount || 0} online · ${studentCount} students`}
        image={APP_IMAGES.campusGroup}
        gradient={`linear-gradient(135deg, rgba(15,45,92,0.94), rgba(22,128,85,0.9))`}
      >
        <ExportButtons
          variant="onDark"
          label="Export"
          onExportExcel={() => exportReport('excel')}
          onExportPdf={() => exportReport('pdf')}
        />
      </PageHero>

      {loadErr && (
        <p className="text-sm text-red-700 font-semibold bg-red-50 p-3 rounded-xl border border-red-100">{loadErr}</p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Online Now" value={live?.onlineCount || 0} icon={Globe} iconColor="#7C3AED" iconBg="#F5F3FF" index={0} />
        <KPICard title="Students" value={studentCount} icon={Users} iconColor="#168055" iconBg="#F0FDF4" index={1} />
        <KPICard title="Pending Review" value={pendingReview} icon={Sparkles} iconColor="#EAB308" iconBg="#FEFCE8" index={2} />
        <KPICard title="Pending Accounts" value={pendingAccounts} icon={Users} iconColor="#EA580C" iconBg="#FFF7ED" index={3} />
        <KPICard title="Assignment Requests" value={(stats?.pendingAssignments as number) || 0} icon={Activity} iconColor="#2563EB" iconBg="#EFF6FF" index={4} />
      </div>

      <AdminPendingAccountsPanel onChange={() => { load(); setRefreshKey(k => k + 1); }} key={refreshKey} />

      {deleteMsg && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-100">{deleteMsg}</p>
      )}
      {deleteErr && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{deleteErr}</p>
      )}

      <AdminCredentialsPanel onChange={load} />

      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-600" /> Roles
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                  {roleChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" /> Projects
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-sm mb-4">Sign-ins</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={loginChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="logins" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-sm mb-4">Students by Department</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="dept" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="students" fill="#16A34A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online users */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Circle size={10} className="text-green-500 fill-green-500" /> Online Users
          </h3>
          {!live?.onlineUsers.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No users online in last 5 minutes</p>
          ) : (
            live.onlineUsers.map(u => (
              <div key={String(u.UserId)} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                  {String(u.FirstName)[0]}{String(u.LastName)[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{String(u.FirstName)} {String(u.LastName)}</p>
                  <p className="text-xs text-gray-500 capitalize">{String(u.Role)} · {String(u.Department || '—')}</p>
                </div>
                <span className="text-[10px] text-green-600 font-bold">LIVE</span>
              </div>
            ))
          )}
        </div>

        {/* Recent logins */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-sm mb-4">Recent Sign-ins</h3>
          {!live?.recentLogins?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent sign-ins</p>
          ) : live.recentLogins.map(u => (
            <div key={String(u.UserId)} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-semibold">{String(u.FirstName)} {String(u.LastName)}</p>
                <p className="text-xs text-gray-500">{String(u.UniversityId)} · <span className="capitalize">{String(u.Role)}</span></p>
              </div>
              <span className="text-xs text-gray-400">{u.LastLoginAt ? new Date(String(u.LastLoginAt)).toLocaleString() : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All students */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bold">Student Accounts</h3>
          <div className="flex items-center gap-3">
            <ExportButtons
              compact
              onExportExcel={() => exportReport('excel')}
              onExportPdf={() => exportReport('pdf')}
            />
            <Link to="/admin/users" className="text-sm text-purple-600 font-semibold whitespace-nowrap">Manage all users →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              {['HU ID', 'Name', 'Department', 'Projects', 'Status', 'Last Login', 'Online', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {live?.students.map(s => (
              <tr key={String(s.UserId)} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm font-bold text-green-700">{formatUniversityId(String(s.UniversityId))}</td>
                <td className="px-4 py-3 text-sm font-semibold">{String(s.FirstName)} {String(s.LastName)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{String(s.Department || '—')}</td>
                <td className="px-4 py-3 text-sm">{Number(s.ProjectCount)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 capitalize">{String(s.LatestStatus || 'none')}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {s.LastLoginAt ? new Date(String(s.LastLoginAt)).toLocaleString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {s.IsOnline ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-bold"><CheckCircle2 size={12} /> Online</span>
                  ) : (
                    <span className="text-xs text-gray-400">Offline</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button type="button"
                    onClick={() => setDeleteTarget({
                      UserId: Number(s.UserId),
                      FirstName: String(s.FirstName),
                      LastName: String(s.LastName),
                      Role: 'student',
                      UniversityId: String(s.UniversityId),
                    })}
                    disabled={deletingStudent === Number(s.UserId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={13} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Student ↔ Teacher & team connections */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Link2 size={16} className="text-purple-600" /> System Connections
          <span className="text-xs font-normal text-gray-400">Students, teachers & teams working together</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4 bg-purple-50/30">
            <p className="text-xs font-bold text-purple-700 uppercase mb-3 flex items-center gap-1">
              <GraduationCap size={12} /> Teacher Assignments
            </p>
            {!connections?.teacherAssignments?.length ? (
              <p className="text-xs text-gray-400">No assignments yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {connections.teacherAssignments.slice(0, 8).map(a => (
                  <div key={String(a.ProjectId)} className="text-xs bg-white rounded-lg p-2 border">
                    <p className="font-semibold truncate">{String(a.Title)}</p>
                    <p className="text-gray-600 mt-1">
                      {String(a.StudentName)} <span className="font-mono text-green-700">{formatUniversityId(String(a.StudentUniversityId))}</span>
                      → {String(a.TeacherName)} <span className="font-mono text-blue-700">{formatUniversityId(String(a.TeacherUniversityId))}</span>
                    </p>
                    <p className="text-gray-400 capitalize mt-0.5">{String(a.Status).replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border p-4 bg-blue-50/30">
            <p className="text-xs font-bold text-blue-700 uppercase mb-3 flex items-center gap-1">
              <UserPlus size={12} /> Team Invitations
            </p>
            {!connections?.teamInvites?.length ? (
              <p className="text-xs text-gray-400">No invites yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {connections.teamInvites.slice(0, 8).map(inv => (
                  <div key={String(inv.InvitationId)} className="text-xs bg-white rounded-lg p-2 border">
                    <p className="font-semibold truncate">{String(inv.Title)}</p>
                    <p className="text-gray-600 mt-1">
                      {String(inv.InviterName)} invited {String(inv.InvitedName)}
                    </p>
                    <p className="font-mono text-green-700">{formatUniversityId(String(inv.InvitedUniversityId))}</p>
                    <p className="text-gray-400 capitalize mt-0.5">{String(inv.Status)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border p-4 bg-green-50/30">
            <p className="text-xs font-bold text-green-700 uppercase mb-3 flex items-center gap-1">
              <Users size={12} /> Active Team Members
            </p>
            {!connections?.teamMembers?.length ? (
              <p className="text-xs text-gray-400">No team members yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {connections.teamMembers.slice(0, 8).map((m, i) => (
                  <div key={`${m.ProjectId}-${m.UniversityId}-${i}`} className="text-xs bg-white rounded-lg p-2 border">
                    <p className="font-semibold">{String(m.MemberName)} <span className="font-mono text-green-700">{formatUniversityId(String(m.UniversityId))}</span></p>
                    <p className="text-gray-500 truncate">{String(m.Title)}</p>
                    {Number(m.IsOwner) ? (
                      <span className="text-[10px] text-green-700 font-bold">Owner</span>
                    ) : (
                      <span className="text-[10px] text-blue-700 font-bold">Member</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-bold text-sm mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {!live?.recentActivity?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
          ) : live.recentActivity.slice(0, 10).map((a, i) => {
            const type = String(a.type || '');
            const typeLabel = type === 'team_invite' ? 'Team invite'
              : type === 'teacher_assign' ? 'Teacher assignment'
              : type === 'submission' ? 'Submission'
              : 'Project';
            return (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
              <Activity size={14} className="text-purple-500" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="text-xs font-bold text-purple-600 mr-2">{typeLabel}</span>
                  <strong>{String(a.actor || 'System')}</strong> — {String(a.detail)}
                </p>
                <p className="text-xs text-gray-400 capitalize">{String(a.extra)} · {a.time ? new Date(String(a.time)).toLocaleString() : ''}</p>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <AdminDeleteDialog
        user={deleteTarget}
        loading={deletingStudent === deleteTarget?.UserId}
        onConfirm={deleteStudent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
