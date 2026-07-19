import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, Send, UserPlus, Sparkles, Check, X, Edit3,
  AlertTriangle, Users,
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
import type { DocumentAnalysis } from '../api/client';

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
  const [rejectReason, setRejectReason] = useState('');
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

  const handleReview = async (action: string) => {
    if (action === 'rejected' && !rejectReason.trim()) {
      setError('Rejection description is required — explain why you are rejecting');
      return;
    }
    try {
      await api.reviewProject(projectId, {
        action,
        rejectionReason: action === 'rejected' ? rejectReason : undefined,
        message: action === 'changes_requested' ? 'Please revise your project based on feedback.' : undefined,
      });
      setRejectReason('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">{error || 'Not found'}</div>;

  const { project, members, aiAnalysis, latestSubmission } = data;
  const canEdit = isStudent && ['assigned', 'changes_requested'].includes(project.Status);
  const canSubmit = isStudent && ['assigned', 'changes_requested'].includes(project.Status);
  const canReview = (isTeacher || isAdmin) && ['submitted', 'under_review'].includes(project.Status);
  const isPendingTeacher = project.Status === 'pending_teacher';
  const isRejected = project.Status === 'rejected';
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} /> Back to My Projects
      </Link>

      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-sm font-bold text-green-700">{project.TeacherAssignedId}</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{project.Title}</h1>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Assigned: {new Date(project.AssignedAt).toLocaleString()}
              {latestSubmission && ` · Submitted: ${new Date(latestSubmission.SubmittedAt).toLocaleString()}`}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-blue-50 text-blue-700">
            {project.Status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {isPendingTeacher && isStudent && (
        <div className="rounded-xl border p-4 text-sm text-gray-800" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          Awaiting teacher decision
        </div>
      )}

      {isRejected && rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="font-bold text-red-800 text-sm">Rejection Reason</h3>
          <p className="text-sm text-red-700 mt-1">{rejectionReason}</p>
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
          } : undefined}
          projectTitle={project.Title}
          projectId={projectId}
          viewerRole={user?.Role || 'student'}
        />
      )}

      {/* Team members */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-blue-600" />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Team Members</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <span key={m.UserId} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium">
              {m.FirstName} {m.LastName} ({m.UniversityId})
            </span>
          ))}
        </div>
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

      {/* Athena AI Analysis — teachers and admins only */}
      {aiAnalysis && isTeacher && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-green-600" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>Athena AI Analysis (Advisory)</h3>
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

      {/* Teacher review */}
      {canReview && (
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Teacher Review</h3>
          <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Rejection description (required if rejecting)" className="w-full px-3 py-2 rounded-lg border text-sm" required />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => handleReview('approved')}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">
              <Check size={14} /> Approve
            </button>
            <button onClick={() => handleReview('changes_requested')}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold">
              <Edit3 size={14} /> Request Changes
            </button>
            <button onClick={() => handleReview('rejected')}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
              <X size={14} /> Reject
            </button>
          </div>
        </div>
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
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setChatScope('teacher_student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${chatScope === 'teacher_student' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                Private (Teacher)
              </button>
              <button type="button" onClick={() => setChatScope('project_group')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${chatScope === 'project_group' ? 'bg-green-600 text-white' : 'bg-white'}`}>
                Group (Team)
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
