import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { ensureTeacherStudentConversation, ensureProjectGroupConversation } from '../services/conversationSetup.js';
import { ensureProjectsHaveAIAnalysis } from '../services/projectAIService.js';

const router = Router();
router.use(authMiddleware, attachUserDetails, requireRole('teacher'));

async function notify(userId, title, message, type, projectId = null) {
  await query(
    `INSERT INTO Notifications (UserId, Title, Message, Type, RelatedProjectId)
     VALUES (@userId, @title, @message, @type, @projectId)`,
    { userId, title, message, type, projectId }
  );
}

function parseAiMeta(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/** Pending assignment requests from students — includes review briefing when ready. */
router.get('/assignment-requests', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Description, p.Status, p.AssignedAt,
              s.UserId AS StudentId, s.FirstName AS StudentFirstName, s.LastName AS StudentLastName,
              s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
              s.Department AS StudentDepartment, s.Email AS StudentEmail,
              s.ProfileImageUrl AS StudentProfileImageUrl,
              proposalFile.AttachmentName, proposalFile.AttachmentData,
              briefing.Summary AS ReviewSummary, briefing.QualityScore AS ReviewQualityScore,
              briefing.AiMetadata AS ReviewAiMetadata
       FROM Projects p
       JOIN Users s ON p.OwnerStudentId = s.UserId
       OUTER APPLY (
         SELECT TOP 1 m.AttachmentName, m.AttachmentData
         FROM Messages m
         WHERE m.ProjectId = p.ProjectId AND m.AttachmentData IS NOT NULL
         ORDER BY m.SentAt ASC
       ) proposalFile
       OUTER APPLY (
         SELECT TOP 1 da.Summary, da.QualityScore, da.AiMetadata
         FROM DocumentAnalyses da
         WHERE da.ProjectId = p.ProjectId AND da.FileType = 'ai_real_analysis'
         ORDER BY da.AnalyzedAt DESC
       ) briefing
       WHERE p.AssignedByTeacherId = @userId AND p.Status = 'pending_teacher'
       ORDER BY p.AssignedAt DESC`,
      { userId: req.user.userId }
    );

    const requests = result.recordset.map((row) => {
      const meta = parseAiMeta(row.ReviewAiMetadata) || {};
      const { ReviewAiMetadata, ...rest } = row;
      return {
        ...rest,
        review: row.ReviewSummary || meta.whatProjectIsAbout
          ? {
              summary: row.ReviewSummary || null,
              qualityScore: row.ReviewQualityScore != null ? Number(row.ReviewQualityScore) : null,
              recommendedDecision: meta.recommendedDecision || null,
              decisionConfidence: meta.decisionConfidence != null ? Number(meta.decisionConfidence) : null,
              decisionReasoning: meta.decisionReasoning || null,
              decisionLabel: meta.decisionLabel || null,
              whatProjectIsAbout: meta.whatProjectIsAbout || null,
              whatShouldContain: Array.isArray(meta.whatShouldContain) ? meta.whatShouldContain : [],
              featureSuggestions: Array.isArray(meta.featureSuggestions) ? meta.featureSuggestions : [],
            }
          : null,
      };
    });

    ensureProjectsHaveAIAnalysis(requests.map((r) => Number(r.ProjectId))).catch(() => {});
    res.json({ requests });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher accepts, requests changes, or rejects a student project assignment — one decision. */
router.post('/assignment-requests/:projectId/respond', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { action, rejectionReason, message } = req.body;

    if (!['accept', 'reject', 'request_changes'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept, reject, or request_changes' });
    }
    if (action === 'reject' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection description is required' });
    }
    if (action === 'request_changes' && !message?.trim() && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Tell the student what must be changed' });
    }

    const project = await query(
      `SELECT p.*, s.UserId AS StudentUserId, s.FirstName, s.LastName
       FROM Projects p JOIN Users s ON p.OwnerStudentId = s.UserId
       WHERE p.ProjectId = @projectId AND p.AssignedByTeacherId = @teacherId AND p.Status = 'pending_teacher'`,
      { projectId, teacherId: req.user.userId }
    );
    if (!project.recordset.length) {
      return res.status(404).json({
        error: 'Assignment request not found',
        hint: 'This request may already have been decided. Refresh the page.',
      });
    }
    const p = project.recordset[0];

    if (action === 'accept') {
      await query(
        `UPDATE Projects SET Status = 'assigned', RejectionReason = NULL, UpdatedAt = SYSUTCDATETIME() WHERE ProjectId = @projectId`,
        { projectId }
      );
      await notify(
        p.OwnerStudentId,
        'Project Accepted',
        `Your teacher accepted your project "${p.Title}". You can now work on it and submit when ready.`,
        'assignment_accepted',
        projectId
      );
      await query(
        `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content, MessageScope)
         VALUES (@projectId, @senderId, @receiverId, @content, 'teacher_student')`,
        {
          projectId,
          senderId: req.user.userId,
          receiverId: p.OwnerStudentId,
          content: message?.trim()
            ? `Your project "${p.Title}" has been accepted.\n\nTeacher comment: ${message.trim()}`
            : `Your project "${p.Title}" has been accepted. You may begin working on it.`,
        }
      );
      await ensureTeacherStudentConversation(projectId);
      await ensureProjectGroupConversation(projectId);
      ensureProjectsHaveAIAnalysis([projectId]).catch(() => {});
      res.json({ message: 'Project assignment accepted', status: 'assigned' });
    } else if (action === 'request_changes') {
      const reason = (message || rejectionReason || '').trim();
      await query(
        `UPDATE Projects SET Status = 'changes_requested', RejectionReason = @reason,
         ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
         WHERE ProjectId = @projectId`,
        { projectId, reason }
      );
      const msg = `Your teacher asked for changes on "${p.Title}" before accepting it.\n\nWhat to fix:\n${reason}`;
      await notify(p.OwnerStudentId, 'Changes Requested', msg, 'assignment_changes', projectId);
      await query(
        `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content, MessageScope)
         VALUES (@projectId, @senderId, @receiverId, @content, 'teacher_student')`,
        { projectId, senderId: req.user.userId, receiverId: p.OwnerStudentId, content: msg }
      );
      res.json({ message: 'Changes requested from student', status: 'changes_requested' });
    } else {
      await query(
        `UPDATE Projects SET Status = 'rejected', RejectionReason = @reason, ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
         WHERE ProjectId = @projectId`,
        { projectId, reason: rejectionReason.trim() }
      );
      const msg = `Your project "${p.Title}" was rejected.\n\nReason: ${rejectionReason.trim()}`;
      await notify(p.OwnerStudentId, 'Project Rejected', msg, 'assignment_rejected', projectId);
      await query(
        `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content) VALUES (@projectId, @senderId, @receiverId, @content)`,
        { projectId, senderId: req.user.userId, receiverId: p.OwnerStudentId, content: msg }
      );
      res.json({ message: 'Project assignment rejected', status: 'rejected' });
    }
  } catch (err) {
    sendError(res, err);
  }
});

/** Students assigned to this teacher (projects + class work) — profile, photo, and academic barometers. */
router.get('/students', async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const people = await query(
      `SELECT DISTINCT s.UserId, s.UniversityId, s.Email, s.FirstName, s.LastName, s.Department,
              s.Phone, s.Bio, s.ContactInfo, s.ProfileImageUrl, s.ClassName, s.StudyMode, s.Specialty
       FROM Users s
       WHERE s.Role = 'student' AND s.IsActive = 1 AND s.AccountStatus = 'approved'
         AND (
           EXISTS (
             SELECT 1 FROM Projects p
             WHERE p.AssignedByTeacherId = @teacherId
               AND (
                 p.OwnerStudentId = s.UserId
                 OR EXISTS (
                   SELECT 1 FROM ProjectMembers pm
                   WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = s.UserId
                 )
               )
           )
           OR EXISTS (
             SELECT 1 FROM ClassAssignments ca
             WHERE ca.TeacherId = @teacherId
               AND s.ClassName IS NOT NULL AND TRIM(s.ClassName) <> ''
               AND UPPER(TRIM(s.ClassName)) = ca.ClassName
               AND (ca.StudyMode IS NULL OR s.StudyMode = ca.StudyMode)
           )
           OR EXISTS (
             SELECT 1 FROM ClassAssignmentSubmissions cas
             JOIN ClassAssignments ca ON ca.AssignmentId = cas.AssignmentId
             WHERE ca.TeacherId = @teacherId AND cas.StudentId = s.UserId
           )
         )
       ORDER BY s.LastName, s.FirstName`,
      { teacherId }
    );

    const projects = await query(
      `SELECT p.ProjectId, p.Title, p.Status, p.AssignedAt, p.SubmittedAt, p.UpdatedAt,
              s.UserId AS StudentId,
              ai.UniquenessScore, ai.SimilarityPercent, ai.AIConfidence,
              da.QualityScore,
              ev.Grade, ev.Feedback, ev.EvaluatedAt
       FROM Projects p
       JOIN Users s ON (
         s.UserId = p.OwnerStudentId
         OR EXISTS (
           SELECT 1 FROM ProjectMembers pm
           WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = s.UserId
         )
       )
       OUTER APPLY (
         SELECT TOP 1 SubmissionId FROM Submissions WHERE ProjectId = p.ProjectId ORDER BY SubmittedAt DESC
       ) sub
       LEFT JOIN AIAnalyses ai ON ai.SubmissionId = sub.SubmissionId
       OUTER APPLY (
         SELECT TOP 1 QualityScore FROM DocumentAnalyses
         WHERE ProjectId = p.ProjectId AND FileType = 'ai_real_analysis'
         ORDER BY AnalyzedAt DESC
       ) da
       OUTER APPLY (
         SELECT TOP 1 Grade, Feedback, EvaluatedAt FROM ProjectEvaluations
         WHERE ProjectId = p.ProjectId AND StudentId = s.UserId
         ORDER BY EvaluatedAt DESC
       ) ev
       WHERE p.AssignedByTeacherId = @teacherId AND s.Role = 'student'`,
      { teacherId }
    );

    const assignments = await query(
      `SELECT cas.StudentId,
              AVG(cas.Score) AS AvgAssignmentScore,
              AVG(cas.BonusPoints) AS AvgBonus,
              COUNT(*) AS GradedAssignments
       FROM ClassAssignmentSubmissions cas
       JOIN ClassAssignments ca ON ca.AssignmentId = cas.AssignmentId
       WHERE ca.TeacherId = @teacherId AND cas.Score IS NOT NULL
       GROUP BY cas.StudentId`,
      { teacherId }
    );

    const classPeople = await query(
      `SELECT DISTINCT u.UserId
       FROM Users u
       WHERE u.Role = 'student' AND u.IsActive = 1
         AND (
           EXISTS (
             SELECT 1 FROM ClassAssignments ca
             WHERE ca.TeacherId = @teacherId
               AND u.ClassName IS NOT NULL AND TRIM(u.ClassName) <> ''
               AND UPPER(TRIM(u.ClassName)) = ca.ClassName
               AND (ca.StudyMode IS NULL OR u.StudyMode = ca.StudyMode)
           )
           OR EXISTS (
             SELECT 1 FROM ClassAssignmentSubmissions cas
             JOIN ClassAssignments ca ON ca.AssignmentId = cas.AssignmentId
             WHERE ca.TeacherId = @teacherId AND cas.StudentId = u.UserId
           )
         )`,
      { teacherId }
    );

    const assignByStudent = new Map(
      assignments.recordset.map((row) => [Number(row.StudentId), row])
    );
    const classIds = new Set(classPeople.recordset.map((row) => Number(row.UserId)));
    const projectsByStudent = new Map();
    const seenProject = new Set();
    for (const row of projects.recordset) {
      const id = Number(row.StudentId);
      const pid = Number(row.ProjectId);
      const key = `${id}:${pid}`;
      if (seenProject.has(key)) continue;
      seenProject.add(key);
      if (!projectsByStudent.has(id)) projectsByStudent.set(id, []);
      projectsByStudent.get(id).push(row);
    }

    const students = people.recordset.map((person) => {
      const work = projectsByStudent.get(Number(person.UserId)) || [];
      const uniqueness = work.map((p) => Number(p.UniquenessScore)).filter((n) => Number.isFinite(n) && n > 0);
      const similarity = work.map((p) => Number(p.SimilarityPercent)).filter((n) => Number.isFinite(n) && n > 0);
      const quality = work.map((p) => Number(p.QualityScore)).filter((n) => Number.isFinite(n) && n > 0);
      const grades = work.map((p) => Number(p.Grade)).filter((n) => Number.isFinite(n));
      const assign = assignByStudent.get(Number(person.UserId));
      const avg = (vals) => (vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null);

      return {
        ...person,
        projectCount: work.length,
        viaProjects: work.length > 0,
        viaClass: classIds.has(Number(person.UserId)),
        barometers: {
          uniqueness: avg(uniqueness),
          similarity: avg(similarity),
          quality: avg(quality),
          projectMark: avg(grades),
          assignmentMark: assign?.AvgAssignmentScore != null ? Math.round(Number(assign.AvgAssignmentScore)) : null,
          assignmentBonus: assign?.AvgBonus != null ? Math.round(Number(assign.AvgBonus)) : null,
          gradedAssignments: assign ? Number(assign.GradedAssignments) : 0,
        },
        projects: work.map((p) => ({
          ProjectId: p.ProjectId,
          Title: p.Title,
          Status: p.Status,
          AssignedAt: p.AssignedAt,
          SubmittedAt: p.SubmittedAt,
          UniquenessScore: p.UniquenessScore != null ? Number(p.UniquenessScore) : null,
          SimilarityPercent: p.SimilarityPercent != null ? Number(p.SimilarityPercent) : null,
          QualityScore: p.QualityScore != null ? Number(p.QualityScore) : null,
          Grade: p.Grade != null ? Number(p.Grade) : null,
          Feedback: p.Feedback || null,
        })),
      };
    });

    res.json({ students });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const result = await query(
      `SELECT TOP 20 NotificationId AS id, Title AS title, Message AS description,
              CreatedAt AS time, Type AS type, RelatedProjectId, IsRead
       FROM Notifications WHERE UserId = @userId ORDER BY CreatedAt DESC`,
      { userId: req.user.userId }
    );
    res.json({ notifications: result.recordset.map(n => ({ ...n, unread: !n.IsRead })) });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
