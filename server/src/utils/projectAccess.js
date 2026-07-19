import { query } from '../db.js';

/** Student has access if owner or team member */
export async function studentCanAccessProject(userId, projectId) {
  const pid = parseInt(projectId, 10);
  const uid = parseInt(userId, 10);
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
