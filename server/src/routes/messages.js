import { Router } from 'express';
import { query } from '../db.js';
import { sendError } from '../utils/httpError.js';
import { getProjectParticipantIds, userCanAccessProject } from '../utils/projectAccess.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import { notifyMessageReceived } from '../services/notify.js';
import { analyzeAttachment, analyzeTextContent } from '../services/documentAI.js';
import { runProjectAIAnalysis } from '../services/projectAIService.js';
import { validateDataUrlAttachment } from '../utils/attachments.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware, attachUserDetails);

async function canAccessProject(user, projectId) {
  return userCanAccessProject(user, projectId);
}

router.get('/', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await query(
      `SELECT m.MessageId, m.Content, m.SentAt, m.IsRead, m.SenderId, m.ReceiverId,
              m.MessageScope, m.AttachmentType, m.AttachmentName,
              CASE WHEN m.AttachmentData IS NOT NULL THEN 1 ELSE 0 END AS HasAttachment,
              m.AttachmentData,
              sender.FirstName + ' ' + sender.LastName AS SenderName, sender.Role AS SenderRole,
              sender.UniversityId AS SenderUniversityId
       FROM Messages m
       JOIN Users sender ON m.SenderId = sender.UserId
       WHERE m.ProjectId = @projectId
         AND (
           @role IN ('admin','teacher')
           OR m.MessageScope = 'project_group'
           OR m.SenderId = @userId OR m.ReceiverId = @userId
         )
       ORDER BY m.SentAt ASC`,
      { projectId, userId: req.user.userId, role: req.user.role }
    );

    await query(
      `UPDATE Messages SET IsRead = 1 WHERE ProjectId = @projectId AND ReceiverId = @userId`,
      { projectId, userId: req.user.userId }
    );

    const analyses = await query(
      `SELECT * FROM DocumentAnalyses WHERE ProjectId = @pid AND MessageId IS NOT NULL`,
      { pid: projectId }
    );
    const analysisByMsg = Object.fromEntries(
      analyses.recordset.map(a => [a.MessageId, a])
    );

    res.json({
      messages: result.recordset.map(m => ({
        ...m,
        documentAnalysis: analysisByMsg[m.MessageId] || null,
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { content, receiverId, attachmentType, attachmentName, attachmentData, messageScope } = req.body;

    if (!(await canAccessProject(req.user, projectId))) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const text = content?.trim() || '';
    const hasAttachment = attachmentData && attachmentType;

    if (!text && !hasAttachment) {
      return res.status(400).json({ error: 'Message text or attachment required' });
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

    const project = await query(
      `SELECT p.AssignedByTeacherId, p.OwnerStudentId FROM Projects p WHERE p.ProjectId = @projectId`,
      { projectId }
    );
    if (!project.recordset.length) return res.status(404).json({ error: 'Project not found' });
    const p = project.recordset[0];

    const scope = messageScope === 'project_group' ? 'project_group' : 'teacher_student';
    const participantIds = await getProjectParticipantIds(projectId);
    const studentIds = await getProjectParticipantIds(projectId, { includeTeacher: false });
    const teacherId = Number(p.AssignedByTeacherId);
    let toUserId = receiverId == null || receiverId === '' ? null : Number(receiverId);

    if (toUserId != null && (!Number.isInteger(toUserId) || toUserId <= 0)) {
      return res.status(400).json({ error: 'Invalid message recipient' });
    }

    if (scope === 'teacher_student') {
      if (req.user.role === 'teacher') {
        toUserId = toUserId || studentIds.find(id => id !== Number(req.user.userId));
        if (!studentIds.includes(toUserId)) {
          return res.status(403).json({ error: 'Recipient is not a student on this project' });
        }
      } else {
        toUserId = toUserId || teacherId;
        if (toUserId !== teacherId || !participantIds.includes(teacherId)) {
          return res.status(403).json({ error: 'Messages must be sent to the assigned teacher' });
        }
      }
    } else {
      toUserId = toUserId || participantIds.find(id => id !== Number(req.user.userId));
      if (!toUserId || toUserId === Number(req.user.userId) || !participantIds.includes(toUserId)) {
        return res.status(403).json({ error: 'Recipient is not a participant in this project' });
      }
    }

    const result = await query(
      `INSERT INTO Messages (ProjectId, SenderId, ReceiverId, Content, AttachmentType, AttachmentName, AttachmentData, MessageScope)
       OUTPUT INSERTED.MessageId, INSERTED.Content, INSERTED.SentAt, INSERTED.SenderId, INSERTED.ReceiverId,
              INSERTED.AttachmentType, INSERTED.AttachmentName, INSERTED.AttachmentData, INSERTED.MessageScope
       VALUES (@projectId, @senderId, @receiverId, @content, @attachmentType, @attachmentName, @attachmentData, @scope)`,
      {
        projectId,
        senderId: req.user.userId,
        receiverId: toUserId,
        content: text,
        attachmentType: hasAttachment ? attachmentType : null,
        attachmentName: safeAttachmentName,
        attachmentData: safeAttachmentData,
        scope,
      }
    );

    const row = result.recordset[0];
    const sender = await query(
      `SELECT FirstName + ' ' + LastName AS SenderName, Role AS SenderRole FROM Users WHERE UserId = @id`,
      { id: req.user.userId }
    );

    let documentAnalysis = null;
    const projInfo = await query('SELECT Title, Abstract FROM Projects WHERE ProjectId = @pid', { pid: projectId });
    const projectTitle = projInfo.recordset[0]?.Title;
    const projectAbstract = projInfo.recordset[0]?.Abstract;
    const senderIsStudent = req.user.role === 'student';
    const recipientIsStaff = await query(
      'SELECT Role FROM Users WHERE UserId = @id',
      { id: toUserId }
    ).then(r => ['teacher', 'admin'].includes(r.recordset[0]?.Role));

    if (senderIsStudent && recipientIsStaff) {
      if (hasAttachment && ['file', 'image', 'video'].includes(attachmentType)) {
        const analysis = await analyzeAttachment({
          fileName: safeAttachmentName,
          attachmentData: safeAttachmentData,
          attachmentType,
          projectTitle,
          projectAbstract,
        });
        const ins = await query(
          `INSERT INTO DocumentAnalyses (ProjectId, MessageId, FileName, FileType, Summary, MainTopic, KeyPoints, Objectives,
             QualityScore, RelatedToProject, GrammarIssues, MissingSections, PlagiarismNote, Suggestions)
           OUTPUT INSERTED.*
           VALUES (@pid, @mid, @fileName, @fileType, @summary, @mainTopic, @keyPoints, @objectives,
             @qualityScore, @related, @grammar, @missing, @plagiarism, @suggestions)`,
          {
            pid: projectId,
            mid: row.MessageId,
            fileName: safeAttachmentName,
            fileType: safeAttachmentName.split('.').pop()?.toLowerCase() || attachmentType,
            summary: analysis.summary,
            mainTopic: analysis.mainTopic,
            keyPoints: JSON.stringify(analysis.keyPoints),
            objectives: JSON.stringify(analysis.objectives),
            qualityScore: analysis.qualityScore,
            related: analysis.relatedToProject ? 1 : 0,
            grammar: JSON.stringify(analysis.grammarIssues),
            missing: JSON.stringify(analysis.missingSections),
            plagiarism: analysis.plagiarismNote,
            suggestions: JSON.stringify(analysis.suggestions),
          }
        );
        documentAnalysis = ins.recordset[0];
      } else if (text) {
        const analysis = await analyzeTextContent(text, { projectTitle, projectAbstract, fileName: 'message.txt' });
        const ins = await query(
          `INSERT INTO DocumentAnalyses (ProjectId, MessageId, FileName, FileType, Summary, MainTopic, KeyPoints, Objectives,
             QualityScore, RelatedToProject, GrammarIssues, MissingSections, PlagiarismNote, Suggestions)
           OUTPUT INSERTED.*
           VALUES (@pid, @mid, @fileName, @fileType, @summary, @mainTopic, @keyPoints, @objectives,
             @qualityScore, @related, @grammar, @missing, @plagiarism, @suggestions)`,
          {
            pid: projectId,
            mid: row.MessageId,
            fileName: 'Text message',
            fileType: 'text',
            summary: analysis.summary,
            mainTopic: analysis.mainTopic,
            keyPoints: JSON.stringify(analysis.keyPoints),
            objectives: JSON.stringify(analysis.objectives),
            qualityScore: analysis.qualityScore,
            related: analysis.relatedToProject ? 1 : 0,
            grammar: JSON.stringify(analysis.grammarIssues),
            missing: JSON.stringify(analysis.missingSections),
            plagiarism: analysis.plagiarismNote,
            suggestions: JSON.stringify(analysis.suggestions),
          }
        );
        documentAnalysis = ins.recordset[0];
      }

      runProjectAIAnalysis(projectId, { notifyTeacher: false }).catch(err => {
        console.warn('[AI] Message-triggered analysis failed:', err.message);
      });
    } else if (hasAttachment && attachmentType === 'file') {
      const analysis = await analyzeAttachment({
        fileName: safeAttachmentName,
        attachmentData: safeAttachmentData,
        attachmentType: 'file',
        projectTitle,
        projectAbstract,
      });
      const ins = await query(
        `INSERT INTO DocumentAnalyses (ProjectId, MessageId, FileName, FileType, Summary, MainTopic, KeyPoints, Objectives,
           QualityScore, RelatedToProject, GrammarIssues, MissingSections, PlagiarismNote, Suggestions)
         OUTPUT INSERTED.*
         VALUES (@pid, @mid, @fileName, @fileType, @summary, @mainTopic, @keyPoints, @objectives,
           @qualityScore, @related, @grammar, @missing, @plagiarism, @suggestions)`,
        {
          pid: projectId,
          mid: row.MessageId,
          fileName: safeAttachmentName,
          fileType: safeAttachmentName.split('.').pop()?.toLowerCase() || 'file',
          summary: analysis.summary,
          mainTopic: analysis.mainTopic,
          keyPoints: JSON.stringify(analysis.keyPoints),
          objectives: JSON.stringify(analysis.objectives),
          qualityScore: analysis.qualityScore,
          related: analysis.relatedToProject ? 1 : 0,
          grammar: JSON.stringify(analysis.grammarIssues),
          missing: JSON.stringify(analysis.missingSections),
          plagiarism: analysis.plagiarismNote,
          suggestions: JSON.stringify(analysis.suggestions),
        }
      );
      documentAnalysis = ins.recordset[0];
    }

    if (scope === 'project_group') {
      const members = participantIds.filter(id => id !== Number(req.user.userId));
      for (const memberId of members) {
        await notifyMessageReceived({
          receiverId: memberId,
          senderName: sender.recordset[0]?.SenderName || 'Someone',
          projectId,
          preview: text || `File: ${safeAttachmentName}`,
        });
      }
    } else {
      await notifyMessageReceived({
        receiverId: toUserId,
        senderName: sender.recordset[0]?.SenderName || 'Someone',
        projectId,
        preview: text || `File: ${safeAttachmentName}`,
      });
    }

    res.status(201).json({
      message: { ...row, ...sender.recordset[0] },
      documentAnalysis,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.status ? err.message : 'Could not send this message',
    });
  }
});

export default router;
