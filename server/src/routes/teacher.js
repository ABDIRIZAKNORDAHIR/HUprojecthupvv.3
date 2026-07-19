import { Router } from 'express';
import { query } from '../db.js';
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

/** Pending assignment requests from students */
router.get('/assignment-requests', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Description, p.Status, p.AssignedAt,
              s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
              s.Department AS StudentDepartment, s.Email AS StudentEmail
       FROM Projects p
       JOIN Users s ON p.OwnerStudentId = s.UserId
       WHERE p.AssignedByTeacherId = @userId AND p.Status = 'pending_teacher'
       ORDER BY p.AssignedAt DESC`,
      { userId: req.user.userId }
    );
    res.json({ requests: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Teacher accepts or rejects student project assignment */
router.post('/assignment-requests/:projectId/respond', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { action, rejectionReason } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }
    if (action === 'reject' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Rejection description is required' });
    }

    const project = await query(
      `SELECT p.*, s.UserId AS StudentUserId, s.FirstName, s.LastName
       FROM Projects p JOIN Users s ON p.OwnerStudentId = s.UserId
       WHERE p.ProjectId = @projectId AND p.AssignedByTeacherId = @teacherId AND p.Status = 'pending_teacher'`,
      { projectId, teacherId: req.user.userId }
    );
    if (!project.recordset.length) return res.status(404).json({ error: 'Assignment request not found' });
    const p = project.recordset[0];

    if (action === 'accept') {
      await query(
        `UPDATE Projects SET Status = 'assigned', UpdatedAt = SYSUTCDATETIME() WHERE ProjectId = @projectId`,
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
          content: `Your project "${p.Title}" has been accepted. You may begin working on it.`,
        }
      );
      await ensureTeacherStudentConversation(projectId);
      await ensureProjectGroupConversation(projectId);
      // Make sure Real AI briefing exists for this project
      ensureProjectsHaveAIAnalysis([projectId]).catch(() => {});
      res.json({ message: 'Project assignment accepted', status: 'assigned' });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
