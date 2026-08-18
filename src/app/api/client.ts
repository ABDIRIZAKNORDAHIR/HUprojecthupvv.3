const WORKING_BASE_KEY = 'projecthub_api_base';

function resolveApiBases(): string[] {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv?.trim()) return [fromEnv.trim().replace(/\/$/, '')];

  const saved =
    typeof window !== 'undefined' ? sessionStorage.getItem(WORKING_BASE_KEY) : null;
  const defaults = ['/api', 'http://localhost:3004/api', 'http://127.0.0.1:3004/api'];

  if (saved && defaults.includes(saved)) {
    return [saved, ...defaults.filter((b) => b !== saved)];
  }
  return defaults;
}

const API_BASES = resolveApiBases();

function rememberWorkingBase(base: string) {
  try {
    sessionStorage.setItem(WORKING_BASE_KEY, base);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function getToken() {
  return localStorage.getItem('projecthub_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('projecthub_token', token);
  else localStorage.removeItem('projecthub_token');
}

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number; noRetry?: boolean } = {},
): Promise<T> {
  const token = getToken();
  const { timeoutMs = 15000, noRetry = false, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // OTP must hit exactly one server — retrying other bases can send 2 emails and kill the first code
  const isOtp = path.includes('otp');
  const bases = (noRetry || isOtp) ? [API_BASES[0]] : API_BASES;

  let lastError: unknown;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...fetchOptions,
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: string;
        message?: string;
        hint?: string;
        code?: string;
      };
      if (!res.ok) {
        // A 404 with no JSON body means the endpoint is missing on the running
        // server, which normally happens when the API was not restarted.
        if (res.status === 404 && !data.error && !data.message) {
          lastError = new ApiError(
            'This feature is not available on the running server. Restart the ProjectHub API and try again.',
            'STALE_API',
          );
          continue;
        }
        const detail = [data.error || data.message || `Request failed (${res.status})`, data.hint]
          .filter(Boolean)
          .join(' — ');
        throw new ApiError(detail, data.code);
      }
      rememberWorkingBase(base);
      return data as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        lastError = new ApiError(
          isOtp
            ? 'Email is taking longer than expected. Try again in a moment.'
            : 'Request timed out. Wait a moment and try again.',
          'TIMEOUT',
        );
      }
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    'Cannot reach ProjectHub API. Double-click ProjectHub.bat and keep the API window open.',
    'NETWORK_ERROR',
  );
}

export async function checkApiConnection(): Promise<boolean> {
  try {
    const health = await request<{ status: string }>('/health');
    return health.status === 'ok';
  } catch {
    return false;
  }
}

export interface OtpDelivery {
  message: string;
  /** Normalized email address the code belongs to. */
  identity: string;
  email: string | null;
  expiresInMinutes: number;
  emailed: boolean;
  /** The address the code was sent to. */
  deliveredTo: string;
  notice?: string | null;
  /** Development only — shown when no mailbox is configured. Never set in production. */
  devCode?: string | null;
}

export interface User {
  UserId: number;
  UniversityId: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Role: 'student' | 'teacher' | 'admin';
  Department?: string;
  ProfileImageUrl?: string | null;
  Phone?: string | null;
  Bio?: string | null;
  ContactInfo?: string | null;
  ClassName?: string | null;
  StudyMode?: 'full_time' | 'part_time' | string | null;
  Specialty?: string | null;
  AccountStatus?: string;
  LastLoginAt?: string | null;
  IsOnline?: boolean;
}

export interface TeacherStudentBarometers {
  uniqueness: number | null;
  similarity: number | null;
  quality: number | null;
  projectMark: number | null;
  assignmentMark: number | null;
  assignmentBonus: number | null;
  gradedAssignments: number;
}

export interface TeacherStudentProject {
  ProjectId: number;
  Title: string;
  Status: string;
  AssignedAt?: string;
  SubmittedAt?: string;
  UniquenessScore?: number | null;
  SimilarityPercent?: number | null;
  QualityScore?: number | null;
  Grade?: number | null;
  Feedback?: string | null;
}

export interface TeacherStudent extends User {
  projectCount: number;
  viaProjects?: boolean;
  viaClass?: boolean;
  barometers: TeacherStudentBarometers;
  projects: TeacherStudentProject[];
}

export interface DocumentAnalysis {
  DocumentAnalysisId?: number;
  FileName: string;
  FileType?: string;
  Summary?: string;
  MainTopic?: string;
  KeyPoints?: string | string[];
  Objectives?: string | string[];
  QualityScore?: number;
  RelatedToProject?: boolean | number;
  GrammarIssues?: string | string[];
  MissingSections?: string | string[];
  PlagiarismNote?: string;
  Suggestions?: string | string[];
}

export interface Project {
  ProjectId: number;
  TeacherAssignedId: string;
  Title: string;
  Abstract?: string;
  Description?: string;
  Status: string;
  AssignedAt: string;
  SubmittedAt?: string;
  UpdatedAt?: string;
  TeacherName?: string;
  TeacherUniversityId?: string;
  TeacherProfileImageUrl?: string | null;
  OwnerName?: string;
  OwnerUniversityId?: string;
}

export interface AIAnalysis {
  UniquenessScore: number;
  AIConfidence: number;
  SimilarProjectAssignedId?: string;
  SimilarityPercent?: number;
  AISuggestion: string;
  SuggestedAction: string;
  RejectionReasons?: string;
}

export const api = {
  health: () => request<{
    status: string;
    service: string;
    server?: string;
    database: string;
  }>('/health'),

  login: (universityId: string | undefined, email: string, password: string, portalRole?: User['Role'], adminLoginToken?: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        website: '',
        ...(portalRole === 'admin'
          ? { portalRole: 'admin', adminLoginToken }
          : { universityId: universityId || undefined }),
      }),
    }),

  requestRegisterOtp: (data: {
    universityId: string;
    email: string;
    role?: 'student' | 'teacher';
  }) =>
    request<OtpDelivery>('/auth/register/request-otp', {
      method: 'POST',
      body: JSON.stringify({ ...data, website: '' }),
      timeoutMs: 60000,
    }),

  verifyRegisterOtp: (data: { email: string; code: string }) =>
    request<{
      registrationToken: string;
      identity: string;
      email: string | null;
      universityId: string;
      role: string;
      message: string;
    }>('/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ ...data, website: '' }),
      timeoutMs: 30000,
    }),

  requestAdminOtp: (email: string) =>
    request<OtpDelivery>('/auth/admin/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, website: '' }),
      timeoutMs: 60000,
    }),

  verifyAdminOtp: (data: { email: string; code: string }) =>
    request<{ adminLoginToken: string; email: string; message: string }>(
      '/auth/admin/verify-otp',
      { method: 'POST', body: JSON.stringify({ ...data, website: '' }), timeoutMs: 30000 },
    ),

  requestPasswordResetOtp: (data: {
    email: string;
    role: 'student' | 'teacher' | 'admin';
  }) =>
    request<OtpDelivery>('/auth/password-reset/request-otp', {
      method: 'POST',
      body: JSON.stringify({ ...data, website: '' }),
      timeoutMs: 60000,
    }),

  verifyPasswordResetOtp: (data: { email: string; code: string }) =>
    request<{ resetToken: string; identity: string; email: string | null; message: string }>(
      '/auth/password-reset/verify-otp',
      { method: 'POST', body: JSON.stringify({ ...data, website: '' }), timeoutMs: 30000 },
    ),

  confirmPasswordReset: (data: { resetToken: string; newPassword: string; confirmPassword?: string }) =>
    request<{ message: string; email: string; role: string }>(
      '/auth/password-reset/confirm',
      { method: 'POST', body: JSON.stringify({ ...data, website: '' }), timeoutMs: 30000 },
    ),

  register: (data: {
    universityId: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
    role?: 'student' | 'teacher';
    className?: string;
    studyMode?: 'full_time' | 'part_time';
    email: string;
    registrationToken: string;
  }) =>
    request<{ token?: string; user: User; pendingApproval?: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, website: '' }),
    }),

  me: () => request<{ user: User }>('/auth/me'),

  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    department?: string;
    profileImageUrl?: string | null;
    phone?: string | null;
    bio?: string | null;
    contactInfo?: string | null;
    className?: string | null;
    studyMode?: 'full_time' | 'part_time' | string | null;
  }) =>
    request<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  updateCredentials: (data: {
    currentPassword: string;
    newPassword?: string;
    email?: string;
  }) =>
    request<{ user: User; token: string; message: string }>('/auth/credentials', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProjects: () => request<{ projects: Project[] }>('/projects'),

  getProject: (id: number) =>
    request<{
      project: Project & {
        TeacherUserId?: number;
        TeacherEmail?: string;
        TeacherDepartment?: string;
        TeacherProfileImageUrl?: string | null;
        OwnerStudentId?: number;
        OwnerStudentUserId?: number;
        OwnerEmail?: string;
        OwnerProfileImageUrl?: string | null;
        AssignedByTeacherId?: number;
      };
      members: Array<{ UserId: number; UniversityId: string; FirstName: string; LastName: string }>;
      latestSubmission: { SubmissionId: number; SubmittedAt: string; Title: string; Abstract: string } | null;
      aiAnalysis: AIAnalysis | null;
    }>(`/projects/${id}`),

  createProject: (data: {
    teacherAssignedId: string;
    title: string;
    abstract?: string;
    ownerUniversityId?: string;
  }) => request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  updateProject: (id: number, data: { title?: string; abstract?: string; description?: string }) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  submitProject: (id: number, data: { title: string; abstract: string; content?: string }) =>
    request<{ submission: unknown; message: string }>(`/projects/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  inviteStudent: (id: number, data: { universityId?: string; email?: string }) =>
    request<{ message: string }>(`/projects/${id}/invite`, { method: 'POST', body: JSON.stringify(data) }),

  acceptInvite: (id: number) =>
    request<{ message: string }>(`/projects/${id}/accept-invite`, { method: 'POST' }),

  reviewProject: (id: number, data: { action: string; rejectionReason?: string; message?: string }) =>
    request<{ message: string; status: string }>(`/projects/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getReviewQueue: () => request<{ queue: Array<Record<string, unknown>> }>('/projects/queue/review'),

  getMessages: (projectId: number) =>
    request<{
      messages: Array<{
        MessageId: number;
        Content: string;
        SentAt: string;
        SenderId: number;
        SenderName: string;
        SenderRole: string;
        AttachmentType?: string | null;
        AttachmentName?: string | null;
        AttachmentData?: string | null;
      }>;
    }>(`/projects/${projectId}/messages`),

  sendMessage: (
    projectId: number,
    data: {
      content?: string;
      receiverId?: number;
      attachmentType?: 'image' | 'video' | 'file';
      attachmentName?: string;
      attachmentData?: string;
      messageScope?: 'teacher_student' | 'project_group';
    }
  ) =>
    request<{ message: unknown; documentAnalysis?: DocumentAnalysis | null }>(`/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAdminUsers: (role?: string, q?: string) => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (q?.trim()) params.set('q', q.trim());
    const qs = params.toString();
    return request<{ users: User[] }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  deleteAdminUser: (userId: number) =>
    request<{ message: string; deletedUser: { userId: number; universityId: string; email: string; role: string } }>(
      `/admin/users/${userId}`,
      { method: 'DELETE' }
    ),

  updateAdminUserAccount: (userId: number, data: { universityId?: string; email?: string; password?: string }) =>
    request<{ message: string; user: User }>(`/admin/users/${userId}/account`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getAdminCharts: () =>
    request<{
      usersByRole: Array<{ Role: string; count: number }>;
      projectsByStatus: Array<{ Status: string; count: number }>;
      weeklyLogins: Array<{ day: string; count: number }>;
      studentsByDepartment: Array<{ dept: string; count: number }>;
    }>('/admin/charts'),

  batchScan: (projectIds: number[]) =>
    request<{
      message: string;
      results: Array<{
        projectId: number;
        student: string;
        project: string;
        teacherAssignedId: string;
        uniqueness: number;
        collidesWith: string;
        action: 'Approve' | 'Review' | 'Reject';
        aiSuggestion: string;
        isOriginal?: boolean;
        universityId?: string;
        department?: string;
        className?: string;
        studyMode?: string;
        photo?: string | null;
        assignedAt?: string | null;
        originalOwner?: {
          projectId: number | null;
          teacherAssignedId: string | null;
          title: string;
          status: string;
          claimedAt: string | null;
          studentId: number | null;
          name: string;
          universityId: string;
          department: string;
          className: string;
          studyMode: string;
          photo: string | null;
        } | null;
        laterCopies?: Array<{
          projectId: number | null;
          name: string;
          universityId: string;
          department: string;
          className: string;
          photo: string | null;
          title: string;
          similarity?: number;
        }>;
      }>;
    }>('/admin/batch-scan', { method: 'POST', body: JSON.stringify({ projectIds }) }),

  getPendingRegistrations: () =>
    request<{ pending: Array<{
      UserId: number; UniversityId: string; Email: string;
      FirstName: string; LastName: string; Role: string; Department?: string; CreatedAt: string;
    }> }>('/admin/pending-registrations'),

  approveAccount: (userId: number) =>
    request<{ message: string }>(`/admin/accounts/${userId}/approve`, { method: 'POST' }),

  rejectAccount: (userId: number, reason?: string) =>
    request<{ message: string }>(`/admin/accounts/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getAdminStats: () => request<Record<string, unknown>>('/admin/stats'),

  getAdminAuditLogs: () => request<{
    logs: Array<{
      AuditLogId: number;
      Action: string;
      EntityType?: string | null;
      EntityId?: string | null;
      MetadataJson?: string | null;
      IpAddress?: string | null;
      CreatedAt: string;
      FirstName?: string | null;
      LastName?: string | null;
      Role?: string | null;
    }>;
  }>('/admin/audit-logs'),

  getInvitations: () =>
    request<{ invitations: Array<{ InvitationId: number; ProjectId: number; Title: string; TeacherAssignedId: string; InvitedByName?: string; InvitedByUniversityId?: string; CreatedAt?: string }> }>(
      '/student/invitations'
    ),

  getTeam: () =>
    request<{ team: Array<Record<string, unknown>> }>('/student/team'),

  getSubmissionsList: () =>
    request<{ submissions: Array<Record<string, unknown>> }>('/projects/submissions/list'),

  getStatsSummary: () =>
    request<{ pendingReview: number; collisions: number }>('/projects/stats/summary'),

  getAtlasData: () =>
    request<{
      projects: Array<Record<string, unknown>>;
      departmentStats: Array<{ dept: string; count: number }>;
      statusCounts: Array<{ Status: string; count: number }>;
    }>('/atlas/data'),

  checkTopic: (q: string) =>
    request<{ result: 'available' | 'pending' | 'taken' | null; matches: Array<Record<string, unknown>> }>(
      `/atlas/check-topic?q=${encodeURIComponent(q)}`
    ),

  search: (q: string) =>
    request<{ projects: Array<Record<string, unknown>>; people: Array<Record<string, unknown>> }>(
      `/projects/search/query?q=${encodeURIComponent(q)}`
    ),

  getStudentDashboard: () =>
    request<{
      projects: Project[];
      feedback: Array<Record<string, unknown>>;
      achievements: Array<{ id: string; title: string; desc: string; earned: boolean }>;
      stats: { totalProjects: number; active: number; approved: number; pendingReview: number };
    }>('/student/dashboard'),

  getNotifications: () =>
    request<{ notifications: Array<{ id: number; title: string; description: string; time: string; type: string; RelatedProjectId?: number | null; unread: boolean }> }>(
      '/student/notifications'
    ),

  getTeachers: () =>
    request<{ teachers: Array<Record<string, unknown>>; byCategory: Record<string, Array<Record<string, unknown>>> }>(
      '/student/teachers'
    ),

  proposeProject: (data: {
    teacherId?: number;
    teacherUniversityId?: string;
    title: string;
    abstract?: string;
    description?: string;
    attachmentName?: string;
    attachmentData?: string;
  }) =>
    request<{ project: Project; message: string; teacher?: Record<string, unknown> }>('/student/propose-project', {
      method: 'POST', body: JSON.stringify(data),
    }),

  lookupStudent: (universityId: string) =>
    request<{ student: Record<string, unknown>; projects: Array<Record<string, unknown>> }>(
      `/student/lookup/${encodeURIComponent(universityId)}`
    ),

  lookupTeacher: (universityId: string) =>
    request<{ teacher: Record<string, unknown> }>(
      `/student/lookup-teacher/${encodeURIComponent(universityId)}`
    ),

  inviteTeamMember: (data: { projectId: number; universityId: string; inviteNote?: string }) =>
    request<{ message: string }>('/student/invite-member', { method: 'POST', body: JSON.stringify(data) }),

  getTeacherAssignmentRequests: () =>
    request<{ requests: Array<Record<string, unknown>> }>('/teacher/assignment-requests'),

  respondToAssignment: (
    projectId: number,
    data: {
      action: 'accept' | 'reject' | 'request_changes';
      rejectionReason?: string;
      message?: string;
    },
  ) =>
    request<{ message: string; status: string }>(`/teacher/assignment-requests/${projectId}/respond`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  getTeacherNotifications: () =>
    request<{ notifications: Array<Record<string, unknown>> }>('/teacher/notifications'),

  getTeacherStudents: () =>
    request<{ students: TeacherStudent[] }>('/teacher/students'),

  getAdminLive: () =>
    request<{
      onlineUsers: Array<Record<string, unknown>>;
      onlineCount: number;
      recentLogins: Array<Record<string, unknown>>;
      students: Array<Record<string, unknown>>;
      recentActivity: Array<Record<string, unknown>>;
    }>('/admin/live'),

  getAdminConnections: () =>
    request<{
      teamInvites: Array<Record<string, unknown>>;
      teacherAssignments: Array<Record<string, unknown>>;
      teamMembers: Array<Record<string, unknown>>;
    }>('/admin/connections'),

  heartbeat: () => request<{ ok: boolean }>('/auth/heartbeat', { method: 'POST' }),

  getConversations: () =>
    request<{ conversations: Array<Record<string, unknown>> }>('/conversations'),

  syncProjectConversations: () =>
    request<{ ok: boolean; synced: number; created: number }>('/conversations/sync-projects', {
      method: 'POST',
    }),

  createConversation: (data: {
    type: 'teacher_student' | 'student_direct' | 'project_group';
    projectId?: number;
    participantIds?: number[];
    title?: string;
  }) =>
    request<{ conversationId: number; existing?: boolean }>('/conversations', {
      method: 'POST', body: JSON.stringify(data),
    }),

  startDirectMessage: (userId: number, title?: string) =>
    request<{ conversationId: number; existing?: boolean }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        type: 'student_direct',
        participantIds: [userId],
        title,
      }),
    }),

  getConversationMessages: (conversationId: number) =>
    request<{ messages: Array<Record<string, unknown>> }>(`/conversations/${conversationId}/messages`),

  sendConversationMessage: (
    conversationId: number,
    data: {
      content?: string;
      attachmentType?: 'image' | 'video' | 'file';
      attachmentName?: string;
      attachmentData?: string;
    }
  ) =>
    request<{ message: unknown; documentAnalysis?: DocumentAnalysis | null }>(
      `/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  searchUsers: (q: string) =>
    request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`),

  getUserProfile: (userId: number) =>
    request<{ profile: User; currentProjects: Array<Record<string, unknown>> }>(`/users/${userId}/profile`),

  getProjectEvaluations: (projectId: number) =>
    request<{ evaluations: Array<Record<string, unknown>> }>(`/projects/${projectId}/evaluations`),

  submitProjectEvaluation: (projectId: number, data: {
    studentId?: number; grade?: number; feedback: string; remarks?: string;
  }) =>
    request<{ evaluation: Record<string, unknown> }>(`/projects/${projectId}/evaluations`, {
      method: 'POST', body: JSON.stringify(data),
    }),

  getDocumentAnalyses: (projectId: number) =>
    request<{ analyses: DocumentAnalysis[] }>(`/projects/${projectId}/evaluations/document-analyses`),

  getProjectAIStatus: (projectId: number) =>
    request<{ configured: boolean; message: string; provider?: string | null; model?: string | null }>(
      `/projects/${projectId}/ai/status`,
      { timeoutMs: 30000 },
    ),

  getProjectAIBriefing: (projectId: number) =>
    request<{
      configured: boolean;
      provider?: string | null;
      model?: string | null;
      analysis: (DocumentAnalysis & {
        recommendedDecision?: string;
        decisionConfidence?: number;
        decisionReasoning?: string;
        decisionLabel?: string;
        whatProjectIsAbout?: string;
        whatShouldContain?: string[];
        featureSuggestions?: string[];
      }) | null;
    }>(`/projects/${projectId}/ai/briefing`, { timeoutMs: 30000 }),

  analyzeProjectAI: (projectId: number) =>
    request<{ analysis: Record<string, unknown>; provider?: string; model?: string }>(
      `/projects/${projectId}/ai/analyze`,
      { method: 'POST', timeoutMs: 130000 },
    ),

  getProjectAIChat: (projectId: number) =>
    request<{ messages: Array<{ id: number; role: string; content: string; createdAt: string }>; configured: boolean }>(
      `/projects/${projectId}/ai/chat`,
      { timeoutMs: 30000 },
    ),

  askProjectAI: (projectId: number, question: string) =>
    request<{ answer: string }>(`/projects/${projectId}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ question }),
      timeoutMs: 130000,
    }),

  getClassAssignmentClasses: () =>
    request<{ classes: Array<Record<string, unknown>> }>('/class-assignments/classes'),

  createClassAssignment: (data: {
    title: string;
    instructions?: string;
    className: string;
    studyMode?: string;
    deadlineHours?: number;
    deadlineAt?: string;
    opensAt?: string;
  }) =>
    request<{ assignment: Record<string, unknown>; notifiedStudents: number; message: string }>(
      '/class-assignments',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  getTeacherClassAssignments: () =>
    request<{ assignments: Array<Record<string, unknown>> }>('/class-assignments/teacher'),

  getClassAssignmentSubmissions: (assignmentId: number) =>
    request<{
      assignment: Record<string, unknown>;
      submissions: Array<Record<string, unknown>>;
      awaiting?: Array<Record<string, unknown>>;
    }>(
      `/class-assignments/${assignmentId}/submissions`,
    ),

  getClassAssignmentSubmissionFile: (submissionId: number) =>
    request<{ name: string; data: string }>(
      `/class-assignments/submissions/${submissionId}/file`,
      { timeoutMs: 60000 },
    ),

  gradeClassAssignmentSubmission: (
    submissionId: number,
    data: { score: number; bonusPoints?: number; feedback?: string },
  ) =>
    request<{
      message: string;
      grade: { score: number; bonusPoints: number; finalScore: number; feedback: string | null };
    }>(`/class-assignments/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getStudentClassAssignments: () =>
    request<{
      assignments: Array<Record<string, unknown>>;
      warning?: string;
      className?: string;
      studyMode?: string;
    }>('/class-assignments/student'),

  submitClassAssignment: (
    assignmentId: number,
    data: { content: string; attachmentName?: string; attachmentData?: string },
  ) =>
    request<{ message: string }>(`/class-assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPushVapidKey: () => request<{ publicKey: string }>('/push/vapid-public-key'),

  subscribePush: (subscription: PushSubscriptionJSON) =>
    request<{ ok: boolean }>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }),

  unsubscribePush: (endpoint?: string) =>
    request<{ ok: boolean }>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),
};
