import { Router } from 'express';
import { query } from '../db.js';
import { studentCanAccessProject } from '../utils/projectAccess.js';
import { authMiddleware, attachUserDetails } from '../middleware/auth.js';
import { notifyMessageReceived } from '../services/notify.js';
import { analyzeAttachment, analyzeTextContent } from '../services/documentAI.js';
import { runProjectAIAnalysis } from '../services/projectAIService.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware, attachUserDetails);

const MAX_ATTACHMENT = 4_000_000;

async function canAccessProject(user, projectId) {
  if (user.role === 'admin') return false;
  const project = await query(
    'SELECT AssignedByTeacherId, OwnerStudentId FROM Projects WHERE ProjectId = @projectId',
    { projectId }
  );
  if (!project.recordset.length) return false;
  const p = project.recordset[0];
  if (user.role === 'teacher' && p.AssignedByTeacherId === user.userId) return true;
  if (user.role === 'student') {
    return await studentCanAccessProject(user.userId, projectId);
  }
  return false;
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
    res.status(500).json({ error: err.message });
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

    if (hasAttachment) {
      if (!['image', 'video', 'file'].includes(attachmentType)) {
        return res.status(400).json({ error: 'Invalid attachment type' });
      }
      if (typeof attachmentData !== 'string' || attachmentData.length > MAX_ATTACHMENT) {
        return res.status(400).json({ error: 'Attachment too large (max ~4MB)' });
      }
    }

    const project = await query(
      `SELECT p.AssignedByTeacherId, p.OwnerStudentId FROM Projects p WHERE p.ProjectId = @projectId`,
      { projectId }
    );
    if (!project.recordset.length) return res.status(404).json({ error: 'Project not found' });
    const p = project.recordset[0];

    let toUserId = receiverId;
    if (!toUserId) {
      if (req.user.role === 'admin') {
        toUserId = p.OwnerStudentId || p.AssignedByTeacherId;
      } else if (req.user.userId === p.AssignedByTeacherId) {
        toUserId = p.OwnerStudentId;
      } else if (req.user.userId === p.OwnerStudentId) {
        toUserId = p.AssignedByTeacherId;
      } else {
        toUserId = p.AssignedByTeacherId;
      }
    }

    if (!toUserId) return res.status(400).json({ error: 'Could not determine message recipient' });

    const scope = messageScope === 'project_group' ? 'project_group' : 'teacher_student';

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
        attachmentName: hasAttachment ? (attachmentName || 'attachment') : null,
        attachmentData: hasAttachment ? attachmentData : null,
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
          fileName: attachmentName,
          attachmentData,
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
            fileName: attachmentName,
            fileType: attachmentName.split('.').pop()?.toLowerCase() || attachmentType,
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
        fileName: attachmentName,
        attachmentData,
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
          fileName: attachmentName,
          fileType: attachmentName.split('.').pop()?.toLowerCase() || 'file',
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

    if (scope === 'teacher_student' || toUserId) {
      await notifyMessageReceived({
        receiverId: toUserId,
        senderName: sender.recordset[0]?.SenderName || 'Someone',
        projectId,
        preview: text || `File: ${attachmentName}`,
      });
    } else if (scope === 'project_group') {
      const members = await query(
        `SELECT DISTINCT UserId FROM (
           SELECT OwnerStudentId AS UserId FROM Projects WHERE ProjectId = @pid
           UNION SELECT StudentId FROM ProjectMembers WHERE ProjectId = @pid
           UNION SELECT AssignedByTeacherId FROM Projects WHERE ProjectId = @pid
         ) x WHERE UserId IS NOT NULL AND UserId <> @senderId`,
        { pid: projectId, senderId: req.user.userId }
      );
      for (const m of members.recordset) {
        await notifyMessageReceived({
          receiverId: m.UserId,
          senderName: sender.recordset[0]?.SenderName || 'Someone',
          projectId,
          preview: text || `File: ${attachmentName}`,
        });
      }
    }

    res.status(201).json({
      message: { ...row, ...sender.recordset[0] },
      documentAnalysis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
