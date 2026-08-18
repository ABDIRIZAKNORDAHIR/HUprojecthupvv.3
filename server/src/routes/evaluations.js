import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import { notifyEvaluation } from '../services/notify.js';
import { getProjectParticipantIds, userCanAccessProject } from '../utils/projectAccess.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware, attachUserDetails);

async function canEvaluate(user, projectId) {
  if (user.role !== 'teacher') return false;
  const r = await query(
    'SELECT 1 FROM Projects WHERE ProjectId = @pid AND AssignedByTeacherId = @uid',
    { pid: projectId, uid: user.userId }
  );
  return r.recordset.length > 0;
}

router.get('/', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await userCanAccessProject(req.user, projectId, { allowAdmin: true }))) {
      return res.status(403).json({ error: 'Not authorized for this project' });
    }
    const studentFilter = req.user.role === 'student' ? 'AND e.StudentId = @uid' : '';
    const result = await query(
      `SELECT e.*, t.FirstName + ' ' + t.LastName AS TeacherName,
              s.FirstName + ' ' + s.LastName AS StudentName
       FROM ProjectEvaluations e
       JOIN Users t ON e.TeacherId = t.UserId
       JOIN Users s ON e.StudentId = s.UserId
       WHERE e.ProjectId = @pid
       ${studentFilter}
       ORDER BY e.EvaluatedAt DESC`,
      { pid: projectId, uid: req.user.userId }
    );
    res.json({ evaluations: result.recordset });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { studentId, grade, feedback, remarks } = req.body;

    if (!(await canEvaluate(req.user, projectId))) {
      return res.status(403).json({ error: 'Only the assigned teacher can evaluate this project' });
    }
    if (!feedback?.trim()) {
      return res.status(400).json({ error: 'Feedback is required' });
    }
    const numericGrade = grade == null || grade === '' ? null : Number(grade);
    if (numericGrade != null && (!Number.isFinite(numericGrade) || numericGrade < 0 || numericGrade > 100)) {
      return res.status(400).json({ error: 'Grade must be between 0 and 100' });
    }

    const proj = await query(
      'SELECT Title, OwnerStudentId FROM Projects WHERE ProjectId = @pid',
      { pid: projectId }
    );
    if (!proj.recordset.length) return res.status(404).json({ error: 'Project not found' });
    const targetStudent = Number(studentId || proj.recordset[0].OwnerStudentId);
    if (!Number.isInteger(targetStudent) || targetStudent <= 0) {
      return res.status(400).json({ error: 'No student assigned to this project' });
    }
    const studentIds = await getProjectParticipantIds(projectId, { includeTeacher: false });
    if (!studentIds.includes(targetStudent)) {
      return res.status(400).json({ error: 'Student is not a member of this project' });
    }

    const ins = await query(
      `INSERT INTO ProjectEvaluations (ProjectId, StudentId, TeacherId, Grade, Feedback, Remarks)
       OUTPUT INSERTED.*
       VALUES (@pid, @studentId, @teacherId, @grade, @feedback, @remarks)`,
      {
        pid: projectId,
        studentId: targetStudent,
        teacherId: req.user.userId,
        grade: numericGrade,
        feedback: feedback.trim(),
        remarks: remarks?.trim() || null,
      }
    );

    const teacher = await query(
      `SELECT FirstName + ' ' + LastName AS Name FROM Users WHERE UserId = @id`,
      { id: req.user.userId }
    );

    await notifyEvaluation({
      studentId: targetStudent,
      projectTitle: proj.recordset[0].Title,
      grade: numericGrade,
      teacherName: teacher.recordset[0]?.Name || 'Your teacher',
      projectId,
    });

    // Also post evaluation summary to project chat
    const gradeText = numericGrade != null ? `Grade: ${numericGrade}%` : 'Evaluation posted';
    await query(
      `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content, MessageScope)
       VALUES (@pid, @senderId, @receiverId, @content, 'teacher_student')`,
      {
        pid: projectId,
        senderId: req.user.userId,
        receiverId: targetStudent,
        content: `[Project Evaluation] ${gradeText}\n\n${feedback.trim()}`,
      }
    );

    res.status(201).json({ evaluation: ins.recordset[0] });
  } catch (err) {
    sendError(res, err);
  }
});

/** Document analyses for a project (teacher preview before opening files) */
router.get('/document-analyses', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Private teacher–student content' });
    }
    const projectId = parseInt(req.params.projectId, 10);
    if (req.user.role === 'teacher') {
      const ok = await query(
        'SELECT 1 FROM Projects WHERE ProjectId = @pid AND AssignedByTeacherId = @uid',
        { pid: projectId, uid: req.user.userId }
      );
      if (!ok.recordset.length) return res.status(403).json({ error: 'Not your project' });
    } else if (req.user.role === 'student') {
      return res.status(403).json({ error: 'Automated assessment is available to teachers only' });
    }
    const result = await query(
      `SELECT * FROM DocumentAnalyses WHERE ProjectId = @pid ORDER BY AnalyzedAt DESC`,
      { pid: projectId }
    );
    res.json({
      analyses: result.recordset.map(a => ({
        ...a,
        keyPoints: safeJson(a.KeyPoints),
        objectives: safeJson(a.Objectives),
        grammarIssues: safeJson(a.GrammarIssues),
        missingSections: safeJson(a.MissingSections),
        suggestions: safeJson(a.Suggestions),
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

function safeJson(s) {
  try { return JSON.parse(s || '[]'); } catch { return []; }
}

export default router;
