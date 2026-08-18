import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, UserPlus, CheckCircle2, Edit3,
  AlertTriangle, Users, CalendarClock, Send, Lock, UsersRound,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ProgressRing } from '../components/ProgressRing';
import { type ChatMessage } from '../components/ChatMessage';
import { TeacherConnectionCard } from '../components/TeacherConnectionCard';
import { ProjectChatPanel } from '../components/ProjectChatPanel';
import { ProjectEvaluationPanel } from '../components/ProjectEvaluationPanel';
import { DocumentAnalysisPanel } from '../components/DocumentAnalysisPanel';
import { ProjectAIAssistant } from '../components/ProjectAIAssistant';
import { UniversityIdLookup, type LookupPerson } from '../components/UniversityIdLookup';
import { UserAvatar } from '../components/UserAvatar';
import { WaitingMark } from '../components/WaitingIcon';
import { ReviewDecisionPanel, type ReviewDecision } from '../components/ReviewDecisionPanel';
import type { DocumentAnalysis } from '../api/client';

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'changes_requested') return 'danger';
  if (status === 'submitted' || status === 'under_review' || status === 'pending_teacher') return 'warning';
  return 'info';
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const projectId = parseInt(id || '0', 10);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getProject>> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingFile, setPendingFile] = useState<{ name: string; type: 'image' | 'video' | 'file'; data: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', abstract: '', description: '' });
  const [submitForm, setSubmitForm] = useState({ title: '', abstract: '', content: '' });
  const [inviteId, setInviteId] = useState('');
  const [foundMember, setFoundMember] = useState<LookupPerson | null>(null);
  const [inviteNote, setInviteNote] = useState('');
  const [inviting, setInviting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [docAnalyses, setDocAnalyses] = useState<DocumentAnalysis[]>([]);
  const [chatScope, setChatScope] = useState<'teacher_student' | 'project_group'>('teacher_student');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const isStudent = user?.Role === 'student';
  const isTeacher = user?.Role === 'teacher';
  const isAdmin = user?.Role === 'admin';
  const canChat = user?.Role === 'student' || user?.Role === 'teacher';

  const load = async () => {
    try {
      const proj = await api.getProject(projectId);
      setData(proj);
      if (canChat) {
        const msgs = await api.getMessages(projectId);
        setMessages(msgs.messages);
      } else {
        setMessages([]);
      }
      if (user?.Role === 'teacher') {
        try {
          const da = await api.getDocumentAnalyses(projectId);
          setDocAnalyses(da.analyses);
        } catch { setDocAnalyses([]); }
      }
      setEditForm({
        title: proj.project.Title,
        abstract: proj.project.Abstract || '',
        description: proj.project.Description || '',
      });
      setSubmitForm({
        title: proj.project.Title,
        abstract: proj.project.Abstract || '',
        content: proj.project.Description || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Fetch a fresh view when project or signed-in user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [projectId, user?.UserId]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (window.location.hash === '#chat') {
      setTimeout(() => document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [loading]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !pendingFile) return;
    setSending(true);
    try {
      await api.sendMessage(projectId, {
        content: newMessage.trim(),
        messageScope: chatScope,
        ...(pendingFile ? {
          attachmentType: pendingFile.type,
          attachmentName: pendingFile.name,
          attachmentData: pendingFile.data,
        } : {}),
      });
      setNewMessage('');
      setPendingFile(null);
      const msgs = await api.getMessages(projectId);
      setMessages(msgs.messages);
      if (isTeacher) {
        try {
          const da = await api.getDocumentAnalyses(projectId);
          setDocAnalyses(da.analyses);
        } catch { /* empty */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await api.submitProject(projectId, submitForm);
      alert(result.message || 'Project submitted successfully. Your teacher will review it.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    }
  };

  const handleReview = async (action: ReviewDecision, comment: string) => {
    setReviewing(true);
    setError('');
    try {
      // A proposal that has not been accepted yet goes through the assignment flow.
      if (data?.project.Status === 'pending_teacher') {
        await api.respondToAssignment(projectId, {
          action: action === 'approved' ? 'accept' : action === 'rejected' ? 'reject' : 'request_changes',
          rejectionReason: action === 'rejected' ? comment : undefined,
          message: action !== 'rejected' ? comment || undefined : undefined,
        });
      } else {
        await api.reviewProject(projectId, {
          action,
          rejectionReason: action === 'rejected' ? comment : undefined,
          message: action !== 'rejected' ? comment || undefined : undefined,
        });
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">{error || 'Not found'}</div>;

  const { project, members, aiAnalysis, latestSubmission } = data;
  const canEdit = isStudent && ['assigned', 'changes_requested'].includes(project.Status);
  const canSubmit = isStudent && ['assigned', 'changes_requested'].includes(project.Status);
  const canReview = (isTeacher || isAdmin)
    && ['pending_teacher', 'submitted', 'under_review'].includes(project.Status);
  const isPendingTeacher = project.Status === 'pending_teacher';
  const isRejected = project.Status === 'rejected';
  const needsChanges = project.Status === 'changes_requested';
  const rejectionReason = (project as { RejectionReason?: string }).RejectionReason;

  const rejectionReasons = (() => {
    if (!aiAnalysis?.RejectionReasons) return [];
    try {
      const parsed = JSON.parse(aiAnalysis.RejectionReasons);
      return Array.isArray(parsed) ? parsed : [String(aiAnalysis.RejectionReasons)];
    } catch {
      return [String(aiAnalysis.RejectionReasons)];
    }
  })();

  const chatPartner = isStudent
    ? {
        name: project.TeacherName || 'Teacher',
        role: 'teacher' as const,
        universityId: project.TeacherUniversityId,
        profileImageUrl: (project as { TeacherProfileImageUrl?: string }).TeacherProfileImageUrl,
      }
    : {
        name: project.OwnerName || 'Student',
        role: 'student' as const,
        universityId: project.OwnerUniversityId,
        profileImageUrl: (project as { OwnerProfileImageUrl?: string }).OwnerProfileImageUrl,
      };

  const ownerStudentId = Number(
    (project as { OwnerStudentUserId?: number; OwnerStudentId?: number }).OwnerStudentUserId
    || project.OwnerStudentId
    || 0,
  ) || null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to My Projects
      </Link>

      <motion.header
        className="project-head"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="project-head__top">
          <span className="project-head__code">{project.TeacherAssignedId}</span>
          <span className={`project-head__status project-head__status--${statusTone(project.Status)}`}>
            {project.Status.replace(/_/g, ' ')}
          </span>
        </div>
        <h1>{project.Title}</h1>
        <dl className="project-head__meta">
          <div>
            <dt><CalendarClock size={13} /> Assigned</dt>
            <dd>{new Date(project.AssignedAt).toLocaleString()}</dd>
          </div>
          {latestSubmission && (
            <div>
              <dt><Send size={13} /> Submitted</dt>
              <dd>{new Date(latestSubmission.SubmittedAt).toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt><Users size={13} /> Team</dt>
            <dd>{members.length} {members.length === 1 ? 'member' : 'members'}</dd>
          </div>
        </dl>
      </motion.header>

      {isPendingTeacher && isStudent && (
        <div className="flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold"
          style={{ background: 'linear-gradient(180deg,#fffdf5,#fff7e6)', borderColor: '#fde3ac', color: '#92400e' }}>
          <WaitingMark size={22} />
          Waiting for your teacher to review this project. You will be notified as soon as a decision is made.
        </div>
      )}

      {(isRejected || needsChanges) && rejectionReason && (
        <div className={`rounded-xl border p-4 ${isRejected ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <h3 className={`text-sm font-bold ${isRejected ? 'text-red-800' : 'text-amber-800'}`}>
            {isRejected ? 'Why this project was rejected' : 'Changes requested by your teacher'}
          </h3>
          <p className={`mt-1 text-sm ${isRejected ? 'text-red-700' : 'text-amber-700'}`}>{rejectionReason}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {canChat && project.TeacherName && (
        <TeacherConnectionCard
          teacher={{
            name: project.TeacherName,
            universityId: project.TeacherUniversityId || '',
            email: (project as { TeacherEmail?: string }).TeacherEmail,
            department: (project as { TeacherDepartment?: string }).TeacherDepartment,
            profileImageUrl: (project as { TeacherProfileImageUrl?: string }).TeacherProfileImageUrl,
            role: 'teacher',
          }}
          student={project.OwnerName ? {
            name: project.OwnerName,
            universityId: project.OwnerUniversityId || '',
            email: (project as { OwnerEmail?: string }).OwnerEmail,
            profileImageUrl: (project as { OwnerProfileImageUrl?: string }).OwnerProfileImageUrl,
            role: 'student',
            userId: ownerStudentId,
          } : undefined}
          projectTitle={project.Title}
          projectId={projectId}
          viewerRole={user?.Role || 'student'}
        />
      )}

      {/* Team members */}
      <div className="project-panel">
        <div className="project-panel__head">
          <span className="project-panel__icon"><Users size={16} /></span>
          <h3>Team members</h3>
          <span className="project-panel__count">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <p className="project-panel__hint">No teammates yet. Invite a classmate by their HU ID.</p>
        ) : (
          <ul className="team-chips">
            {members.map(m => {
              const chip = (
                <>
                  <UserAvatar
                    firstName={String(m.FirstName || '')}
                    lastName={String(m.LastName || '')}
                    profileImageUrl={(m as { ProfileImageUrl?: string | null }).ProfileImageUrl}
                    role="student"
                    size="sm"
                  />
                  <div>
                    <strong>{m.FirstName} {m.LastName}</strong>
                    <em>{m.UniversityId}</em>
                  </div>
                </>
              );
              return (
                <li key={m.UserId} className="team-chip">
                  {isTeacher || isAdmin ? (
                    <Link to={`/students/${m.UserId}`} className="team-chip__link">{chip}</Link>
                  ) : chip}
                </li>
              );
            })}
          </ul>
        )}
        {canEdit && (
          <div className="mt-3 space-y-3">
            <UniversityIdLookup
              role="student"
              label="Invite teammate by HU ID"
              value={inviteId}
              onChange={setInviteId}
              onFound={setFoundMember}
            />
            <textarea value={inviteNote} onChange={e => setInviteNote(e.target.value)}
              placeholder="Optional note — what they'll work on..."
              className="w-full px-3 py-2 rounded-lg border text-sm" rows={2} />
            <motion.button whileTap={{ scale: 0.97 }} disabled={!foundMember || inviting}
              onClick={async () => {
                if (!foundMember) return;
                setInviting(true);
                try {
                  await api.inviteTeamMember({
                    projectId,
                    universityId: inviteId,
                    inviteNote: inviteNote || undefined,
                  });
                  setInviteId('');
                  setInviteNote('');
                  setFoundMember(null);
                  alert(`Invitation sent to ${foundMember.FirstName} ${foundMember.LastName}`);
                  load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Invite failed');
                } finally {
                  setInviting(false);
                }
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
              <UserPlus size={14} /> {foundMember ? `Invite ${foundMember.FirstName}` : 'Enter a valid student ID'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Student edit & submit */}
      {canEdit && (
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}><Edit3 size={16} className="inline mr-1" /> Edit Project</h3>
          <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm" />
          <textarea value={editForm.abstract} onChange={e => setEditForm(f => ({ ...f, abstract: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm" rows={3} />
          <button onClick={async () => { await api.updateProject(projectId, editForm); load(); }}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold">Save Changes</button>
        </div>
      )}

      {canSubmit && (
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Submit to Teacher</h3>
          <p style={{ fontSize: 12, color: '#64748B' }}>Your teacher will review your submission and share feedback with you.</p>
          <textarea value={submitForm.abstract} onChange={e => setSubmitForm(f => ({ ...f, abstract: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border text-sm" rows={4} />
          <motion.button whileHover={{ scale: 1.02 }} onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #16A34A, #2563EB)' }}>
            Submit Project
          </motion.button>
        </div>
      )}

      {/* Similarity analysis — teachers and admins only */}
      {aiAnalysis && isTeacher && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-green-600" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>Similarity analysis (advisory)</h3>
          </div>
          <div className="flex gap-6 items-center">
            <ProgressRing value={Number(aiAnalysis.UniquenessScore)} size={90} label="Unique" />
            <div className="flex-1 space-y-2">
              <p style={{ fontSize: 13, fontWeight: 600 }}>{aiAnalysis.AISuggestion}</p>
              {aiAnalysis.SimilarProjectAssignedId && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <AlertTriangle size={14} className="text-yellow-600" />
                  <span style={{ fontSize: 12, color: '#92400E' }}>
                    Similar to project ID <strong>{aiAnalysis.SimilarProjectAssignedId}</strong> ({aiAnalysis.SimilarityPercent}% match)
                  </span>
                </div>
              )}
              {rejectionReasons.length > 0 && isTeacher && (
                <ul className="text-xs text-red-600 space-y-1">
                  {rejectionReasons.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {isTeacher && (
        <ProjectAIAssistant
          projectId={projectId}
          review={canReview ? { busy: reviewing, onSubmit: handleReview } : undefined}
          onAnalysisUpdated={async () => {
            try {
              const da = await api.getDocumentAnalyses(projectId);
              setDocAnalyses(da.analyses);
            } catch { /* empty */ }
          }}
        />
      )}

      {isTeacher && docAnalyses.length > 0 && (() => {
        const sorted = [...docAnalyses].filter(a => a.FileType !== 'ai_real_analysis').sort((a, b) => {
          const aSub = a.FileType === 'project_submission' ? 0 : 1;
          const bSub = b.FileType === 'project_submission' ? 0 : 1;
          return aSub - bSub;
        });
        const submissionBrief = sorted.find(a => a.FileType === 'project_submission');
        const rest = sorted.filter(a => a.FileType !== 'project_submission');
        if (!submissionBrief && rest.length === 0) return null;
        return (
          <div className="space-y-3">
            {submissionBrief && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>
                  Submission summary
                </h3>
                <DocumentAnalysisPanel analysis={submissionBrief} teacherOnly />
              </>
            )}
            {rest.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>File & message summaries</h3>
                {rest.map((a, i) => (
                  <DocumentAnalysisPanel key={a.DocumentAnalysisId ?? i} analysis={a} teacherOnly />
                ))}
              </>
            )}
          </div>
        );
      })()}

      {canReview && (
        <ProjectEvaluationPanel
          projectId={projectId}
          studentId={project.OwnerStudentId ? Number(project.OwnerStudentId) : undefined}
          onSubmitted={load}
        />
      )}

      {/* Teachers decide inside the review card above; admins get the control here. */}
      {canReview && !isTeacher && (
        <ReviewDecisionPanel busy={reviewing} onSubmit={handleReview} />
      )}

      {isAdmin && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Admin view — metadata only
        </div>
      )}

      {/* Conversation — student and teacher only (private) */}
      {canChat && (
        <>
          {isStudent && (
            <div className="chat-scope" role="tablist" aria-label="Conversation type">
              <button
                type="button"
                role="tab"
                aria-selected={chatScope === 'teacher_student'}
                onClick={() => setChatScope('teacher_student')}
                className={chatScope === 'teacher_student' ? 'is-active' : undefined}
              >
                <Lock size={14} />
                <span>
                  <strong>Private</strong>
                  <em>You and your teacher</em>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chatScope === 'project_group'}
                onClick={() => setChatScope('project_group')}
                className={chatScope === 'project_group' ? 'is-active' : undefined}
              >
                <UsersRound size={14} />
                <span>
                  <strong>Team</strong>
                  <em>Everyone on the project</em>
                </span>
              </button>
            </div>
          )}
        <ProjectChatPanel
          projectId={projectId}
          projectTitle={project.Title}
          messages={messages}
          userId={user?.UserId}
          userRole={user?.Role}
          partner={chatPartner}
          newMessage={newMessage}
          pendingFile={pendingFile}
          sending={sending}
          onMessageChange={setNewMessage}
          onSend={sendMessage}
          onFilePick={setPendingFile}
          onError={setError}
          chatEndRef={chatEnd}
        />
        </>
      )}
    </div>
  );
}
