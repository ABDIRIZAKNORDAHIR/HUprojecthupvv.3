import { query } from '../db.js';

/** Collect every project tied to this user (teacher, owner, member, messages, etc.) */
async function getAllRelatedProjectIds(userId) {
  const r = await query(
    `SELECT DISTINCT ProjectId FROM (
       SELECT ProjectId FROM Projects WHERE AssignedByTeacherId = @userId OR OwnerStudentId = @userId
       UNION SELECT ProjectId FROM ProjectMembers WHERE StudentId = @userId OR InvitedByStudentId = @userId
       UNION SELECT ProjectId FROM ProjectInvitations WHERE InvitedStudentId = @userId OR InvitedByStudentId = @userId
       UNION SELECT ProjectId FROM Submissions WHERE SubmittedByStudentId = @userId
       UNION SELECT ProjectId FROM Messages WHERE SenderId = @userId OR ReceiverId = @userId
       UNION SELECT RelatedProjectId AS ProjectId FROM Notifications WHERE UserId = @userId AND RelatedProjectId IS NOT NULL
     ) x WHERE ProjectId IS NOT NULL`,
    { userId }
  );
  return r.recordset.map(row => row.ProjectId);
}

async function deleteProjectsCascade(projectIds) {
  for (const projectId of projectIds) {
    await query(
      `UPDATE AIAnalyses SET SimilarProjectId = NULL WHERE SimilarProjectId = @projectId`,
      { projectId }
    );
    await query(
      `DELETE FROM AIAnalyses WHERE SubmissionId IN (SELECT SubmissionId FROM Submissions WHERE ProjectId = @projectId)`,
      { projectId }
    );
    await query('DELETE FROM AIAnalyses WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM DocumentAnalyses WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM ProjectAIChatMessages WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM ProjectEvaluations WHERE ProjectId = @projectId', { projectId });
    await query(
      `DELETE FROM DocumentAnalyses WHERE ConversationMessageId IN (
         SELECT cm.ConversationMessageId FROM ConversationMessages cm
         JOIN Conversations c ON c.ConversationId = cm.ConversationId
         WHERE c.ProjectId = @projectId
       )`,
      { projectId }
    );
    await query(
      `DELETE FROM ConversationMessages WHERE ConversationId IN (
         SELECT ConversationId FROM Conversations WHERE ProjectId = @projectId
       )`,
      { projectId }
    );
    await query(
      `DELETE FROM ConversationMembers WHERE ConversationId IN (
         SELECT ConversationId FROM Conversations WHERE ProjectId = @projectId
       )`,
      { projectId }
    );
    await query('DELETE FROM Conversations WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM Submissions WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM Messages WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM ProjectInvitations WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM ProjectMembers WHERE ProjectId = @projectId', { projectId });
    await query('DELETE FROM Notifications WHERE RelatedProjectId = @projectId', { projectId });
    await query('DELETE FROM Projects WHERE ProjectId = @projectId', { projectId });
  }
}

/** Permanently delete a student or teacher and all related data. Cannot be undone. */
export async function permanentlyDeleteUser(targetUserId, targetRole) {
  let projectIds = await getAllRelatedProjectIds(targetUserId);

  // Teachers: ensure every assigned project is removed (FK on AssignedByTeacherId)
  const teacherProjects = await query(
    'SELECT ProjectId FROM Projects WHERE AssignedByTeacherId = @userId',
    { userId: targetUserId }
  );
  for (const row of teacherProjects.recordset) {
    if (!projectIds.includes(row.ProjectId)) projectIds.push(row.ProjectId);
  }

  await deleteProjectsCascade(projectIds);

  await query(
    'DELETE FROM ProjectInvitations WHERE InvitedStudentId = @userId OR InvitedByStudentId = @userId',
    { userId: targetUserId }
  );
  await query(
    'DELETE FROM ProjectMembers WHERE StudentId = @userId OR InvitedByStudentId = @userId',
    { userId: targetUserId }
  );
  await query('DELETE FROM Submissions WHERE SubmittedByStudentId = @userId', { userId: targetUserId });
  await query(
    'DELETE FROM Messages WHERE SenderId = @userId OR ReceiverId = @userId',
    { userId: targetUserId }
  );
  await query('DELETE FROM Notifications WHERE UserId = @userId', { userId: targetUserId });
  await query('DELETE FROM PushSubscriptions WHERE UserId = @userId', { userId: targetUserId });
  await query('DELETE FROM ProjectEvaluations WHERE StudentId = @userId OR TeacherId = @userId', { userId: targetUserId });
  await query('DELETE FROM ProjectAIChatMessages WHERE TeacherId = @userId', { userId: targetUserId });
  await query(
    `DELETE FROM DocumentAnalyses WHERE ConversationMessageId IN (
       SELECT ConversationMessageId FROM ConversationMessages WHERE SenderId = @userId
     )`,
    { userId: targetUserId }
  );
  await query('DELETE FROM ConversationMessages WHERE SenderId = @userId', { userId: targetUserId });
  await query('DELETE FROM ConversationMembers WHERE UserId = @userId', { userId: targetUserId });

  if (targetRole === 'teacher') {
    await query(
      `DELETE FROM ClassAssignmentSubmissions WHERE AssignmentId IN (
         SELECT AssignmentId FROM ClassAssignments WHERE TeacherId = @userId
       )`,
      { userId: targetUserId }
    );
    await query('DELETE FROM ClassAssignments WHERE TeacherId = @userId', { userId: targetUserId });
  } else {
    await query('DELETE FROM ClassAssignmentSubmissions WHERE StudentId = @userId', { userId: targetUserId });
  }

  await query(
    `UPDATE Conversations SET CreatedBy = (
       SELECT MIN(cm.UserId) FROM ConversationMembers cm
       WHERE cm.ConversationId = Conversations.ConversationId
     )
     WHERE CreatedBy = @userId
       AND EXISTS (
         SELECT 1 FROM ConversationMembers cm
         WHERE cm.ConversationId = Conversations.ConversationId
       )`,
    { userId: targetUserId }
  );
  await query(
    `DELETE FROM Conversations WHERE CreatedBy = @userId
       AND NOT EXISTS (
         SELECT 1 FROM ConversationMembers cm
         WHERE cm.ConversationId = Conversations.ConversationId
       )`,
    { userId: targetUserId }
  );
  await query('UPDATE Settings SET UpdatedBy = NULL WHERE UpdatedBy = @userId', { userId: targetUserId });

  // Clear any remaining owner links before user row delete
  await query('UPDATE Projects SET OwnerStudentId = NULL WHERE OwnerStudentId = @userId', { userId: targetUserId });

  // Final sweep — delete projects still pointing at this teacher
  const leftover = await query(
    'SELECT ProjectId FROM Projects WHERE AssignedByTeacherId = @userId',
    { userId: targetUserId }
  );
  if (leftover.recordset.length) {
    await deleteProjectsCascade(leftover.recordset.map(r => r.ProjectId));
  }

  const result = await query('DELETE FROM Users WHERE UserId = @userId', { userId: targetUserId });
  return result.rowsAffected?.[0] > 0;
}
