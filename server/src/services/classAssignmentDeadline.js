import { query } from '../db.js';

/**
 * Close class assignments past deadline and notify students (in-app).
 * Called on API traffic and on a timer — acts as the "time is over" alert.
 */
export async function closeExpiredClassAssignments() {
  const expired = await query(`
    SELECT AssignmentId, Title, ClassName, StudyMode, DeadlineAt
    FROM ClassAssignments
    WHERE IsClosed = 0 AND DeadlineAt <= SYSUTCDATETIME()
  `);

  for (const a of expired.recordset) {
    await query(
      `UPDATE ClassAssignments SET IsClosed = 1 WHERE AssignmentId = @id`,
      { id: a.AssignmentId }
    );

    const already = await query(
      `SELECT ClosedNotified FROM ClassAssignments WHERE AssignmentId = @id`,
      { id: a.AssignmentId }
    );
    if (already.recordset[0]?.ClosedNotified) continue;

    let sq = `
      SELECT UserId FROM Users
      WHERE Role = 'student' AND IsActive = 1 AND AccountStatus = 'approved'
        AND UPPER(TRIM(ClassName)) = @className`;
    const params = { className: String(a.ClassName).trim().toUpperCase() };
    if (a.StudyMode) {
      sq += ' AND StudyMode = @studyMode';
      params.studyMode = a.StudyMode;
    }
    const students = await query(sq, params);

    for (const s of students.recordset) {
      const submitted = await query(
        `SELECT 1 FROM ClassAssignmentSubmissions WHERE AssignmentId = @aid AND StudentId = @sid`,
        { aid: a.AssignmentId, sid: s.UserId }
      );
      const lateNote = submitted.recordset.length
        ? `Deadline reached for "${a.Title}". Your earlier submission was kept.`
        : `Time is over for "${a.Title}" (class ${a.ClassName}). You can no longer submit.`;

      await query(
        `INSERT INTO Notifications (UserId, Title, Message, Type)
         VALUES (@userId, @title, @message, 'class_assignment_closed')`,
        {
          userId: s.UserId,
          title: 'Assignment Deadline Passed',
          message: lateNote,
        }
      );
    }

    await query(
      `UPDATE ClassAssignments SET ClosedNotified = 1 WHERE AssignmentId = @id`,
      { id: a.AssignmentId }
    );
  }

  return expired.recordset.length;
}

export function startClassAssignmentDeadlineWatcher(intervalMs = 60000) {
  const tick = () => {
    closeExpiredClassAssignments().catch((err) => {
      console.warn('[ClassAssignments] Deadline watcher:', err.message);
    });
  };
  tick();
  return setInterval(tick, intervalMs);
}
