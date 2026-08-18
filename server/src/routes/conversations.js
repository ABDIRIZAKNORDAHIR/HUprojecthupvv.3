import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import {
  getProjectParticipantIds,
  studentCanAccessProject,
  userCanAccessProject,
} from '../utils/projectAccess.js';
import { notifyMessageReceived } from '../services/notify.js';
import { analyzeAttachment, analyzeTextContent } from '../services/documentAI.js';
import { runProjectAIAnalysis } from '../services/projectAIService.js';
import { ensureConversationMember, syncUserProjectConversations } from '../services/conversationSetup.js';
import { validateDataUrlAttachment } from '../utils/attachments.js';
import {
  canUsersChat, directChatType, findExistingDirectConversation, findExistingDirectConversationBetween, conversationHasTeacher,
  adminCanViewConversationType,
} from '../utils/chatAccess.js';

const router = Router();
router.use(authMiddleware, attachUserDetails);

async function isMember(userId, conversationId) {
  const r = await query(
    'SELECT 1 FROM ConversationMembers WHERE ConversationId = @cid AND UserId = @uid',
    { cid: conversationId, uid: userId }
  );
  return r.recordset.length > 0;
}

async function reconcileMembers(conversationId, userIds) {
  const allowed = new Set(userIds.map(Number).filter(Number.isInteger));
  const current = await query(
    'SELECT UserId FROM ConversationMembers WHERE ConversationId = @cid',
    { cid: conversationId }
  );
  for (const row of current.recordset) {
    if (!allowed.has(Number(row.UserId))) {
      await query(
        'DELETE FROM ConversationMembers WHERE ConversationId = @cid AND UserId = @uid',
        { cid: conversationId, uid: row.UserId }
      );
    }
  }
  for (const userId of allowed) {
    await ensureConversationMember(conversationId, userId);
  }
}

async function saveDocumentAnalysis({ projectId, conversationMessageId, fileName, fileType, analysis }) {
  const result = await query(
    `INSERT INTO DocumentAnalyses (
       ProjectId, ConversationMessageId, FileName, FileType, Summary, MainTopic,
       KeyPoints, Objectives, QualityScore, RelatedToProject,
       GrammarIssues, MissingSections, PlagiarismNote, Suggestions
     )
     OUTPUT INSERTED.*
     VALUES (
       @projectId, @cmid, @fileName, @fileType, @summary, @mainTopic,
       @keyPoints, @objectives, @qualityScore, @relatedToProject,
       @grammarIssues, @missingSections, @plagiarismNote, @suggestions
     )`,
    {
      projectId: projectId || null,
      cmid: conversationMessageId,
      fileName,
      fileType,
      summary: analysis.summary,
      mainTopic: analysis.mainTopic,
      keyPoints: JSON.stringify(analysis.keyPoints),
      objectives: JSON.stringify(analysis.objectives),
      qualityScore: analysis.qualityScore,
      relatedToProject: analysis.relatedToProject ? 1 : 0,
      grammarIssues: JSON.stringify(analysis.grammarIssues),
      missingSections: JSON.stringify(analysis.missingSections),
      plagiarismNote: analysis.plagiarismNote,
      suggestions: JSON.stringify(analysis.suggestions),
    }
  );
  return result.recordset[0];
}

/** Sync project-linked conversations for current user */
router.post('/sync-projects', async (req, res) => {
  try {
    const result = await syncUserProjectConversations(req.user.userId, req.user.role);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Could not synchronize project conversations' });
  }
});

/** List conversations for current user */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.ConversationId, c.ConversationType, c.ProjectId, c.Title, c.IsArchived, c.UpdatedAt,
              p.Title AS ProjectTitle,
              (SELECT COUNT(*) FROM ConversationMessages cm
               WHERE cm.ConversationId = c.ConversationId AND cm.IsRead = 0 AND cm.SenderId <> @uid) AS UnreadCount
       FROM Conversations c
       JOIN ConversationMembers m ON m.ConversationId = c.ConversationId AND m.UserId = @uid
       LEFT JOIN Projects p ON c.ProjectId = p.ProjectId
       ${req.user.role === 'admin' ? "WHERE c.ConversationType = 'student_direct'" : ''}
       ORDER BY c.UpdatedAt DESC`,
      { uid: req.user.userId }
    );
    res.json({ conversations: result.recordset });
  } catch (err) {
    sendError(res, err);
  }
});

/** Create or find conversation */
router.post('/', async (req, res) => {
  try {
    let { type, projectId, participantIds, title } = req.body;
    const validTypes = ['teacher_student', 'student_direct', 'project_group'];
    if (req.user.role === 'admin') {
      type = 'student_direct';
      projectId = null;
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid conversation type' });
    }
    if (req.user.role === 'admin' && type !== 'student_direct') {
      return res.status(403).json({ error: 'Admin can only start direct messages with students or teachers' });
    }

    const hasProjectId = projectId != null && projectId !== '';
    const projectScoped = type === 'project_group' || (type === 'teacher_student' && hasProjectId);
    if (projectScoped) {
      projectId = Number(projectId);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({ error: 'A valid project is required for this conversation type' });
      }
      if (!(await userCanAccessProject(req.user, projectId))) {
        return res.status(403).json({ error: 'Not authorized for this project' });
      }
      // Project conversation membership is always derived from authoritative project records.
      participantIds = [];
    } else if (!Array.isArray(participantIds)) {
      participantIds = [];
    } else if (participantIds.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) {
      return res.status(400).json({ error: 'Invalid participant' });
    }

    const members = new Set([req.user.userId, ...(participantIds || [])].map(Number));
    if ((type === 'student_direct' || (type === 'teacher_student' && !projectScoped)) && members.size !== 2) {
      return res.status(400).json({ error: 'Direct chat requires exactly one other person' });
    }

    if (participantIds?.length === 1 && !projectId) {
      const otherId = Number(participantIds[0]);
      const other = await query('SELECT Role FROM Users WHERE UserId = @id AND IsActive = 1', { id: otherId });
      if (!other.recordset.length) return res.status(404).json({ error: 'User not found' });
      if (!canUsersChat(req.user.role, other.recordset[0].Role)) {
        return res.status(403).json({ error: 'You cannot message this user' });
      }
      const lookupType = req.user.role === 'admin'
        ? 'student_direct'
        : (type || directChatType(req.user.role, other.recordset[0].Role));
      const existingId = req.user.role === 'admin'
        ? await findExistingDirectConversationBetween(query, req.user.userId, otherId)
        : await findExistingDirectConversation(query, req.user.userId, otherId, lookupType);
      if (existingId) return res.json({ conversationId: existingId, existing: true });
    }

    if (participantIds?.length) {
      for (const pid of participantIds) {
        const other = await query('SELECT Role FROM Users WHERE UserId = @id', { id: Number(pid) });
        if (!other.recordset.length) return res.status(404).json({ error: 'User not found' });
        if (!canUsersChat(req.user.role, other.recordset[0].Role)) {
          return res.status(403).json({ error: 'You cannot message this user' });
        }
      }
    }

    if (type === 'teacher_student' && projectScoped) {
      const projectMembers = await getProjectParticipantIds(projectId);
      const proj = await query(
        'SELECT AssignedByTeacherId, OwnerStudentId FROM Projects WHERE ProjectId = @pid',
        { pid: projectId }
      );
      const p = proj.recordset[0];
      if (!p) return res.status(404).json({ error: 'Project not found' });
      members.clear();
      if (projectMembers.includes(Number(p.AssignedByTeacherId))) members.add(Number(p.AssignedByTeacherId));
      if (projectMembers.includes(Number(p.OwnerStudentId))) members.add(Number(p.OwnerStudentId));
      if (!members.has(Number(req.user.userId))) {
        return res.status(403).json({ error: 'Only the project owner or assigned teacher can use this conversation' });
      }

      const existing = await query(
        `SELECT c.ConversationId FROM Conversations c
         WHERE c.ConversationType = 'teacher_student' AND c.ProjectId = @pid`,
        { pid: projectId }
      );
      if (existing.recordset.length) {
        const conversationId = existing.recordset[0].ConversationId;
        await reconcileMembers(conversationId, [...members]);
        return res.json({ conversationId, existing: true });
      }
    }

    if (type === 'project_group') {
      members.clear();
      for (const userId of await getProjectParticipantIds(projectId)) members.add(userId);
      const existing = await query(
        `SELECT ConversationId FROM Conversations
         WHERE ConversationType = 'project_group' AND ProjectId = @pid`,
        { pid: projectId }
      );
      if (existing.recordset.length) {
        const conversationId = existing.recordset[0].ConversationId;
        await reconcileMembers(conversationId, [...members]);
        return res.json({ conversationId, existing: true });
      }
    }

    const ins = await query(
      `INSERT INTO Conversations (ConversationType, ProjectId, Title, CreatedBy)
       OUTPUT INSERTED.ConversationId
       VALUES (@type, @projectId, @title, @createdBy)`,
      {
        type,
        projectId: projectId || null,
        title: title || null,
        createdBy: req.user.userId,
      }
    );
    const conversationId = ins.recordset[0].ConversationId;
    for (const uid of members) {
      await query(
        `INSERT INTO ConversationMembers (ConversationId, UserId) VALUES (@cid, @uid)`,
        { cid: conversationId, uid }
      );
    }
    res.status(201).json({ conversationId, existing: false });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    if (!(await isMember(req.user.userId, conversationId))) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const convMeta = await query(
      'SELECT ConversationType FROM Conversations WHERE ConversationId = @cid',
      { cid: conversationId }
    );
    if (!convMeta.recordset.length) return res.status(404).json({ error: 'Conversation not found' });
    if (!adminCanViewConversationType(convMeta.recordset[0].ConversationType, req.user.role)) {
      return res.status(403).json({ error: 'Teacher–student conversations are private' });
    }

    const result = await query(
      `SELECT cm.*, u.FirstName + ' ' + u.LastName AS SenderName, u.Role AS SenderRole, u.UniversityId AS SenderUniversityId
       FROM ConversationMessages cm
       JOIN Users u ON cm.SenderId = u.UserId
       WHERE cm.ConversationId = @cid
       ORDER BY cm.SentAt ASC`,
      { cid: conversationId }
    );

    await query(
      `UPDATE ConversationMessages SET IsRead = 1
       WHERE ConversationId = @cid AND SenderId <> @uid`,
      { cid: conversationId, uid: req.user.userId }
    );

    const analyses = await query(
      `SELECT * FROM DocumentAnalyses WHERE ConversationMessageId IN (
         SELECT ConversationMessageId FROM ConversationMessages WHERE ConversationId = @cid
       )`,
      { cid: conversationId }
    );
    const analysisByMsg = Object.fromEntries(
      analyses.recordset.map(a => [a.ConversationMessageId, a])
    );

    res.json({
      messages: result.recordset.map(m => ({
        ...m,
        documentAnalysis: analysisByMsg[m.ConversationMessageId] || null,
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:conversationId/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    const { content, attachmentType, attachmentName, attachmentData } = req.body;

    if (!(await isMember(req.user.userId, conversationId))) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const convCheck = await query(
      'SELECT ConversationType FROM Conversations WHERE ConversationId = @cid',
      { cid: conversationId }
    );
    if (!convCheck.recordset.length) return res.status(404).json({ error: 'Conversation not found' });
    if (!adminCanViewConversationType(convCheck.recordset[0].ConversationType, req.user.role)) {
      return res.status(403).json({ error: 'Teacher–student conversations are private' });
    }

    const text = content?.trim() || '';
    const hasAttachment = attachmentData && attachmentType;
    if (!text && !hasAttachment) {
      return res.status(400).json({ error: 'Message or attachment required' });
    }
    let attachment = null;
    if (hasAttachment) {
      if (!['image', 'video', 'file'].includes(attachmentType)) {
        return res.status(400).json({ error: 'Invalid attachment type' });
      }
      attachment = validateDataUrlAttachment({ data: attachmentData, name: attachmentName });
      const categoryMatches = attachmentType === 'image'
        ? attachment.mime.startsWith('image/')
        : attachmentType === 'video'
          ? attachment.mime.startsWith('video/')
          : !attachment.mime.startsWith('image/') && !attachment.mime.startsWith('video/');
      if (!categoryMatches) {
        return res.status(400).json({ error: 'Attachment category does not match the file type' });
      }
    }
    const safeAttachmentName = attachment?.name || null;
    const safeAttachmentData = attachment?.data || null;

    const conv = await query(
      'SELECT ProjectId, ConversationType FROM Conversations WHERE ConversationId = @cid',
      { cid: conversationId }
    );
    const projectId = conv.recordset[0]?.ProjectId;

    const ins = await query(
      `INSERT INTO ConversationMessages (ConversationId, SenderId, Content, AttachmentType, AttachmentName, AttachmentData)
       OUTPUT INSERTED.*
       VALUES (@cid, @senderId, @content, @attachmentType, @attachmentName, @attachmentData)`,
      {
        cid: conversationId,
        senderId: req.user.userId,
        content: text,
        attachmentType: hasAttachment ? attachmentType : null,
        attachmentName: safeAttachmentName,
        attachmentData: safeAttachmentData,
      }
    );
    const msg = ins.recordset[0];

    await query(
      'UPDATE Conversations SET UpdatedAt = SYSUTCDATETIME() WHERE ConversationId = @cid',
      { cid: conversationId }
    );

    let documentAnalysis = null;
    const senderRole = req.user.role;
    const shouldAnalyzeForTeacher = senderRole === 'student' && await conversationHasTeacher(query, conversationId);

    let projectTitle = '';
    let projectAbstract = '';
    if (projectId) {
      const p = await query('SELECT Title, Abstract FROM Projects WHERE ProjectId = @pid', { pid: projectId });
      if (p.recordset.length) {
        projectTitle = p.recordset[0].Title;
        projectAbstract = p.recordset[0].Abstract || '';
      }
    }

    if (shouldAnalyzeForTeacher) {
      if (hasAttachment && ['file', 'image', 'video'].includes(attachmentType)) {
        const analysis = await analyzeAttachment({
          fileName: safeAttachmentName,
          attachmentData: safeAttachmentData,
          attachmentType,
          projectTitle,
          projectAbstract,
        });
        documentAnalysis = await saveDocumentAnalysis({
          projectId,
          conversationMessageId: msg.ConversationMessageId,
          fileName: safeAttachmentName,
          fileType: safeAttachmentName.split('.').pop()?.toLowerCase() || attachmentType,
          analysis,
        });
      } else if (text) {
        const analysis = await analyzeTextContent(text, { projectTitle, projectAbstract, fileName: 'Student message' });
        documentAnalysis = await saveDocumentAnalysis({
          projectId,
          conversationMessageId: msg.ConversationMessageId,
          fileName: 'Text message',
          fileType: 'text',
          analysis,
        });
      }
    } else if (hasAttachment && attachmentType === 'file') {
      const analysis = await analyzeAttachment({
        fileName: safeAttachmentName,
        attachmentData: safeAttachmentData,
        attachmentType: 'file',
        projectTitle,
        projectAbstract,
      });
      documentAnalysis = await saveDocumentAnalysis({
        projectId,
        conversationMessageId: msg.ConversationMessageId,
        fileName: safeAttachmentName,
        fileType: safeAttachmentName.split('.').pop()?.toLowerCase() || 'file',
        analysis,
      });
    }

    if (shouldAnalyzeForTeacher && projectId) {
      runProjectAIAnalysis(projectId, { notifyTeacher: false }).catch(err => {
        console.warn('[AI] Conversation-triggered analysis failed:', err.message);
      });
    }

    const members = await query(
      'SELECT UserId FROM ConversationMembers WHERE ConversationId = @cid AND UserId <> @senderId',
      { cid: conversationId, senderId: req.user.userId }
    );
    const sender = await query(
      `SELECT FirstName + ' ' + LastName AS Name FROM Users WHERE UserId = @id`,
      { id: req.user.userId }
    );
    const preview = text || `Sent file: ${safeAttachmentName}`;
    for (const m of members.recordset) {
      await notifyMessageReceived({
        receiverId: m.UserId,
        senderName: sender.recordset[0]?.Name || 'Someone',
        projectId,
        preview,
        conversationId,
      });
    }

    try {
      const { emitToConversation, emitToUser } = await import('../realtime/socket.js');
      const payload = {
        conversationId,
        message: {
          ...msg,
          SenderName: sender.recordset[0]?.Name || 'Someone',
          SenderRole: req.user.role,
        },
        documentAnalysis,
      };
      emitToConversation(conversationId, 'message:new', payload);
      for (const m of members.recordset) {
        emitToUser(m.UserId, 'message:new', payload);
      }
    } catch {
      /* realtime optional */
    }

    res.status(201).json({ message: msg, documentAnalysis });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status ? err.message : 'Could not send this message',
    });
  }
});

/** Teacher: list archived / all project conversations */
router.get('/project/:projectId/history', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'Teacher–student project chats are private' });
    }
    const projectId = parseInt(req.params.projectId, 10);
    const user = req.user;
    if (user.role === 'student') {
      const ok = await studentCanAccessProject(user.userId, projectId);
      if (!ok) return res.status(403).json({ error: 'Not authorized' });
    } else if (user.role === 'teacher') {
      const p = await query(
        'SELECT 1 FROM Projects WHERE ProjectId = @pid AND AssignedByTeacherId = @uid',
        { pid: projectId, uid: user.userId }
      );
      if (!p.recordset.length) return res.status(403).json({ error: 'Not your project' });
    }

    const convs = await query(
      `SELECT ConversationId, ConversationType, Title, IsArchived, UpdatedAt
       FROM Conversations WHERE ProjectId = @pid ORDER BY UpdatedAt DESC`,
      { pid: projectId }
    );
    res.json({ conversations: convs.recordset });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
