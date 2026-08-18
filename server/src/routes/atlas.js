import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, attachUserDetails);

/** Topic occupancy check — searches SQL Server projects */
router.get('/check-topic', async (req, res) => {
  try {
    const topic = String(req.query.q || '').trim();
    if (!topic) return res.json({ result: null, matches: [] });

    const like = `%${topic}%`;
    const matches = await query(
      `SELECT TOP 5 p.ProjectId, p.Title, p.Status
       FROM Projects p
       WHERE p.Title LIKE @like OR p.Abstract LIKE @like OR p.Description LIKE @like
       ORDER BY p.AssignedAt DESC`,
      { like }
    );

    const rows = matches.recordset;
    let result = 'available';
    if (rows.some(r => r.Status === 'approved')) result = 'taken';
    else if (rows.some(r => ['submitted', 'under_review', 'assigned', 'pending_teacher', 'changes_requested'].includes(r.Status))) {
      result = 'pending';
    }

    res.json({ result, matches: rows });
  } catch (err) {
    sendError(res, err);
  }
});

/** Project Atlas dashboard data */
router.get('/data', async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.userId;
    let visibility = '1 = 0';
    let canIdentifyStudent = '1 = 0';
    let canViewStudentId = '1 = 0';
    if (role === 'admin') {
      visibility = '1 = 1';
      canIdentifyStudent = '1 = 1';
      canViewStudentId = '1 = 1';
    } else if (role === 'teacher') {
      visibility = "(p.Status = 'approved' OR p.AssignedByTeacherId = @uid)";
      canIdentifyStudent = "(p.Status = 'approved' OR p.AssignedByTeacherId = @uid)";
      canViewStudentId = 'p.AssignedByTeacherId = @uid';
    } else if (role === 'student') {
      const participant = `(p.OwnerStudentId = @uid OR EXISTS (
        SELECT 1 FROM ProjectMembers pm
        WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @uid
      ))`;
      visibility = `(p.Status = 'approved' OR ${participant})`;
      canIdentifyStudent = `(p.Status = 'approved' OR ${participant})`;
      canViewStudentId = participant;
    }

    const projects = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status, p.AssignedAt,
              CASE WHEN ${canIdentifyStudent} THEN s.FirstName + ' ' + s.LastName ELSE NULL END AS StudentName,
              CASE WHEN ${canViewStudentId} THEN s.UniversityId ELSE NULL END AS StudentUniversityId,
              CASE WHEN ${canIdentifyStudent} THEN s.Department ELSE NULL END AS Department,
              t.FirstName + ' ' + t.LastName AS TeacherName
       FROM Projects p
       LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       JOIN Users t ON p.AssignedByTeacherId = t.UserId
       WHERE ${visibility}
       ORDER BY p.AssignedAt DESC`,
      { uid: userId }
    );
    const deptStats = await query(
      `SELECT ISNULL(s.Department, 'Other') AS dept, COUNT(*) AS count
       FROM Projects p LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       WHERE ${visibility}
       GROUP BY ISNULL(s.Department, 'Other')`,
      { uid: userId }
    );
    const statusCounts = await query(
      `SELECT p.Status, COUNT(*) AS count FROM Projects p
       WHERE ${visibility}
       GROUP BY p.Status`,
      { uid: userId }
    );
    res.json({
      projects: projects.recordset,
      departmentStats: deptStats.recordset,
      statusCounts: statusCounts.recordset,
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
