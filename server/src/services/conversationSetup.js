import { query } from '../db.js';

/** Ensure private teacher–student conversation exists for a project */
export async function ensureTeacherStudentConversation(projectId) {
  const existing = await query(
    `SELECT ConversationId FROM Conversations
     WHERE ConversationType = 'teacher_student' AND ProjectId = @pid`,
    { pid: projectId }
  );
  if (existing.recordset.length) return existing.recordset[0].ConversationId;

  const proj = await query(
    `SELECT ProjectId, Title, AssignedByTeacherId, OwnerStudentId FROM Projects WHERE ProjectId = @pid`,
    { pid: projectId }
  );
  if (!proj.recordset.length) return null;
  const p = proj.recordset[0];
  if (!p.AssignedByTeacherId || !p.OwnerStudentId) return null;

  const ins = await query(
    `INSERT INTO Conversations (ConversationType, ProjectId, Title, CreatedBy)
     OUTPUT INSERTED.ConversationId
     VALUES ('teacher_student', @pid, @title, @createdBy)`,
    {
      pid: projectId,
      title: `Teacher chat — ${p.Title}`,
      createdBy: p.OwnerStudentId,
    }
  );
  const conversationId = ins.recordset[0].ConversationId;
  for (const uid of [p.AssignedByTeacherId, p.OwnerStudentId]) {
    await query(
      `INSERT INTO ConversationMembers (ConversationId, UserId) VALUES (@cid, @uid)`,
      { cid: conversationId, uid }
    );
  }
  return conversationId;
}

/** Ensure group conversation for all project members + teacher */
export async function ensureProjectGroupConversation(projectId) {
  const existing = await query(
    `SELECT ConversationId FROM Conversations
     WHERE ConversationType = 'project_group' AND ProjectId = @pid`,
    { pid: projectId }
  );
  if (existing.recordset.length) return existing.recordset[0].ConversationId;

  const proj = await query(
    `SELECT ProjectId, Title, AssignedByTeacherId, OwnerStudentId FROM Projects WHERE ProjectId = @pid`,
    { pid: projectId }
  );
  if (!proj.recordset.length) return null;
  const p = proj.recordset[0];

  const ins = await query(
    `INSERT INTO Conversations (ConversationType, ProjectId, Title, CreatedBy)
     OUTPUT INSERTED.ConversationId
     VALUES ('project_group', @pid, @title, @createdBy)`,
    {
      pid: projectId,
      title: `Team chat — ${p.Title}`,
      createdBy: p.OwnerStudentId || p.AssignedByTeacherId,
    }
  );
  const conversationId = ins.recordset[0].ConversationId;

  const members = await query(
    `SELECT DISTINCT UserId FROM (
       SELECT OwnerStudentId AS UserId FROM Projects WHERE ProjectId = @pid
       UNION SELECT StudentId AS UserId FROM ProjectMembers WHERE ProjectId = @pid
       UNION SELECT AssignedByTeacherId AS UserId FROM Projects WHERE ProjectId = @pid
     ) x WHERE UserId IS NOT NULL`,
    { pid: projectId }
  );
  for (const row of members.recordset) {
    await query(
      `IF NOT EXISTS (SELECT 1 FROM ConversationMembers WHERE ConversationId = @cid AND UserId = @uid)
       INSERT INTO ConversationMembers (ConversationId, UserId) VALUES (@cid, @uid)`,
      { cid: conversationId, uid: row.UserId }
    );
  }
  return conversationId;
}

/** Sync conversations for all projects the user can access (admin excluded — private teacher↔student) */
export async function syncUserProjectConversations(userId, role) {
  if (role === 'admin') {
    return { synced: 0, created: 0 };
  }

  let projects;
  if (role === 'teacher') {
    projects = await query(
      `SELECT ProjectId FROM Projects WHERE AssignedByTeacherId = @uid AND OwnerStudentId IS NOT NULL`,
      { uid: userId }
    );
  } else {
    projects = await query(
      `SELECT DISTINCT ProjectId FROM (
         SELECT ProjectId FROM Projects WHERE OwnerStudentId = @uid
         UNION SELECT ProjectId FROM ProjectMembers WHERE StudentId = @uid
       ) x`,
      { uid: userId }
    );
  }

  let created = 0;
  for (const row of projects.recordset) {
    const pid = row.ProjectId;
    const before = await query(
      `SELECT COUNT(*) AS c FROM Conversations WHERE ProjectId = @pid`,
      { pid }
    );
    await ensureTeacherStudentConversation(pid);
    await ensureProjectGroupConversation(pid);
    const after = await query(
      `SELECT COUNT(*) AS c FROM Conversations WHERE ProjectId = @pid`,
      { pid }
    );
    if (after.recordset[0].c > before.recordset[0].c) created++;
  }
  return { synced: projects.recordset.length, created };
}
