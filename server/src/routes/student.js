import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { analyzeSubmission } from '../services/athena.js';
import { normalizeUniversityId } from '../utils/universityId.js';
import { ensureTeacherStudentConversation, ensureProjectGroupConversation } from '../services/conversationSetup.js';
import { runProjectAIAnalysis } from '../services/projectAIService.js';
import { studentCanAccessProject, upsertProjectInvitation } from '../utils/projectAccess.js';

const router = Router();

async function notify(userId, title, message, type, relatedProjectId = null) {
  await query(
    `INSERT INTO Notifications (UserId, Title, Message, Type, RelatedProjectId)
     VALUES (@userId, @title, @message, @type, @relatedProjectId)`,
    { userId, title, message, type, relatedProjectId }
  );
}

/** Teachers grouped by department/specialty — for student assignment picker */
router.get('/teachers', authMiddleware, attachUserDetails, requireRole('student'), async (req, res) => {
  try {
    const result = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Department, Specialty,
              (SELECT COUNT(*) FROM Projects p WHERE p.AssignedByTeacherId = u.UserId AND p.Status NOT IN ('rejected')) AS ActiveProjects
       FROM Users u WHERE u.Role = 'teacher' AND u.IsActive = 1
       ORDER BY ISNULL(Specialty, Department), LastName`
    );
    const teachers = result.recordset;
    const byCategory = {};
    for (const t of teachers) {
      const cat = t.Specialty || t.Department || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(t);
    }
    res.json({ teachers, byCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Lookup teacher by HU ID for project assignment */
router.get('/lookup-teacher/:universityId', authMiddleware, attachUserDetails, requireRole('student'), async (req, res) => {
  try {
    const uid = normalizeUniversityId(decodeURIComponent(req.params.universityId));
    if (!uid) return res.status(400).json({ error: 'Enter a valid HU000 University ID' });

    const teacher = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Department, Specialty,
              (SELECT COUNT(*) FROM Projects p WHERE p.AssignedByTeacherId = u.UserId AND p.Status NOT IN ('rejected')) AS ActiveProjects
       FROM Users u
       WHERE u.UniversityId = @uid AND u.Role = 'teacher' AND u.IsActive = 1 AND u.AccountStatus = 'approved'`,
      { uid }
    );
    if (!teacher.recordset.length) return res.status(404).json({ error: 'Teacher not found with that HU ID' });

    res.json({ teacher: teacher.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Student proposes a project and assigns it to a teacher */
router.post('/propose-project', authMiddleware, attachUserDetails, requireRole('student'), async (req, res) => {
  try {
    const { teacherId, teacherUniversityId, title, abstract, description } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    let resolvedTeacherId = teacherId ? parseInt(teacherId, 10) : null;
    if (!resolvedTeacherId && teacherUniversityId) {
      const uid = normalizeUniversityId(teacherUniversityId);
      if (!uid) return res.status(400).json({ error: 'Enter a valid teacher HU ID' });
      const byId = await query(
        `SELECT UserId FROM Users WHERE UniversityId = @uid AND Role = 'teacher' AND IsActive = 1 AND AccountStatus = 'approved'`,
        { uid }
      );
      if (!byId.recordset.length) return res.status(404).json({ error: 'Teacher not found with that HU ID' });
      resolvedTeacherId = byId.recordset[0].UserId;
    }

    if (!resolvedTeacherId) {
      return res.status(400).json({ error: 'Select a teacher or enter their HU ID' });
    }

    const teacher = await query(
      `SELECT UserId, FirstName, LastName, Department, Specialty, UniversityId FROM Users WHERE UserId = @id AND Role = 'teacher' AND IsActive = 1`,
      { id: resolvedTeacherId }
    );
    if (!teacher.recordset.length) return res.status(404).json({ error: 'Teacher not found' });

    const t = teacher.recordset[0];
    const studentId = req.user.userId;
    const assignedId = `PRJ-${req.user.universityId}-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO Projects (TeacherAssignedId, Title, Abstract, Description, AssignedByTeacherId, OwnerStudentId, Status)
       OUTPUT INSERTED.*
       VALUES (@assignedId, @title, @abstract, @description, @teacherId, @studentId, 'pending_teacher')`,
      {
        assignedId,
        title: title.trim(),
        abstract: abstract?.trim() || null,
        description: description?.trim() || null,
        teacherId: resolvedTeacherId,
        studentId,
      }
    );

    const project = result.recordset[0];
    await query(
      `INSERT INTO ProjectMembers (ProjectId, StudentId, InvitedByStudentId, MemberNote)
       VALUES (@projectId, @studentId, @studentId, @note)`,
      { projectId: project.ProjectId, studentId, note: 'Project owner' }
    );

    const studentName = `${req.userDetails.FirstName} ${req.userDetails.LastName}`;
    await notify(
      resolvedTeacherId,
      'New Project Assignment Request',
      `${studentName} (${req.userDetails.UniversityId}) assigned project "${title}" to you. Review and approve or reject.`,
      'assignment_request',
      project.ProjectId
    );

    await ensureTeacherStudentConversation(project.ProjectId);
    await ensureProjectGroupConversation(project.ProjectId);

    runProjectAIAnalysis(project.ProjectId).catch(err => {
      console.warn('[AI] Propose-project analysis failed:', err.message);
    });

    res.status(201).json({
      project,
      teacher: t,
      message: `Project sent to ${t.FirstName} ${t.LastName} (${t.UniversityId}) for approval`,
    });
  } catch (err) {
    if (err.message?.includes('UQ_Projects')) {
      return res.status(409).json({ error: 'Please try again — duplicate project ID' });
    }
    res.status(500).json({ error: err.message });
  }
});

/** Lookup student by HU ID for team invite */
router.get('/lookup/:universityId', authMiddleware, attachUserDetails, requireRole('student'), async (req, res) => {
  try {
    const uid = normalizeUniversityId(decodeURIComponent(req.params.universityId));
    if (!uid) return res.status(400).json({ error: 'Enter a valid HU000 University ID' });

    const student = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Department FROM Users
       WHERE UniversityId = @uid AND Role = 'student' AND IsActive = 1 AND AccountStatus = 'approved'`,
      { uid }
    );
    if (!student.recordset.length) return res.status(404).json({ error: 'Student not found' });

    const projects = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Status, p.Abstract
       FROM Projects p
       WHERE p.OwnerStudentId = @userId
          OR EXISTS (
            SELECT 1 FROM ProjectMembers pm
            WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @userId
          )`,
      { userId: student.recordset[0].UserId }
    );

    res.json({ student: student.recordset[0], projects: projects.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Invite teammate with full details */
router.post('/invite-member', authMiddleware, attachUserDetails, requireRole('student'), async (req, res) => {
  try {
    const { projectId, universityId, inviteNote } = req.body;
    if (!projectId || !universityId) return res.status(400).json({ error: 'Project and student HU ID required' });

    if (!(await studentCanAccessProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const student = await query(
      `SELECT UserId, UniversityId, FirstName, LastName FROM Users WHERE UniversityId = @uid AND Role = 'student' AND IsActive = 1`,
      { uid: normalizeUniversityId(universityId) }
    );
    if (!student.recordset.length) return res.status(404).json({ error: 'Student not found with that HU ID' });

    const invited = student.recordset[0];
    if (invited.UserId === req.user.userId) return res.status(400).json({ error: 'Cannot invite yourself' });

    await upsertProjectInvitation({
      projectId,
      invitedStudentId: invited.UserId,
      invitedBy: req.user.userId,
      note: inviteNote || null,
    });

    await notify(
      invited.UserId,
      'Team Invitation',
      `${req.userDetails.FirstName} ${req.userDetails.LastName} invited you to join their project.${inviteNote ? ` Note: ${inviteNote}` : ''}`,
      'team_invite',
      projectId
    );

    res.json({
      message: `Invitation sent to ${invited.FirstName} ${invited.LastName}`,
      student: invited,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(authMiddleware, attachUserDetails, requireRole('student'));

router.get('/invitations', async (req, res) => {
  try {
    const result = await query(
      `SELECT pi.InvitationId, pi.ProjectId, pi.Status, pi.CreatedAt, pi.InviteNote,
              p.TeacherAssignedId, p.Title, p.Abstract,
              inviter.FirstName + ' ' + inviter.LastName AS InvitedByName,
              inviter.UniversityId AS InvitedByUniversityId
       FROM ProjectInvitations pi
       JOIN Projects p ON pi.ProjectId = p.ProjectId
       JOIN Users inviter ON pi.InvitedByStudentId = inviter.UserId
       WHERE pi.InvitedStudentId = @userId AND pi.Status = 'pending'`,
      { userId: req.user.userId }
    );
    res.json({ invitations: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/team', async (req, res) => {
  try {
    const result = await query(
      `WITH MyProjectIds AS (
         SELECT p.ProjectId FROM Projects p WHERE p.OwnerStudentId = @userId
         UNION
         SELECT pmAccess.ProjectId FROM ProjectMembers pmAccess WHERE pmAccess.StudentId = @userId
       )
       SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Status, p.Abstract,
              u.UserId, u.UniversityId, u.FirstName, u.LastName, u.Email, u.Department, u.ProfileImageUrl,
              pmMember.JoinedAt, pmMember.MemberNote,
              CASE WHEN p.OwnerStudentId = u.UserId THEN 1 ELSE 0 END AS IsOwner
       FROM MyProjectIds mp
       JOIN Projects p ON p.ProjectId = mp.ProjectId
       JOIN ProjectMembers pmMember ON p.ProjectId = pmMember.ProjectId
       JOIN Users u ON pmMember.StudentId = u.UserId
       ORDER BY p.Title, pmMember.JoinedAt`,
      { userId: req.user.userId }
    );

    res.json({ team: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await query(
      `SELECT DISTINCT p.ProjectId, p.TeacherAssignedId, p.Title, p.Status, p.RejectionReason,
              p.AssignedAt, p.SubmittedAt, t.FirstName + ' ' + t.LastName AS TeacherName
       FROM Projects p JOIN Users t ON p.AssignedByTeacherId = t.UserId
       WHERE p.OwnerStudentId = @userId
          OR EXISTS (
            SELECT 1 FROM ProjectMembers pm
            WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @userId
          )
       ORDER BY p.AssignedAt DESC`,
      { userId }
    );
    const feedback = await query(
      `SELECT m.MessageId, m.Content, m.SentAt, m.ProjectId, p.Title AS ProjectTitle,
              p.TeacherAssignedId, p.RejectionReason, s.FirstName + ' ' + s.LastName AS SenderName, s.Role AS SenderRole,
              NULL AS Grade, 'message' AS FeedbackType
       FROM Messages m JOIN Projects p ON m.ProjectId = p.ProjectId JOIN Users s ON m.SenderId = s.UserId
       WHERE m.ReceiverId = @userId AND s.Role IN ('teacher', 'admin')
       UNION ALL
       SELECT NULL, p.RejectionReason, p.ReviewedAt, p.ProjectId, p.Title, p.TeacherAssignedId, p.RejectionReason,
              t.FirstName + ' ' + t.LastName, 'teacher', NULL, 'rejection'
       FROM Projects p JOIN Users t ON p.AssignedByTeacherId = t.UserId
       WHERE p.OwnerStudentId = @userId AND p.Status = 'rejected' AND p.RejectionReason IS NOT NULL
       UNION ALL
       SELECT e.EvaluationId, e.Feedback, e.EvaluatedAt, e.ProjectId, p.Title, p.TeacherAssignedId, e.Remarks,
              t.FirstName + ' ' + t.LastName, 'teacher', e.Grade, 'evaluation'
       FROM ProjectEvaluations e
       JOIN Projects p ON e.ProjectId = p.ProjectId
       JOIN Users t ON e.TeacherId = t.UserId
       WHERE e.StudentId = @userId
       ORDER BY SentAt DESC`,
      { userId }
    );

    const projs = projects.recordset;
    const pendingReview = projs.filter(p => ['submitted', 'under_review'].includes(p.Status)).length;
    res.json({
      projects: projs,
      feedback: feedback.recordset,
      achievements: buildAchievements(projs),
      stats: {
        totalProjects: projs.length,
        active: projs.filter(p => !['approved', 'rejected'].includes(p.Status)).length,
        approved: projs.filter(p => p.Status === 'approved').length,
        pendingReview,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildAchievements(projs) {
  const achievements = [];
  if (projs.length) achievements.push({ id: 'first', title: 'Project Started', desc: 'Proposed a project to a teacher', earned: true });
  if (projs.some(p => p.Status === 'submitted' || p.Status === 'under_review')) {
    achievements.push({ id: 'submitted', title: 'Submitted', desc: 'Waiting for teacher review', earned: true });
  }
  if (projs.some(p => p.Status === 'approved')) achievements.push({ id: 'approved', title: 'Approved', desc: 'Teacher approved your project', earned: true });
  if (!achievements.find(a => a.id === 'approved')) achievements.push({ id: 'approved', title: 'Approved', desc: 'Get teacher approval', earned: false });
  return achievements;
}

router.get('/notifications', async (req, res) => {
  try {
    const result = await query(
      `SELECT TOP 20 NotificationId AS id, Title AS title, Message AS description,
              CreatedAt AS time, Type AS type, RelatedProjectId, IsRead
       FROM Notifications WHERE UserId = @userId ORDER BY CreatedAt DESC`,
      { userId: req.user.userId }
    );
    res.json({
      notifications: result.recordset.map(n => ({
        ...n,
        unread: !n.IsRead,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
