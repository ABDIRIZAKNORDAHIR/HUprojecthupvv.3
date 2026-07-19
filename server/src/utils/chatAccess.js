/** Who may start a direct text conversation with whom */
export function canUsersChat(searcherRole, targetRole) {
  if (searcherRole === targetRole && searcherRole === 'student') return true;
  if (searcherRole === 'admin') return ['student', 'teacher'].includes(targetRole);
  if (searcherRole === 'teacher') return ['student', 'teacher', 'admin'].includes(targetRole);
  if (searcherRole === 'student') return ['student', 'teacher', 'admin'].includes(targetRole);
  return false;
}

/** Admin may only view their own direct 1-on-1 chats — never teacher↔student threads */
export function adminCanViewConversationType(conversationType, userRole) {
  if (userRole !== 'admin') return true;
  return conversationType === 'student_direct';
}

/** Admin cannot read or send project-scoped private messages */
export function adminCanAccessProjectMessages(userRole) {
  return userRole !== 'admin';
}

/** Conversation type for a 1-on-1 chat (no project) */
export function directChatType(roleA, roleB) {
  const roles = new Set([roleA, roleB]);
  if (roles.has('student') && roles.has('teacher')) return 'teacher_student';
  return 'student_direct';
}

export async function findExistingDirectConversation(query, userId, otherId, type) {
  const r = await query(
    `SELECT c.ConversationId FROM Conversations c
     WHERE c.ConversationType = @type AND c.ProjectId IS NULL
       AND (SELECT COUNT(*) FROM ConversationMembers cm WHERE cm.ConversationId = c.ConversationId) = 2
       AND EXISTS (SELECT 1 FROM ConversationMembers cm WHERE cm.ConversationId = c.ConversationId AND cm.UserId = @u1)
       AND EXISTS (SELECT 1 FROM ConversationMembers cm WHERE cm.ConversationId = c.ConversationId AND cm.UserId = @u2)`,
    { type, u1: userId, u2: otherId }
  );
  return r.recordset[0]?.ConversationId || null;
}

/** Find any private 1-on-1 direct chat between two users (used for admin ↔ student/teacher) */
export async function findExistingDirectConversationBetween(query, userId, otherId) {
  return findExistingDirectConversation(query, userId, otherId, 'student_direct');
}

export async function conversationHasTeacher(query, conversationId) {
  const r = await query(
    `SELECT 1 FROM ConversationMembers cm
     JOIN Users u ON u.UserId = cm.UserId
     WHERE cm.ConversationId = @cid AND u.Role IN ('teacher', 'admin')`,
    { cid: conversationId }
  );
  return r.recordset.length > 0;
}
