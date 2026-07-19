import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails, requireRole } from '../middleware/auth.js';
import { permanentlyDeleteUser } from '../services/deleteUser.js';
import { validateUniversityId, normalizeUniversityId } from '../utils/universityId.js';
import { batchAnalyzeSubmissions } from '../services/athena.js';

const router = Router();
router.use(authMiddleware, attachUserDetails, requireRole('admin'));

router.get('/users', async (req, res) => {
  try {
    const { role, q } = req.query;
    let sql = `SELECT UserId, UniversityId, Email, FirstName, LastName, Role, Department, Specialty,
             PlainPassword, IsActive, AccountStatus, CreatedAt, LastLoginAt, LastSeenAt,
             CASE WHEN LastSeenAt >= DATEADD(MINUTE, -5, SYSUTCDATETIME()) THEN 1 ELSE 0 END AS IsOnline
             FROM Users`;
    const params = {};
    const where = [];

    if (role === 'pending') {
      where.push(`AccountStatus = 'pending'`);
    } else if (role) {
      where.push(`Role = @role AND AccountStatus = 'approved'`);
      params.role = role;
    }

    if (q && String(q).trim()) {
      const term = String(q).trim();
      const normId = normalizeUniversityId(term);
      where.push(`(
        FirstName LIKE @like OR LastName LIKE @like OR Email LIKE @like
        OR UniversityId LIKE @like OR (FirstName + ' ' + LastName) LIKE @like
        ${normId ? 'OR UniversityId = @normId' : ''}
      )`);
      params.like = `%${term}%`;
      if (normId) params.normId = normId;
    }

    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ' ORDER BY Role, LastName';

    const result = await query(sql, params);
    res.json({ users: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [users, projects, submissions, pendingReview, pendingAssignments, pendingAccounts] = await Promise.all([
      query(`SELECT Role, COUNT(*) AS Count FROM Users WHERE IsActive = 1 AND AccountStatus = 'approved' GROUP BY Role`),
      query(`SELECT Status, COUNT(*) AS Count FROM Projects GROUP BY Status`),
      query(`SELECT COUNT(*) AS Total FROM Submissions`),
      query(`SELECT COUNT(*) AS Total FROM Projects WHERE Status IN ('submitted','under_review')`),
      query(`SELECT COUNT(*) AS Total FROM Projects WHERE Status = 'pending_teacher'`),
      query(`SELECT COUNT(*) AS Total FROM Users WHERE AccountStatus = 'pending'`),
    ]);
    res.json({
      usersByRole: users.recordset,
      projectsByStatus: projects.recordset,
      totalSubmissions: submissions.recordset[0]?.Total || 0,
      pendingReview: pendingReview.recordset[0]?.Total || 0,
      pendingAssignments: pendingAssignments.recordset[0]?.Total || 0,
      pendingAccounts: pendingAccounts.recordset[0]?.Total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Live admin dashboard data */
router.get('/live', async (req, res) => {
  try {
    const [online, recentLogins, students, recentActivity] = await Promise.all([
      query(
        `SELECT UserId, UniversityId, FirstName, LastName, Role, Department, LastSeenAt
         FROM Users WHERE LastSeenAt >= DATEADD(MINUTE, -5, SYSUTCDATETIME()) AND IsActive = 1
         ORDER BY LastSeenAt DESC`
      ),
      query(
        `SELECT TOP 10 UserId, UniversityId, FirstName, LastName, Role, Department, LastLoginAt
         FROM Users WHERE LastLoginAt IS NOT NULL ORDER BY LastLoginAt DESC`
      ),
      query(
        `SELECT u.UserId, u.UniversityId, u.FirstName, u.LastName, u.Department, u.LastLoginAt, u.LastSeenAt,
                CASE WHEN u.LastSeenAt >= DATEADD(MINUTE, -5, SYSUTCDATETIME()) THEN 1 ELSE 0 END AS IsOnline,
                (SELECT COUNT(DISTINCT p.ProjectId) FROM Projects p
                 WHERE p.OwnerStudentId = u.UserId
                    OR EXISTS (
                      SELECT 1 FROM ProjectMembers pm
                      WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = u.UserId
                    )) AS ProjectCount,
                (SELECT TOP 1 p.Status FROM Projects p WHERE p.OwnerStudentId = u.UserId ORDER BY p.UpdatedAt DESC) AS LatestStatus
         FROM Users u WHERE u.Role = 'student' AND u.IsActive = 1 ORDER BY u.LastLoginAt DESC`
      ),
      query(
        `SELECT TOP 15 'project' AS type, p.Title AS detail, s.FirstName + ' ' + s.LastName AS actor,
                p.Status AS extra, p.UpdatedAt AS time
         FROM Projects p LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
         UNION ALL
         SELECT TOP 10 'submission', sub.Title, st.FirstName + ' ' + st.LastName, 'submitted', sub.SubmittedAt
         FROM Submissions sub JOIN Users st ON sub.SubmittedByStudentId = st.UserId
         UNION ALL
         SELECT TOP 10 'team_invite', p.Title,
                inviter.FirstName + ' ' + inviter.LastName + ' → ' + invited.FirstName + ' ' + invited.LastName,
                pi.Status, pi.CreatedAt
         FROM ProjectInvitations pi
         JOIN Projects p ON pi.ProjectId = p.ProjectId
         JOIN Users inviter ON pi.InvitedByStudentId = inviter.UserId
         JOIN Users invited ON pi.InvitedStudentId = invited.UserId
         UNION ALL
         SELECT TOP 10 'teacher_assign', p.Title,
                s.FirstName + ' ' + s.LastName + ' → ' + t.FirstName + ' ' + t.LastName,
                p.Status, p.AssignedAt
         FROM Projects p
         JOIN Users s ON p.OwnerStudentId = s.UserId
         JOIN Users t ON p.AssignedByTeacherId = t.UserId
         ORDER BY time DESC`
      ),
    ]);

    res.json({
      onlineUsers: online.recordset,
      onlineCount: online.recordset.length,
      recentLogins: recentLogins.recordset,
      students: students.recordset,
      recentActivity: recentActivity.recordset.slice(0, 20),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Admin view of student↔teacher and team connections */
router.get('/connections', async (req, res) => {
  try {
    const [teamInvites, teacherAssignments, teamMembers] = await Promise.all([
      query(
        `SELECT TOP 30 pi.InvitationId, pi.Status, pi.CreatedAt, pi.InviteNote,
                p.ProjectId, p.Title, p.TeacherAssignedId, p.Status AS ProjectStatus,
                inviter.FirstName + ' ' + inviter.LastName AS InviterName,
                inviter.UniversityId AS InviterUniversityId,
                invited.FirstName + ' ' + invited.LastName AS InvitedName,
                invited.UniversityId AS InvitedUniversityId
         FROM ProjectInvitations pi
         JOIN Projects p ON pi.ProjectId = p.ProjectId
         JOIN Users inviter ON pi.InvitedByStudentId = inviter.UserId
         JOIN Users invited ON pi.InvitedStudentId = invited.UserId
         ORDER BY pi.CreatedAt DESC`
      ),
      query(
        `SELECT TOP 30 p.ProjectId, p.Title, p.TeacherAssignedId, p.Status, p.AssignedAt,
                s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
                t.FirstName + ' ' + t.LastName AS TeacherName, t.UniversityId AS TeacherUniversityId
         FROM Projects p
         JOIN Users s ON p.OwnerStudentId = s.UserId
         JOIN Users t ON p.AssignedByTeacherId = t.UserId
         ORDER BY p.AssignedAt DESC`
      ),
      query(
        `SELECT TOP 40 pm.ProjectId, p.Title, p.TeacherAssignedId, p.Status AS ProjectStatus,
                u.FirstName + ' ' + u.LastName AS MemberName, u.UniversityId, u.Email,
                pm.JoinedAt,
                CASE WHEN p.OwnerStudentId = u.UserId THEN 1 ELSE 0 END AS IsOwner
         FROM ProjectMembers pm
         JOIN Projects p ON pm.ProjectId = p.ProjectId
         JOIN Users u ON pm.StudentId = u.UserId
         ORDER BY pm.JoinedAt DESC`
      ),
    ]);

    res.json({
      teamInvites: teamInvites.recordset,
      teacherAssignments: teacherAssignments.recordset,
      teamMembers: teamMembers.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Accounts waiting for admin approval */
router.get('/pending-registrations', async (req, res) => {
  try {
    const result = await query(
      `SELECT UserId, UniversityId, Email, PlainPassword, FirstName, LastName, Role, Department, CreatedAt
       FROM Users WHERE AccountStatus = 'pending'
       ORDER BY CreatedAt DESC`
    );
    res.json({ pending: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Approve a pending student or teacher account */
router.post('/accounts/:userId/approve', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    const target = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Role, AccountStatus FROM Users WHERE UserId = @userId`,
      { userId: targetId }
    );
    if (!target.recordset.length) return res.status(404).json({ error: 'User not found' });

    const user = target.recordset[0];
    if (user.AccountStatus !== 'pending') {
      return res.status(400).json({ error: 'This account is not pending approval' });
    }
    if (user.Role === 'admin') {
      return res.status(403).json({ error: 'Cannot approve admin accounts this way' });
    }

    await query(
      `UPDATE Users SET IsActive = 1, AccountStatus = 'approved', UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId`,
      { userId: targetId }
    );

    await query(
      `INSERT INTO Notifications (UserId, Title, Message, Type)
       VALUES (@userId, @title, @message, 'account_approved')`,
      {
        userId: targetId,
        title: 'Account Approved',
        message: 'Your ProjectHub account has been approved by the administrator. You can now sign in.',
      }
    );

    res.json({
      message: `${user.FirstName} ${user.LastName} (${user.UniversityId}) has been approved and can now sign in.`,
      user: { ...user, AccountStatus: 'approved', IsActive: true },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Reject a pending account — permanently deleted, cannot register again with same HU ID until... actually deleted so they CAN register again with same email if deleted from DB */
router.post('/accounts/:userId/reject', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    const target = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Role, AccountStatus FROM Users WHERE UserId = @userId`,
      { userId: targetId }
    );
    if (!target.recordset.length) return res.status(404).json({ error: 'User not found' });

    const user = target.recordset[0];
    if (user.AccountStatus !== 'pending') {
      return res.status(400).json({ error: 'Only pending accounts can be rejected this way' });
    }
    if (user.Role === 'admin') {
      return res.status(403).json({ error: 'Cannot reject admin accounts' });
    }

    const deleted = await permanentlyDeleteUser(targetId, user.Role);
    if (!deleted) return res.status(500).json({ error: 'Failed to reject account' });

    res.json({
      message: `${user.FirstName} ${user.LastName} (${user.UniversityId}) was rejected and permanently removed.${reason ? ` Reason: ${reason}` : ''}`,
      deletedUser: {
        userId: user.UserId,
        universityId: user.UniversityId,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Permanently delete a student or teacher account — irreversible */
router.delete('/users/:userId', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetId === req.user.userId) {
      return res.status(403).json({ error: 'You cannot delete your own admin account' });
    }

    const target = await query(
      'SELECT UserId, UniversityId, Email, FirstName, LastName, Role FROM Users WHERE UserId = @userId',
      { userId: targetId }
    );
    if (!target.recordset.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = target.recordset[0];
    if (user.Role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be deleted' });
    }
    if (user.Role !== 'student' && user.Role !== 'teacher') {
      return res.status(400).json({ error: 'Only student and teacher accounts can be deleted' });
    }

    const deleted = await permanentlyDeleteUser(targetId, user.Role);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    res.json({
      message: `${user.FirstName} ${user.LastName} (${user.UniversityId}) has been permanently deleted`,
      deletedUser: {
        userId: user.UserId,
        universityId: user.UniversityId,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Admin updates student/teacher University ID and/or password (not email) */
router.put('/users/:userId/account', async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    const { universityId, password } = req.body;
    if (!universityId && !password) {
      return res.status(400).json({ error: 'Provide a new University ID and/or password' });
    }

    const target = await query(
      'SELECT UserId, UniversityId, Email, FirstName, LastName, Role FROM Users WHERE UserId = @userId',
      { userId: targetId }
    );
    if (!target.recordset.length) return res.status(404).json({ error: 'User not found' });

    const user = target.recordset[0];
    if (user.Role !== 'student' && user.Role !== 'teacher') {
      return res.status(403).json({ error: 'Only student and teacher accounts can be edited this way' });
    }

    const updates = [];
    const params = { userId: targetId };

    if (universityId) {
      const idCheck = validateUniversityId(universityId);
      if (!idCheck.ok) return res.status(400).json({ error: idCheck.error });
      const dup = await query(
        'SELECT UserId FROM Users WHERE UniversityId = @universityId AND UserId <> @userId',
        { universityId: idCheck.id, userId: targetId }
      );
      if (dup.recordset.length) {
        return res.status(409).json({ error: 'That University ID is already in use' });
      }
      params.universityId = idCheck.id;
      updates.push('UniversityId = @universityId');
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      params.passwordHash = await bcrypt.hash(password, 12);
      params.plain = password;
      updates.push('PasswordHash = @passwordHash', 'PlainPassword = @plain');
    }

    updates.push('UpdatedAt = SYSUTCDATETIME()');
    await query(`UPDATE Users SET ${updates.join(', ')} WHERE UserId = @userId`, params);

    const updated = await query(
      `SELECT UserId, UniversityId, Email, PlainPassword, FirstName, LastName, Role, Department, AccountStatus
       FROM Users WHERE UserId = @userId`,
      { userId: targetId }
    );

    res.json({
      message: `Updated ${user.FirstName} ${user.LastName}'s account`,
      user: updated.recordset[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Chart data for admin dashboard — live from SQL Server */
router.get('/charts', async (req, res) => {
  try {
    const [usersByRole, projectsByStatus, weeklyLogins, deptStudents] = await Promise.all([
      query(`SELECT Role, COUNT(*) AS count FROM Users WHERE IsActive = 1 AND AccountStatus = 'approved' GROUP BY Role`),
      query(`SELECT Status, COUNT(*) AS count FROM Projects GROUP BY Status`),
      query(
        `SELECT CAST(LastLoginAt AS DATE) AS day, COUNT(*) AS count
         FROM Users WHERE LastLoginAt >= DATEADD(DAY, -14, SYSUTCDATETIME())
         GROUP BY CAST(LastLoginAt AS DATE) ORDER BY day`
      ),
      query(
        `SELECT ISNULL(Department, 'Unknown') AS dept, COUNT(*) AS count
         FROM Users WHERE Role = 'student' AND IsActive = 1 GROUP BY Department`
      ),
    ]);
    res.json({
      usersByRole: usersByRole.recordset,
      projectsByStatus: projectsByStatus.recordset,
      weeklyLogins: weeklyLogins.recordset,
      studentsByDepartment: deptStudents.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Batch AI Scanner — re-analyze selected submissions and cross-compare (admin only) */
router.post('/batch-scan', async (req, res) => {
  try {
    const projectIds = [...new Set(
      (req.body.projectIds || [])
        .map(id => parseInt(id, 10))
        .filter(id => !Number.isNaN(id) && id > 0)
    )];

    if (!projectIds.length) {
      return res.status(400).json({ error: 'Select at least one submission to scan' });
    }

    const placeholders = projectIds.map((_, i) => `@batchPid${i}`).join(',');
    const params = {};
    projectIds.forEach((id, i) => { params[`batchPid${i}`] = id; });

    const rows = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status,
              p.OwnerStudentId,
              s.FirstName + ' ' + s.LastName AS StudentName,
              sub.SubmissionId
       FROM Projects p
       LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       OUTER APPLY (
         SELECT TOP 1 SubmissionId FROM Submissions WHERE ProjectId = p.ProjectId ORDER BY SubmittedAt DESC
       ) sub
       WHERE p.ProjectId IN (${placeholders})`,
      params
    );

    if (!rows.recordset.length) {
      return res.status(404).json({ error: 'No projects found for selected IDs' });
    }

    const items = [];
    for (const r of rows.recordset) {
      let submissionId = r.SubmissionId;
      if (!submissionId && r.Title && r.Abstract && r.OwnerStudentId) {
        const created = await query(
          `INSERT INTO Submissions (ProjectId, SubmittedByStudentId, Title, Abstract, Content)
           OUTPUT INSERTED.SubmissionId
           VALUES (@projectId, @ownerId, @title, @abstract, NULL)`,
          {
            projectId: r.ProjectId,
            ownerId: r.OwnerStudentId,
            title: r.Title,
            abstract: r.Abstract,
          }
        );
        submissionId = created.recordset[0]?.SubmissionId;
      }
      if (!submissionId) continue;
      items.push({
        projectId: r.ProjectId,
        submissionId,
        title: r.Title || '',
        abstract: r.Abstract || '',
        studentName: r.StudentName || 'Unknown',
        teacherAssignedId: r.TeacherAssignedId,
      });
    }

    if (!items.length) {
      return res.status(400).json({ error: 'Selected projects have no title/abstract to analyze — add project content first' });
    }

    const allProjects = await query(
      `SELECT ProjectId, TeacherAssignedId, Title, Abstract, Status FROM Projects`
    );
    const settings = await query(`SELECT SettingValue FROM Settings WHERE SettingKey = 'ai_similarity_threshold'`);
    const threshold = parseInt(settings.recordset[0]?.SettingValue || '60', 10);

    const results = batchAnalyzeSubmissions(items, allProjects.recordset, threshold);

    for (const r of results) {
      const a = r.analysis;
      await query('DELETE FROM AIAnalyses WHERE SubmissionId = @submissionId OR ProjectId = @projectId', {
        submissionId: r.submissionId,
        projectId: r.projectId,
      });
      await query(
        `INSERT INTO AIAnalyses (SubmissionId, ProjectId, UniquenessScore, AIConfidence,
           SimilarProjectId, SimilarProjectAssignedId, SimilarityPercent, AISuggestion, SuggestedAction, RejectionReasons)
         VALUES (@submissionId, @projectId, @uniqueness, @confidence, @similarId, @similarAssignedId,
           @similarity, @suggestion, @action, @reasons)`,
        {
          submissionId: r.submissionId,
          projectId: r.projectId,
          uniqueness: a.uniqueness_score,
          confidence: a.ai_confidence,
          similarId: a.similar_project_id,
          similarAssignedId: a.similar_project_assigned_id,
          similarity: a.similarity_percent,
          suggestion: a.ai_suggestion,
          action: a.suggested_action,
          reasons: JSON.stringify(a.rejection_reasons),
        }
      );
      await query(
        `UPDATE Projects SET Status = 'under_review', UpdatedAt = SYSUTCDATETIME() WHERE ProjectId = @projectId AND Status = 'submitted'`,
        { projectId: r.projectId }
      );
    }

    res.json({
      message: `Athena scanned ${results.length} submission(s) against the full project database`,
      results: results.map(r => ({
        projectId: r.projectId,
        student: r.studentName,
        project: r.projectTitle,
        teacherAssignedId: r.teacherAssignedId,
        uniqueness: r.uniqueness,
        collidesWith: r.collidesWith,
        action: r.action,
        aiSuggestion: r.aiSuggestion,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
