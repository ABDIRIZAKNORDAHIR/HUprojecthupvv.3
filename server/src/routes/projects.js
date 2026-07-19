import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { analyzeSubmission } from '../services/athena.js';
import { runProjectAIAnalysis, ensureProjectsHaveAIAnalysis } from '../services/projectAIService.js';
import { normalizeUniversityId } from '../utils/universityId.js';
import { studentCanAccessProject, upsertProjectInvitation } from '../utils/projectAccess.js';
import { ensureTeacherStudentConversation, ensureProjectGroupConversation } from '../services/conversationSetup.js';

const router = Router();
router.use(authMiddleware, attachUserDetails);

/** Landing dashboard — all assigned projects with teacher ID, name, assignment time */
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.user;
    let q;
    let params = {};

    if (role === 'admin') {
      q = `
        SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status,
               p.AssignedAt, p.SubmittedAt, p.UpdatedAt,
               t.FirstName + ' ' + t.LastName AS TeacherName, t.UniversityId AS TeacherUniversityId,
               s.FirstName + ' ' + s.LastName AS OwnerName, s.UniversityId AS OwnerUniversityId
        FROM Projects p
        JOIN Users t ON p.AssignedByTeacherId = t.UserId
        LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
        ORDER BY p.AssignedAt DESC`;
    } else if (role === 'teacher') {
      q = `
        SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status,
               p.AssignedAt, p.SubmittedAt, p.UpdatedAt,
               s.FirstName + ' ' + s.LastName AS OwnerName, s.UniversityId AS OwnerUniversityId
        FROM Projects p
        LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
        WHERE p.AssignedByTeacherId = @userId
        ORDER BY p.AssignedAt DESC`;
      params = { userId };
    } else {
      q = `
        SELECT DISTINCT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status,
               p.AssignedAt, p.SubmittedAt, p.UpdatedAt,
               t.FirstName + ' ' + t.LastName AS TeacherName, t.UniversityId AS TeacherUniversityId
        FROM Projects p
        JOIN Users t ON p.AssignedByTeacherId = t.UserId
        WHERE p.OwnerStudentId = @userId
           OR EXISTS (
             SELECT 1 FROM ProjectMembers pm
             WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @userId
           )
        ORDER BY p.AssignedAt DESC`;
      params = { userId };
    }

    const result = await query(q, params);
    res.json({ projects: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Teacher assigns a new project to a student */
router.post('/', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { teacherAssignedId, title, abstract, description, ownerUniversityId } = req.body;
    if (!teacherAssignedId || !title) {
      return res.status(400).json({ error: 'TeacherAssignedId and title are required' });
    }

    let ownerStudentId = null;
    if (ownerUniversityId) {
      const student = await query(
        'SELECT UserId FROM Users WHERE UniversityId = @uid AND Role = \'student\'',
        { uid: normalizeUniversityId(ownerUniversityId) }
      );
      if (student.recordset.length) ownerStudentId = student.recordset[0].UserId;
    }

    const teacherId = req.user.role === 'admin' && req.body.teacherId
      ? req.body.teacherId
      : req.user.userId;

    const result = await query(
      `INSERT INTO Projects (TeacherAssignedId, Title, Abstract, Description, AssignedByTeacherId, OwnerStudentId)
       OUTPUT INSERTED.*
       VALUES (@teacherAssignedId, @title, @abstract, @description, @teacherId, @ownerStudentId)`,
      {
        teacherAssignedId: teacherAssignedId.trim(),
        title: title.trim(),
        abstract: abstract || null,
        description: description || null,
        teacherId,
        ownerStudentId,
      }
    );

    const project = result.recordset[0];
    if (ownerStudentId) {
      await query(
        'INSERT INTO ProjectMembers (ProjectId, StudentId, InvitedByStudentId) VALUES (@projectId, @studentId, @studentId)',
        { projectId: project.ProjectId, studentId: ownerStudentId }
      );
      await ensureTeacherStudentConversation(project.ProjectId);
      await ensureProjectGroupConversation(project.ProjectId);
    }

    res.status(201).json({ project });
  } catch (err) {
    if (err.message?.includes('UQ_Projects')) {
      return res.status(409).json({ error: 'Project ID already exists. Use a unique teacher-assigned ID.' });
    }
    res.status(500).json({ error: err.message });
  }
});

const AI_DOC_JOIN = `
      LEFT JOIN (
        SELECT ProjectId, Summary AS AiSummary, MainTopic AS AiMainTopic, QualityScore AS AiQualityScore,
               KeyPoints AS AiKeyPoints, Objectives AS AiObjectives, MissingSections AS AiMissingSections,
               Suggestions AS AiSuggestions, AiMetadata, AnalyzedAt AS AiAnalyzedAt,
               ROW_NUMBER() OVER (PARTITION BY ProjectId ORDER BY AnalyzedAt DESC) AS AiRn
        FROM DocumentAnalyses WHERE FileType = 'ai_real_analysis'
      ) da ON da.ProjectId = p.ProjectId AND da.AiRn = 1`;

/** Pending submissions for teacher AI review queue — must be before /:id */
router.get('/queue/review', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    let q = `
      SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status, p.SubmittedAt,
             s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
             sub.SubmissionId, sub.SubmittedAt AS SubmissionTime,
             ai.UniquenessScore, ai.AIConfidence, ai.SimilarProjectAssignedId, ai.SimilarityPercent,
             ai.AISuggestion, ai.SuggestedAction, ai.RejectionReasons,
             da.AiSummary, da.AiMainTopic, da.AiQualityScore, da.AiKeyPoints, da.AiObjectives,
             da.AiMissingSections, da.AiSuggestions, da.AiMetadata, da.AiAnalyzedAt
      FROM Projects p
      JOIN Submissions sub ON sub.ProjectId = p.ProjectId
      JOIN Users s ON sub.SubmittedByStudentId = s.UserId
      LEFT JOIN AIAnalyses ai ON ai.SubmissionId = sub.SubmissionId
      ${AI_DOC_JOIN}
      WHERE p.Status IN ('submitted','under_review')`;
    const params = {};

    if (req.user.role === 'teacher') {
      q += ' AND p.AssignedByTeacherId = @userId';
      params.userId = req.user.userId;
    }
    q += ' ORDER BY sub.SubmittedAt DESC';

    const result = await query(q, params);
    ensureProjectsHaveAIAnalysis(result.recordset.map(r => r.ProjectId)).catch(() => {});
    res.json({ queue: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** All submissions with AI data for teacher/admin tables */
router.get('/submissions/list', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    let q = `
      SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status, p.AssignedAt, p.SubmittedAt,
             s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
             sub.SubmissionId, sub.SubmittedAt AS SubmissionTime,
             ai.UniquenessScore, ai.AIConfidence, ai.SimilarProjectAssignedId, ai.SimilarityPercent,
             ai.AISuggestion, ai.SuggestedAction, ai.RejectionReasons,
             da.AiSummary, da.AiMainTopic, da.AiQualityScore, da.AiKeyPoints, da.AiObjectives,
             da.AiMissingSections, da.AiSuggestions, da.AiMetadata, da.AiAnalyzedAt
      FROM Projects p
      LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
      OUTER APPLY (
        SELECT TOP 1 SubmissionId, SubmittedAt FROM Submissions WHERE ProjectId = p.ProjectId ORDER BY SubmittedAt DESC
      ) sub
      LEFT JOIN AIAnalyses ai ON ai.SubmissionId = sub.SubmissionId
      ${AI_DOC_JOIN}
      WHERE 1=1`;
    const params = {};
    if (req.user.role === 'teacher') {
      q += ' AND p.AssignedByTeacherId = @userId';
      params.userId = req.user.userId;
    }
    q += ' ORDER BY p.AssignedAt DESC';
    const result = await query(q, params);
    ensureProjectsHaveAIAnalysis(result.recordset.map(r => r.ProjectId)).catch(() => {});
    res.json({ submissions: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Dashboard badge counts */
router.get('/stats/summary', authMiddleware, attachUserDetails, async (req, res) => {
  try {
    const { role, userId } = req.user;
    let pendingReview = 0;
    let collisions = 0;

    if (role === 'teacher' || role === 'admin') {
      let q = `SELECT COUNT(*) AS c FROM Projects WHERE Status IN ('submitted','under_review')`;
      const params = {};
      if (role === 'teacher') { q += ' AND AssignedByTeacherId = @userId'; params.userId = userId; }
      const r = await query(q, params);
      pendingReview = r.recordset[0]?.c || 0;

      let cq = `SELECT COUNT(DISTINCT p.ProjectId) AS c FROM Projects p
                JOIN AIAnalyses ai ON ai.ProjectId = p.ProjectId
                WHERE ai.SimilarityPercent >= 60`;
      if (role === 'teacher') { cq += ' AND p.AssignedByTeacherId = @userId'; }
      const cr = await query(cq, role === 'teacher' ? { userId } : {});
      collisions = cr.recordset[0]?.c || 0;
    }

    res.json({ pendingReview, collisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Global search — projects, students, teachers */
router.get('/search/query', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ projects: [], people: [] });

    const { role, userId } = req.user;
    const like = `%${q}%`;
    const normId = normalizeUniversityId(q);
    const idLike = normId ? `%${normId}%` : like;

    let projectSql = `
      SELECT TOP 15 p.ProjectId, p.TeacherAssignedId, p.Title, p.Status,
             s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId
      FROM Projects p
      LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
      WHERE (p.Title LIKE @like OR p.TeacherAssignedId LIKE @like OR p.Abstract LIKE @like
             OR s.FirstName LIKE @like OR s.LastName LIKE @like
             OR s.UniversityId LIKE @idLike OR (s.FirstName + ' ' + s.LastName) LIKE @like)`;

    const projectParams = { like, idLike };

    if (role === 'teacher') {
      projectSql += ' AND p.AssignedByTeacherId = @userId';
      projectParams.userId = userId;
    } else if (role === 'student') {
      projectSql += ` AND (p.OwnerStudentId = @userId OR EXISTS (
        SELECT 1 FROM ProjectMembers pm WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @userId
      ))`;
      projectParams.userId = userId;
    }

    projectSql += ' ORDER BY p.AssignedAt DESC';

    const projects = await query(projectSql, projectParams);

    const people = await query(
      `SELECT TOP 15 UserId, UniversityId, Email, FirstName, LastName, Role, Department
       FROM Users WHERE IsActive = 1 AND AccountStatus = 'approved' AND (
         FirstName LIKE @like OR LastName LIKE @like OR Email LIKE @like
         OR UniversityId LIKE @idLike OR (FirstName + ' ' + LastName) LIKE @like
         ${normId ? 'OR UniversityId = @normId' : ''}
       )
       ${role === 'student' ? "AND Role IN ('student','teacher')" : ''}
       ORDER BY Role, LastName`,
      { like, idLike, ...(normId ? { normId } : {}) }
    );

    res.json({ projects: projects.recordset, people: people.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { role, userId } = req.user;

    const result = await query(
      `SELECT p.*, t.FirstName + ' ' + t.LastName AS TeacherName, t.UniversityId AS TeacherUniversityId,
              t.UserId AS TeacherUserId, t.Email AS TeacherEmail, t.Department AS TeacherDepartment,
              t.ProfileImageUrl AS TeacherProfileImageUrl,
              s.FirstName + ' ' + s.LastName AS OwnerName, s.UniversityId AS OwnerUniversityId,
              s.UserId AS OwnerStudentUserId, s.Email AS OwnerEmail, s.ProfileImageUrl AS OwnerProfileImageUrl
       FROM Projects p
       JOIN Users t ON p.AssignedByTeacherId = t.UserId
       LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       WHERE p.ProjectId = @projectId`,
      { projectId }
    );
    if (!result.recordset.length) return res.status(404).json({ error: 'Project not found' });

    const project = result.recordset[0];
    if (role === 'teacher' && project.AssignedByTeacherId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (role === 'student') {
      const ok = await studentCanAccessProject(userId, projectId);
      if (!ok) return res.status(403).json({ error: 'Not authorized' });
    }

    const members = await query(
      `SELECT u.UserId, u.UniversityId, u.Email, u.FirstName, u.LastName, pm.JoinedAt
       FROM ProjectMembers pm JOIN Users u ON pm.StudentId = u.UserId
       WHERE pm.ProjectId = @projectId`,
      { projectId }
    );

    const latestSubmission = await query(
      `SELECT TOP 1 * FROM Submissions WHERE ProjectId = @projectId ORDER BY SubmittedAt DESC`,
      { projectId }
    );

    let aiAnalysis = null;
    if (latestSubmission.recordset.length) {
      const ai = await query(
        `SELECT TOP 1 * FROM AIAnalyses WHERE SubmissionId = @submissionId ORDER BY AnalyzedAt DESC`,
        { submissionId: latestSubmission.recordset[0].SubmissionId }
      );
      aiAnalysis = ai.recordset[0] || null;
    }

    res.json({
      project: result.recordset[0],
      members: members.recordset,
      latestSubmission: latestSubmission.recordset[0] || null,
      aiAnalysis: role === 'student' ? null : aiAnalysis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Student edits project before/during work */
router.put('/:id', requireRole('student'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, abstract, description } = req.body;

    if (!(await studentCanAccessProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Cannot edit this project' });
    }

    const editCheck = await query(
      `SELECT p.Status FROM Projects p WHERE p.ProjectId = @projectId`,
      { projectId }
    );
    if (!['assigned', 'changes_requested'].includes(editCheck.recordset[0]?.Status)) {
      return res.status(403).json({ error: 'Cannot edit this project' });
    }

    const result = await query(
      `UPDATE Projects SET Title = COALESCE(@title, Title), Abstract = COALESCE(@abstract, Abstract),
       Description = COALESCE(@description, Description), UpdatedAt = SYSUTCDATETIME()
       OUTPUT INSERTED.* WHERE ProjectId = @projectId`,
      { projectId, title: title || null, abstract: abstract || null, description: description || null }
    );
    res.json({ project: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Student submits project to teacher */
router.post('/:id/submit', requireRole('student'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { title, abstract, content } = req.body;
    if (!title || !abstract) return res.status(400).json({ error: 'Title and abstract required' });

    if (!(await studentCanAccessProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const access = await query(`SELECT p.Status FROM Projects p WHERE p.ProjectId = @projectId`, { projectId });
    if (!access.recordset.length) return res.status(403).json({ error: 'Not authorized' });
    if (!['assigned', 'changes_requested'].includes(access.recordset[0].Status)) {
      return res.status(400).json({ error: 'Project must be accepted by teacher before submitting' });
    }

    const sub = await query(
      `INSERT INTO Submissions (ProjectId, SubmittedByStudentId, Title, Abstract, Content)
       OUTPUT INSERTED.*
       VALUES (@projectId, @userId, @title, @abstract, @content)`,
      { projectId, userId: req.user.userId, title, abstract, content: content || null }
    );

    await query(
      `UPDATE Projects SET Status = 'submitted', SubmittedAt = SYSUTCDATETIME(),
       Title = @title, Abstract = @abstract, UpdatedAt = SYSUTCDATETIME()
       WHERE ProjectId = @projectId`,
      { projectId, title, abstract }
    );

    // Run Athena AI analysis automatically on submit
    const allProjects = await query(
      `SELECT ProjectId, TeacherAssignedId, Title, Abstract, Status FROM Projects WHERE ProjectId != @projectId`,
      { projectId }
    );
    const settings = await query(`SELECT SettingValue FROM Settings WHERE SettingKey = 'ai_similarity_threshold'`);
    const threshold = parseInt(settings.recordset[0]?.SettingValue || '60', 10);

    const analysis = analyzeSubmission(
      { title, abstract, projectId },
      allProjects.recordset,
      threshold
    );

    await query(
      `INSERT INTO AIAnalyses (SubmissionId, ProjectId, UniquenessScore, AIConfidence,
       SimilarProjectId, SimilarProjectAssignedId, SimilarityPercent, AISuggestion, SuggestedAction, RejectionReasons)
       VALUES (@submissionId, @projectId, @uniqueness, @confidence, @similarId, @similarAssignedId,
       @similarity, @suggestion, @action, @reasons)`,
      {
        submissionId: sub.recordset[0].SubmissionId,
        projectId,
        uniqueness: analysis.uniqueness_score,
        confidence: analysis.ai_confidence,
        similarId: analysis.similar_project_id,
        similarAssignedId: analysis.similar_project_assigned_id,
        similarity: analysis.similarity_percent,
        suggestion: analysis.ai_suggestion,
        action: analysis.suggested_action,
        reasons: JSON.stringify(analysis.rejection_reasons),
      }
    );

    await query(
      `UPDATE Projects SET Status = 'under_review' WHERE ProjectId = @projectId`,
      { projectId }
    );

    runProjectAIAnalysis(projectId).catch(err => {
      console.warn('[AI] Project submit analysis failed:', err.message);
    });

    res.json({
      submission: sub.recordset[0],
      message: 'Project submitted successfully. Your teacher will review it and share feedback with you.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Invite another student to share the project */
router.post('/:id/invite', requireRole('student'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { universityId, email } = req.body;
    if (!universityId && !email) return res.status(400).json({ error: 'Provide universityId or email' });

    if (!(await studentCanAccessProject(req.user.userId, projectId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let studentQuery = 'SELECT UserId, UniversityId, Email, FirstName, LastName FROM Users WHERE Role = \'student\' AND ';
    const params = { projectId, invitedBy: req.user.userId };
    if (universityId) {
      studentQuery += 'UniversityId = @universityId';
      params.universityId = normalizeUniversityId(universityId);
    } else {
      studentQuery += 'Email = @email';
      params.email = email.toLowerCase();
    }

    const student = await query(studentQuery, params);
    if (!student.recordset.length) return res.status(404).json({ error: 'Student not found' });

    const invited = student.recordset[0];
    await upsertProjectInvitation({
      projectId,
      invitedStudentId: invited.UserId,
      invitedBy: req.user.userId,
      note: null,
    });

    res.json({ message: `Invitation sent to ${invited.FirstName} ${invited.LastName} (${invited.UniversityId})`, invited });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Accept invitation to join shared project */
router.post('/:id/accept-invite', requireRole('student'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const inv = await query(
      `SELECT * FROM ProjectInvitations WHERE ProjectId = @projectId AND InvitedStudentId = @userId AND Status = 'pending'`,
      { projectId, userId: req.user.userId }
    );
    if (!inv.recordset.length) return res.status(404).json({ error: 'No pending invitation' });

    await query(
      `UPDATE ProjectInvitations SET Status = 'accepted' WHERE InvitationId = @id`,
      { id: inv.recordset[0].InvitationId }
    );
    await query(
      `INSERT INTO ProjectMembers (ProjectId, StudentId, InvitedByStudentId)
       SELECT @projectId, @userId, InvitedByStudentId FROM ProjectInvitations WHERE InvitationId = @id`,
      { projectId, userId: req.user.userId, id: inv.recordset[0].InvitationId }
    );

    await ensureProjectGroupConversation(projectId);

    res.json({ message: 'You joined the shared project' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Teacher review: approve / reject / request changes — teacher only decides final outcome */
router.post('/:id/review', requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { action, rejectionReason, message } = req.body;
    if (!['approved', 'rejected', 'changes_requested'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    if (action === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection description is required — explain why the project was rejected' });
    }

    const project = await query(`SELECT p.* FROM Projects p WHERE p.ProjectId = @projectId`, { projectId });
    if (!project.recordset.length) return res.status(404).json({ error: 'Project not found' });
    const p = project.recordset[0];

    if (req.user.role === 'teacher' && p.AssignedByTeacherId !== req.user.userId) {
      return res.status(403).json({ error: 'Not your project' });
    }

    const reason = action === 'rejected' ? rejectionReason.trim() : null;
    await query(
      `UPDATE Projects SET Status = @status, RejectionReason = @reason, ReviewedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE ProjectId = @projectId`,
      { projectId, status: action, reason }
    );

    if (p.OwnerStudentId) {
      let content = message || '';
      if (action === 'approved') content = content || `Your project "${p.Title}" has been approved.`;
      if (action === 'rejected') content = `Your project "${p.Title}" was rejected.\n\nReason: ${reason}${message ? `\n\n${message}` : ''}`;
      if (action === 'changes_requested') content = content || `Please revise your project "${p.Title}" based on teacher feedback.`;

      await query(
        `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content) VALUES (@projectId, @senderId, @receiverId, @content)`,
        { projectId, senderId: req.user.userId, receiverId: p.OwnerStudentId, content }
      );
      await query(
        `INSERT INTO Notifications (UserId, Title, Message, Type, RelatedProjectId)
         VALUES (@userId, @title, @message, @type, @projectId)`,
        {
          userId: p.OwnerStudentId,
          title: action === 'approved' ? 'Project Approved' : action === 'rejected' ? 'Project Rejected' : 'Changes Requested',
          message: content,
          type: `review_${action}`,
          projectId,
        }
      );
    }

    res.json({ message: `Project ${action}`, status: action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
