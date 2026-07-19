import { Router } from 'express';
import { query } from '../db.js';
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
      `SELECT TOP 5 p.ProjectId, p.Title, p.Status, p.Abstract,
              s.FirstName + ' ' + s.LastName AS StudentName
       FROM Projects p
       LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
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
    res.status(500).json({ error: err.message });
  }
});

/** Project Atlas dashboard data */
router.get('/data', async (req, res) => {
  try {
    const projects = await query(
      `SELECT p.ProjectId, p.TeacherAssignedId, p.Title, p.Abstract, p.Status, p.AssignedAt,
              s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId,
              s.Department, t.FirstName + ' ' + t.LastName AS TeacherName
       FROM Projects p
       LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       JOIN Users t ON p.AssignedByTeacherId = t.UserId
       ORDER BY p.AssignedAt DESC`
    );
    const deptStats = await query(
      `SELECT ISNULL(s.Department, 'Other') AS dept, COUNT(*) AS count
       FROM Projects p LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
       GROUP BY ISNULL(s.Department, 'Other')`
    );
    const statusCounts = await query(
      `SELECT Status, COUNT(*) AS count FROM Projects GROUP BY Status`
    );
    res.json({
      projects: projects.recordset,
      departmentStats: deptStats.recordset,
      statusCounts: statusCounts.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
