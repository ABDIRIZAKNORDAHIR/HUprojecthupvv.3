import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { closeExpiredClassAssignments } from '../services/classAssignmentDeadline.js';
import { validateDataUrlAttachment } from '../utils/attachments.js';

const router = Router();
router.use(authMiddleware, attachUserDetails);

function normalizeClassName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeStudyMode(value) {
  const v = String(value || '').trim().toLowerCase().replace('-', '_');
  if (v === 'full_time' || v === 'fulltime') return 'full_time';
  if (v === 'part_time' || v === 'parttime') return 'part_time';
  return null;
}

async function notify(userId, title, message, type, projectId = null) {
  await query(
    `INSERT INTO Notifications (UserId, Title, Message, Type, RelatedProjectId)
     VALUES (@userId, @title, @message, @type, @projectId)`,
    { userId, title, message, type, projectId }
  );
}

async function listStudentsInClass(className, studyMode = null) {
  let q = `
    SELECT UserId, UniversityId, Email, FirstName, LastName, ClassName, StudyMode, Department, ProfileImageUrl
    FROM Users
    WHERE Role = 'student' AND IsActive = 1 AND AccountStatus = 'approved'
      AND UPPER(TRIM(ClassName)) = @className`;
  const params = { className };
  if (studyMode) {
    q += ' AND StudyMode = @studyMode';
    params.studyMode = studyMode;
  }
  q += ' ORDER BY LastName, FirstName';
  const r = await query(q, params);
  return r.recordset;
}

/** Distinct classes that have approved students (for teacher picker) */
router.get('/classes', requireRole('teacher', 'admin'), async (_req, res) => {
  try {
    await closeExpiredClassAssignments();
    const r = await query(`
      SELECT ClassName, StudyMode, COUNT(*) AS StudentCount
      FROM Users
      WHERE Role = 'student' AND IsActive = 1 AND AccountStatus = 'approved'
        AND ClassName IS NOT NULL AND TRIM(ClassName) <> ''
      GROUP BY ClassName, StudyMode
      ORDER BY ClassName, StudyMode
    `);
    res.json({ classes: r.recordset });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher creates a class-wide assignment with deadline */
router.post('/', requireRole('teacher'), async (req, res) => {
  try {
    const { title, instructions, className, studyMode, opensAt, deadlineAt, deadlineHours } = req.body;
    const cls = normalizeClassName(className);
    if (!title?.trim() || !cls) {
      return res.status(400).json({ error: 'Title and class name are required (e.g. BIT 9)' });
    }

    const mode = studyMode ? normalizeStudyMode(studyMode) : null;
    if (studyMode && !mode) {
      return res.status(400).json({ error: 'Study mode must be full_time or part_time' });
    }

    let open = opensAt ? new Date(opensAt) : new Date();
    let deadline;
    if (deadlineAt) {
      deadline = new Date(deadlineAt);
    } else if (deadlineHours != null && Number(deadlineHours) > 0) {
      deadline = new Date(open.getTime() + Number(deadlineHours) * 60 * 60 * 1000);
    } else {
      return res.status(400).json({ error: 'Provide a deadline date/time or deadlineHours' });
    }

    if (Number.isNaN(open.getTime()) || Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ error: 'Invalid opensAt or deadlineAt' });
    }
    if (deadline <= open) {
      return res.status(400).json({ error: 'Deadline must be after the open time' });
    }

    const students = await listStudentsInClass(cls, mode);
    if (!students.length) {
      return res.status(404).json({
        error: mode
          ? `No approved ${mode.replace('_', '-')} students found in class ${cls}`
          : `No approved students found in class ${cls}`,
      });
    }

    const created = await query(
      `INSERT INTO ClassAssignments (TeacherId, ClassName, StudyMode, Title, Instructions, OpensAt, DeadlineAt)
       OUTPUT INSERTED.*
       VALUES (@teacherId, @className, @studyMode, @title, @instructions, @opensAt, @deadlineAt)`,
      {
        teacherId: req.user.userId,
        className: cls,
        studyMode: mode,
        title: title.trim(),
        instructions: instructions?.trim() || null,
        opensAt: open,
        deadlineAt: deadline,
      }
    );
    const assignment = created.recordset[0];
    const deadlineLabel = deadline.toLocaleString();

    for (const s of students) {
      await notify(
        s.UserId,
        'New Class Assignment',
        `Your teacher sent "${title.trim()}" to class ${cls}. Deadline: ${deadlineLabel}. Submit before time runs out.`,
        'class_assignment',
        null
      );
    }

    res.status(201).json({
      assignment,
      notifiedStudents: students.length,
      students: students.map((s) => ({
        UserId: s.UserId,
        UniversityId: s.UniversityId,
        Name: `${s.FirstName} ${s.LastName}`,
        Email: s.Email,
        StudyMode: s.StudyMode,
      })),
      message: `Assignment sent to ${students.length} student(s) in ${cls}`,
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher: list assignments they created */
router.get('/teacher', requireRole('teacher'), async (req, res) => {
  try {
    await closeExpiredClassAssignments();
    const r = await query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM ClassAssignmentSubmissions s WHERE s.AssignmentId = a.AssignmentId) AS SubmissionCount,
              (SELECT COUNT(*) FROM ClassAssignmentSubmissions s
               WHERE s.AssignmentId = a.AssignmentId AND s.Score IS NOT NULL) AS GradedCount,
              (SELECT COUNT(*) FROM Users u
               WHERE u.Role = 'student' AND u.IsActive = 1 AND u.AccountStatus = 'approved'
                 AND UPPER(TRIM(u.ClassName)) = a.ClassName
                 AND (a.StudyMode IS NULL OR u.StudyMode = a.StudyMode)) AS TargetCount
       FROM ClassAssignments a
       WHERE a.TeacherId = @tid
       ORDER BY a.CreatedAt DESC`,
      { tid: req.user.userId }
    );
    const assignments = r.recordset;
    const ids = assignments.map((row) => Number(row.AssignmentId)).filter((id) => Number.isFinite(id) && id > 0);
    const recentByAssignment = new Map();
    if (ids.length) {
      const params = Object.fromEntries(ids.map((id, index) => [`id${index}`, id]));
      const placeholders = ids.map((_, index) => `@id${index}`).join(', ');
      const recent = await query(
        `SELECT s.AssignmentId, s.StudentId, u.FirstName, u.LastName, u.ProfileImageUrl, s.SubmittedAt
         FROM ClassAssignmentSubmissions s
         JOIN Users u ON u.UserId = s.StudentId
         WHERE s.AssignmentId IN (${placeholders})
         ORDER BY s.SubmittedAt DESC`,
        params
      );
      for (const row of recent.recordset) {
        const assignmentId = Number(row.AssignmentId);
        const list = recentByAssignment.get(assignmentId) || [];
        if (list.length >= 5) continue;
        list.push({
          StudentId: row.StudentId,
          FirstName: row.FirstName,
          LastName: row.LastName,
          ProfileImageUrl: row.ProfileImageUrl || null,
        });
        recentByAssignment.set(assignmentId, list);
      }
    }
    res.json({
      assignments: assignments.map((row) => ({
        ...row,
        RecentSubmitters: recentByAssignment.get(Number(row.AssignmentId)) || [],
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher: submissions for one assignment (files loaded separately so the list stays fast). */
router.get('/:assignmentId/submissions', requireRole('teacher'), async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const a = await query(
      `SELECT * FROM ClassAssignments WHERE AssignmentId = @id AND TeacherId = @tid`,
      { id: assignmentId, tid: req.user.userId }
    );
    if (!a.recordset.length) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = a.recordset[0];

    const subs = await query(
      `SELECT s.SubmissionId, s.AssignmentId, s.StudentId, s.Content, s.AttachmentName,
              CASE WHEN s.AttachmentName IS NOT NULL AND LTRIM(RTRIM(s.AttachmentName)) <> '' THEN 1 ELSE 0 END AS HasAttachment,
              s.Score, s.BonusPoints, s.TeacherFeedback, s.GradedAt, s.SubmittedAt,
              u.FirstName, u.LastName, u.UniversityId, u.Email, u.ClassName, u.StudyMode, u.ProfileImageUrl
       FROM ClassAssignmentSubmissions s
       JOIN Users u ON u.UserId = s.StudentId
       WHERE s.AssignmentId = @id
       ORDER BY s.SubmittedAt DESC`,
      { id: assignmentId }
    );

    const roster = await listStudentsInClass(
      normalizeClassName(assignment.ClassName),
      assignment.StudyMode || null,
    );
    const submitted = new Set(subs.recordset.map((row) => Number(row.StudentId)));
    const awaiting = roster
      .filter((student) => !submitted.has(Number(student.UserId)))
      .map((student) => ({
        StudentId: student.UserId,
        FirstName: student.FirstName,
        LastName: student.LastName,
        UniversityId: student.UniversityId,
        Email: student.Email,
        ClassName: student.ClassName,
        StudyMode: student.StudyMode,
        ProfileImageUrl: student.ProfileImageUrl || null,
      }));

    res.json({ assignment, submissions: subs.recordset, awaiting });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher: fetch one student's attached file for review (opens in a new tab). */
router.get('/submissions/:submissionId/file', requireRole('teacher'), async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    const file = await query(
      `SELECT s.AttachmentName, s.AttachmentData
       FROM ClassAssignmentSubmissions s
       JOIN ClassAssignments a ON a.AssignmentId = s.AssignmentId
       WHERE s.SubmissionId = @submissionId AND a.TeacherId = @teacherId`,
      { submissionId, teacherId: req.user.userId }
    );
    const row = file.recordset[0];
    if (!row?.AttachmentData) return res.status(404).json({ error: 'No file attached to this submission' });
    res.json({ name: row.AttachmentName || 'Student assignment.pdf', data: row.AttachmentData });
  } catch (err) {
    sendError(res, err);
  }
});

/** Teacher: record or update a mark after reviewing one student's work. */
router.patch('/submissions/:submissionId/grade', requireRole('teacher'), async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    const score = Number(req.body.score);
    const bonusPoints = req.body.bonusPoints == null || req.body.bonusPoints === ''
      ? 0
      : Number(req.body.bonusPoints);
    const feedback = String(req.body.feedback || '').trim();

    if (!Number.isInteger(submissionId) || submissionId < 1) {
      return res.status(400).json({ error: 'Invalid submission' });
    }
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: 'Mark must be between 0 and 100' });
    }
    if (!Number.isFinite(bonusPoints) || bonusPoints < 0 || bonusPoints > 20) {
      return res.status(400).json({ error: 'Bonus must be between 0 and 20 points' });
    }
    if (feedback.length > 4000) {
      return res.status(400).json({ error: 'Feedback must be 4,000 characters or fewer' });
    }

    const owned = await query(
      `SELECT s.SubmissionId, s.StudentId, a.Title
       FROM ClassAssignmentSubmissions s
       JOIN ClassAssignments a ON a.AssignmentId = s.AssignmentId
       WHERE s.SubmissionId = @submissionId AND a.TeacherId = @teacherId`,
      { submissionId, teacherId: req.user.userId }
    );
    if (!owned.recordset.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    await query(
      `UPDATE ClassAssignmentSubmissions
       SET Score = @score,
           BonusPoints = @bonusPoints,
           TeacherFeedback = @feedback,
           GradedAt = CURRENT_TIMESTAMP,
           GradedBy = @teacherId
       WHERE SubmissionId = @submissionId`,
      {
        score,
        bonusPoints,
        feedback: feedback || null,
        teacherId: req.user.userId,
        submissionId,
      }
    );

    const submission = owned.recordset[0];
    const finalScore = Math.min(100, score + bonusPoints);
    await notify(
      submission.StudentId,
      'Assignment marked',
      `Your mark for "${submission.Title}" is ${finalScore}/100${bonusPoints ? ` (including ${bonusPoints} bonus points)` : ''}.`,
      'class_assignment_graded',
      null
    );

    res.json({
      message: 'Mark saved and sent to the student',
      grade: { score, bonusPoints, finalScore, feedback: feedback || null },
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Student: my class assignments */
router.get('/student', requireRole('student'), async (req, res) => {
  try {
    await closeExpiredClassAssignments();
    const me = await query(
      `SELECT ClassName, StudyMode FROM Users WHERE UserId = @id`,
      { id: req.user.userId }
    );
    const profile = me.recordset[0];
    if (!profile?.ClassName) {
      return res.json({
        assignments: [],
        warning: 'Set your class (e.g. BIT 9) and study mode in Settings to receive class assignments.',
      });
    }

    const cls = normalizeClassName(profile.ClassName);
    const r = await query(
      `SELECT a.*,
              t.FirstName + ' ' + t.LastName AS TeacherName,
              CASE WHEN s.SubmissionId IS NULL THEN 0 ELSE 1 END AS HasSubmitted,
              s.SubmittedAt, s.Content AS MyContent, s.AttachmentName AS MyAttachmentName,
              s.Score, s.BonusPoints, s.TeacherFeedback, s.GradedAt,
              CASE
                WHEN a.IsClosed = 1 OR a.DeadlineAt <= SYSUTCDATETIME() THEN 1
                ELSE 0
              END AS IsExpired
       FROM ClassAssignments a
       JOIN Users t ON t.UserId = a.TeacherId
       LEFT JOIN ClassAssignmentSubmissions s
         ON s.AssignmentId = a.AssignmentId AND s.StudentId = @sid
       WHERE UPPER(TRIM(a.ClassName)) = @className
         AND (a.StudyMode IS NULL OR a.StudyMode = @studyMode)
         AND a.OpensAt <= SYSUTCDATETIME()
       ORDER BY a.DeadlineAt ASC`,
      {
        sid: req.user.userId,
        className: cls,
        studyMode: profile.StudyMode || null,
      }
    );
    res.json({ assignments: r.recordset, className: cls, studyMode: profile.StudyMode });
  } catch (err) {
    sendError(res, err);
  }
});

/** Student submits work — blocked after deadline */
router.post('/:assignmentId/submit', requireRole('student'), async (req, res) => {
  try {
    await closeExpiredClassAssignments();
    const assignmentId = parseInt(req.params.assignmentId, 10);
    const { content, attachmentName, attachmentData } = req.body;
    if (!content?.trim() && !attachmentData) {
      return res.status(400).json({ error: 'Write an answer or attach a supported file' });
    }
    const attachment = validateDataUrlAttachment({
      data: attachmentData,
      name: attachmentName,
    });

    const a = await query(`SELECT * FROM ClassAssignments WHERE AssignmentId = @id`, { id: assignmentId });
    if (!a.recordset.length) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = a.recordset[0];

    const me = await query(
      `SELECT ClassName, StudyMode, Email, FirstName, LastName FROM Users WHERE UserId = @id`,
      { id: req.user.userId }
    );
    const student = me.recordset[0];
    const myClass = normalizeClassName(student?.ClassName);
    if (!myClass || myClass !== normalizeClassName(assignment.ClassName)) {
      return res.status(403).json({ error: 'This assignment is not for your class' });
    }
    if (assignment.StudyMode && assignment.StudyMode !== student.StudyMode) {
      return res.status(403).json({ error: 'This assignment is not for your study mode' });
    }

    const now = new Date();
    const deadline = new Date(assignment.DeadlineAt);
    if (assignment.IsClosed || now > deadline) {
      await notify(
        req.user.userId,
        'Assignment Deadline Passed',
        `Time is over for "${assignment.Title}". You can no longer submit.`,
        'class_assignment_closed',
        null
      );
      return res.status(403).json({
        error: 'Time is over. The deadline has passed and you cannot submit this assignment.',
        code: 'DEADLINE_PASSED',
      });
    }

    const existing = await query(
      `SELECT SubmissionId, AttachmentName, AttachmentData
       FROM ClassAssignmentSubmissions WHERE AssignmentId = @aid AND StudentId = @sid`,
      { aid: assignmentId, sid: req.user.userId }
    );

    if (existing.recordset.length) {
      await query(
        `UPDATE ClassAssignmentSubmissions
         SET Content = @content, AttachmentName = @attachmentName, AttachmentData = @attachmentData, SubmittedAt = SYSUTCDATETIME()
         WHERE AssignmentId = @aid AND StudentId = @sid`,
        {
          content: String(content || '').trim(),
          attachmentName: attachment?.name || existing.recordset[0].AttachmentName || null,
          attachmentData: attachment?.data || existing.recordset[0].AttachmentData || null,
          aid: assignmentId,
          sid: req.user.userId,
        }
      );
    } else {
      await query(
        `INSERT INTO ClassAssignmentSubmissions (AssignmentId, StudentId, Content, AttachmentName, AttachmentData)
         VALUES (@aid, @sid, @content, @attachmentName, @attachmentData)`,
        {
          aid: assignmentId,
          sid: req.user.userId,
          content: String(content || '').trim(),
          attachmentName: attachment?.name || null,
          attachmentData: attachment?.data || null,
        }
      );
    }

    await notify(
      assignment.TeacherId,
      'Class Assignment Submitted',
      `${student.FirstName} ${student.LastName} submitted work for "${assignment.Title}".`,
      'class_assignment_submit',
      null
    );

    res.json({ message: 'Assignment submitted successfully' });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status ? err.message : 'Could not submit this assignment',
    });
  }
});

export default router;
