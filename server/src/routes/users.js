import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import { normalizeUniversityId } from '../utils/universityId.js';
import { canUsersChat } from '../utils/chatAccess.js';

const router = Router();
router.use(authMiddleware, attachUserDetails);

/** Search users by name, email, or HU ID */
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ users: [] });
    }
    const huId = normalizeUniversityId(q);
    const roleFilter = req.user.role === 'admin' ? "AND Role IN ('student', 'teacher')" : '';
    const result = await query(
      `SELECT TOP 20 UserId, UniversityId, Email, FirstName, LastName, Role, Department, Phone, Bio, ProfileImageUrl
       FROM Users
       WHERE IsActive = 1 AND AccountStatus = 'approved'
         AND UserId <> @selfId
         ${roleFilter}
         AND (
           FirstName LIKE @like OR LastName LIKE @like OR Email LIKE @like
           OR UniversityId LIKE @like OR UniversityId = @huId
           OR (FirstName + ' ' + LastName) LIKE @like
         )
       ORDER BY CASE WHEN Role = 'student' THEN 0 WHEN Role = 'teacher' THEN 1 ELSE 2 END, LastName, FirstName`,
      { like: `%${q}%`, huId: huId || q, selfId: req.user.userId }
    );
    const users = result.recordset.filter(u => canUsersChat(req.user.role, u.Role));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Full profile + current project */
router.get('/:userId/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const user = await query(
      `SELECT UserId, UniversityId, Email, FirstName, LastName, Role, Department,
              Phone, Bio, ContactInfo, ProfileImageUrl, Specialty
       FROM Users WHERE UserId = @userId AND IsActive = 1`,
      { userId }
    );
    if (!user.recordset.length) return res.status(404).json({ error: 'User not found' });

    const projects = await query(
      `SELECT TOP 3 p.ProjectId, p.Title, p.Status, p.TeacherAssignedId
       FROM Projects p
       WHERE p.OwnerStudentId = @userId OR p.ProjectId IN (
         SELECT ProjectId FROM ProjectMembers WHERE StudentId = @userId
       )
       ORDER BY p.UpdatedAt DESC`,
      { userId }
    );

    res.json({
      profile: user.recordset[0],
      currentProjects: projects.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
