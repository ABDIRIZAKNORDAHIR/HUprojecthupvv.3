import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Check, Mail, FolderKanban, Copy, IdCard, Layers, UserCheck, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { PageHero } from '../components/PageHero';
import { HU_IMAGES } from '../config/appImages';
import { UniversityIdLookup, type LookupPerson } from '../components/UniversityIdLookup';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface TeamMember {
  ProjectId: number;
  TeacherAssignedId: string;
  Title: string;
  Status: string;
  Abstract?: string;
  UserId: number;
  UniversityId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Department?: string;
  ProfileImageUrl?: string | null;
  JoinedAt: string;
  IsOwner: number;
  MemberNote?: string;
}

export function MyTeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagingId, setMessagingId] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ projectId: '', universityId: '', inviteNote: '' });
  const [foundStudent, setFoundStudent] = useState<LookupPerson | null>(null);
  const [copiedId, setCopiedId] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamRes, invRes] = await Promise.all([api.getTeam(), api.getInvitations()]);
      setTeam(teamRes.team as unknown as TeamMember[]);
      setInvitations(invRes.invitations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.UserId) load(); }, [user?.UserId]);

  const byProject = team.reduce<Record<number, { title: string; id: string; abstract?: string; status: string; members: TeamMember[] }>>((acc, m) => {
    if (!acc[m.ProjectId]) acc[m.ProjectId] = { title: m.Title, id: m.TeacherAssignedId, abstract: m.Abstract, status: m.Status, members: [] };
    acc[m.ProjectId].members.push(m);
    return acc;
  }, {});

  const myProjects = Object.entries(byProject).filter(([, g]) => g.members.some(m => m.UserId === user?.UserId && m.IsOwner));

  const sendInvite = async () => {
    if (!inviteForm.projectId || !inviteForm.universityId || !foundStudent) return;
    try {
      await api.inviteTeamMember({
        projectId: Number(inviteForm.projectId),
        universityId: inviteForm.universityId,
        inviteNote: inviteForm.inviteNote,
      });
      setShowInvite(false);
      setInviteForm({ projectId: '', universityId: '', inviteNote: '' });
      setFoundStudent(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    }
  };

  const acceptInvite = async (projectId: number) => {
    setError('');
    try {
      await api.acceptInvite(projectId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept invitation');
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const messageClassmate = async (member: TeamMember) => {
    if (!user?.UserId || member.UserId === user.UserId) return;
    setMessagingId(member.UserId);
    setError('');
    try {
      const r = await api.startDirectMessage(
        member.UserId,
        `${member.FirstName} ${member.LastName}`,
      );
      navigate('/messages', { state: { openConversationId: r.conversationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open chat');
    } finally {
      setMessagingId(null);
    }
  };

  const openTeamChat = async (projectId: number, title: string) => {
    setError('');
    try {
      const r = await api.createConversation({
        type: 'project_group',
        projectId,
        title: `${title} team`,
      });
      navigate('/messages', { state: { openConversationId: r.conversationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open team chat');
    }
  };

  return (
    <div className="student-team-page p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-mobile-nav">
      <PageHero
        icon={Users}
        eyebrow="Team collaboration"
        title="My project teams"
        subtitle="Invite classmates by HU ID, confirm roles, and keep every project team organized."
        image={HU_IMAGES.teamWork}
      >
        {myProjects.length > 0 && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowInvite(true)}
            className="student-team-invite flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sm font-semibold shadow-sm shrink-0">
            <UserPlus size={16} /> Invite Member
          </motion.button>
        )}
      </PageHero>

      <div className="student-team-stats">
        <article>
          <span><Layers size={18} /></span>
          <div><strong><AnimatedCounter value={Object.keys(byProject).length} /></strong><p>Active project teams</p></div>
        </article>
        <article>
          <span><Users size={18} /></span>
          <div><strong><AnimatedCounter value={team.length} /></strong><p>Connected classmates</p></div>
        </article>
        <article>
          <span><Mail size={18} /></span>
          <div><strong><AnimatedCounter value={invitations.length} /></strong><p>Invitations waiting</p></div>
        </article>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

      {invitations.length > 0 && (
        <div className="student-team-invitations rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-bold text-amber-900"><Mail size={18} /> Pending Invitations</h2>
          {invitations.map(inv => (
            <div key={String(inv.InvitationId)} className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="font-semibold text-gray-900">{String(inv.Title)}</p>
              <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-2">
                <span>From {String(inv.InvitedByName)}</span>
                <span className="font-mono font-bold text-green-700">{String(inv.InvitedByUniversityId)}</span>
              </p>
              {Boolean(inv.InviteNote) && <p className="text-sm text-gray-600 mt-2">{String(inv.InviteNote)}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => acceptInvite(Number(inv.ProjectId))}
                className="mt-3 flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">
                <Check size={14} /> Accept Invitation
              </motion.button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : Object.keys(byProject).length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-white rounded-2xl border shadow-sm">
          <UserCheck size={44} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No team yet</p>
          <p className="text-sm text-gray-400 mt-1">Assign a project to a teacher first, then invite teammates.</p>
          <Link to="/projects" className="inline-block mt-4 text-green-600 font-semibold text-sm">Go to My Projects →</Link>
        </div>
      ) : (
        Object.entries(byProject).map(([projectId, group]) => (
          <motion.div key={projectId} className="student-team-card bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">{group.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{group.status.replace('_', ' ')}</span>
                </div>
                <h3 className="font-bold text-lg mt-2 text-gray-900">{group.title}</h3>
                {group.abstract && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{group.abstract}</p>}
                <p className="text-xs text-gray-400 mt-2">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                <Link to={`/projects/${projectId}`}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold text-blue-600 hover:bg-blue-50">
                  <FolderKanban size={14} /> Open Project
                </Link>
                <button
                  type="button"
                  onClick={() => openTeamChat(Number(projectId), group.title)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold text-green-700 hover:bg-green-50"
                >
                  <MessageSquare size={14} /> Team chat
                </button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3 font-semibold">Member</th>
                    <th className="px-6 py-3 font-semibold">HU ID</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold">Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.members.map(m => (
                    <tr key={`${m.ProjectId}-${m.UserId}`} className="hover:bg-gray-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar firstName={m.FirstName} lastName={m.LastName}
                            profileImageUrl={m.ProfileImageUrl} role="student" size="md" />
                          <div>
                            <p className="font-semibold text-gray-900">{m.FirstName} {m.LastName}</p>
                            {m.Department && <p className="text-xs text-gray-400">{m.Department}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => copyId(m.UniversityId)}
                          className="font-mono font-bold text-green-700 flex items-center gap-1 hover:underline">
                          <IdCard size={14} /> {m.UniversityId}
                          {copiedId === m.UniversityId && <span className="text-xs text-gray-400">Copied</span>}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{m.Email}</td>
                      <td className="px-6 py-4">
                        {m.IsOwner ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold">Project Owner</span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">Team Member</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {m.UserId === user?.UserId ? (
                          <span className="text-xs text-slate-400">You</span>
                        ) : (
                          <button
                            type="button"
                            disabled={messagingId === m.UserId}
                            onClick={() => messageClassmate(m)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            <MessageSquare size={13} />
                            {messagingId === m.UserId ? 'Opening…' : 'Message'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {group.members.map(m => (
                <div key={`${m.ProjectId}-${m.UserId}-m`} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar firstName={m.FirstName} lastName={m.LastName}
                      profileImageUrl={m.ProfileImageUrl} role="student" size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{m.FirstName} {m.LastName}</p>
                      <button type="button" onClick={() => copyId(m.UniversityId)}
                        className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-green-700">
                        <IdCard size={14} /> {m.UniversityId}
                        <Copy size={12} className="text-gray-400" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{m.Email}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {m.IsOwner ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold">Owner</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">Member</span>
                        )}
                        {m.UserId !== user?.UserId && (
                          <button
                            type="button"
                            disabled={messagingId === m.UserId}
                            onClick={() => messageClassmate(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold text-green-700"
                          >
                            <MessageSquare size={12} />
                            {messagingId === m.UserId ? 'Opening…' : 'Message'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg">Invite Team Member</h2>
            <p className="text-xs text-gray-500">Enter their HU ID — we will look up their full name before sending.</p>
            <div>
              <label className="text-sm font-semibold">Your Project</label>
              <select value={inviteForm.projectId} onChange={e => setInviteForm(f => ({ ...f, projectId: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm">
                <option value="">Select project...</option>
                {myProjects.map(([id, g]) => (
                  <option key={id} value={id}>{g.title}</option>
                ))}
              </select>
            </div>
            <div>
              <UniversityIdLookup
                role="student"
                label="Student HU ID *"
                value={inviteForm.universityId}
                onChange={v => setInviteForm(f => ({ ...f, universityId: v }))}
                onFound={setFoundStudent}
              />
            </div>            <div>
              <label className="text-sm font-semibold">Invitation Note</label>
              <textarea value={inviteForm.inviteNote} onChange={e => setInviteForm(f => ({ ...f, inviteNote: e.target.value }))}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm" rows={3}
                placeholder="What they'll work on, their role on the team..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold">Cancel</button>
              <button onClick={sendInvite} disabled={!inviteForm.projectId || !foundStudent}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                {foundStudent ? `Invite ${foundStudent.FirstName}` : 'Find student first'}
              </button>            </div>
          </div>
        </div>
      )}
    </div>
  );
}
