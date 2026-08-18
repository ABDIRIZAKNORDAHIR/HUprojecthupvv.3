import { query } from '../db.js';

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Student has access if owner or team member */
export async function studentCanAccessProject(userId, projectId) {
  const pid = toId(projectId);
  const uid = toId(userId);
  if (!pid || !uid) return false;
  const r = await query(
    `SELECT 1 AS ok FROM Projects p
     WHERE p.ProjectId = @pid
       AND (
         p.OwnerStudentId = @uid
         OR EXISTS (
           SELECT 1 FROM ProjectMembers pm
           WHERE pm.ProjectId = p.ProjectId AND pm.StudentId = @uid
         )
       )`,
    { pid, uid }
  );
  return r.recordset.length > 0;
}

/** Role-aware access to private project data. Admin access must be explicitly enabled. */
export async function userCanAccessProject(user, projectId, { allowAdmin = false } = {}) {
  const pid = toId(projectId);
  const uid = toId(user?.userId);
  if (!pid || !uid) return false;
  if (user.role === 'admin') return allowAdmin;
  if (user.role === 'student') return studentCanAccessProject(uid, pid);
  if (user.role !== 'teacher') return false;

  const result = await query(
    'SELECT 1 FROM Projects WHERE ProjectId = @pid AND AssignedByTeacherId = @uid',
    { pid, uid }
  );
  return result.recordset.length > 0;
}

/** Student is the project owner or an accepted team member. */
export async function isProjectStudent(projectId, studentId) {
  return studentCanAccessProject(studentId, projectId);
}

/** Server-derived recipients for project-scoped communication. */
export async function getProjectParticipantIds(projectId, { includeTeacher = true } = {}) {
  const pid = toId(projectId);
  if (!pid) return [];
  const result = await query(
    `SELECT DISTINCT participants.UserId AS UserId FROM (
       SELECT OwnerStudentId AS UserId FROM Projects WHERE ProjectId = @pid
       UNION SELECT StudentId AS UserId FROM ProjectMembers WHERE ProjectId = @pid
       ${includeTeacher ? 'UNION SELECT AssignedByTeacherId AS UserId FROM Projects WHERE ProjectId = @pid' : ''}
     ) participants
     JOIN Users u ON u.UserId = participants.UserId
     WHERE participants.UserId IS NOT NULL
       AND u.IsActive = 1 AND u.AccountStatus = 'approved'
       ${includeTeacher ? "AND u.Role IN ('student', 'teacher')" : "AND u.Role = 'student'"}`,
    { pid }
  );
  return result.recordset.map(row => Number(row.UserId));
}

export async function upsertProjectInvitation({ projectId, invitedStudentId, invitedBy, note }) {
  const pid = parseInt(projectId, 10);
  const invitedId = parseInt(invitedStudentId, 10);
  const byId = parseInt(invitedBy, 10);

  const existing = await query(
    `SELECT InvitationId FROM ProjectInvitations
     WHERE ProjectId = @pid AND InvitedStudentId = @invitedId`,
    { pid, invitedId }
  );
  if (existing.recordset.length) {
    await query(
      `UPDATE ProjectInvitations
       SET Status = 'pending', InviteNote = @note, CreatedAt = SYSUTCDATETIME()
       WHERE InvitationId = @invitationId`,
      { invitationId: existing.recordset[0].InvitationId, note: note || null }
    );
  } else {
    await query(
      `INSERT INTO ProjectInvitations (ProjectId, InvitedStudentId, InvitedByStudentId, InviteNote)
       VALUES (@pid, @invitedId, @byId, @note)`,
      { pid, invitedId, byId, note: note || null }
    );
  }
}
