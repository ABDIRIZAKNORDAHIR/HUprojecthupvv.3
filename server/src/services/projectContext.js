import { query } from '../db.js';
import { analyzeAttachment, analyzeTextContent } from './documentAI.js';

/** Collect everything the student sent for one project */
export async function buildProjectContext(projectId) {
  const proj = await query(
    `SELECT p.ProjectId, p.AssignedByTeacherId, p.Title, p.Abstract, p.Description, p.Status,
            s.FirstName + ' ' + s.LastName AS StudentName, s.UniversityId AS StudentUniversityId
     FROM Projects p
     LEFT JOIN Users s ON p.OwnerStudentId = s.UserId
     WHERE p.ProjectId = @pid`,
    { pid: projectId }
  );
  if (!proj.recordset.length) return null;
  const p = proj.recordset[0];

  const submissions = await query(
    `SELECT Title, Abstract, Content, SubmittedAt FROM Submissions
     WHERE ProjectId = @pid ORDER BY SubmittedAt DESC`,
    { pid: projectId }
  );

  const messages = await query(
    `SELECT m.Content, m.AttachmentName, m.AttachmentType, m.AttachmentData, m.SentAt,
            u.FirstName + ' ' + u.LastName AS SenderName, u.Role AS SenderRole
     FROM Messages m JOIN Users u ON m.SenderId = u.UserId
     WHERE m.ProjectId = @pid AND u.Role = 'student'
     ORDER BY m.SentAt ASC`,
    { pid: projectId }
  );

  const convFiles = await query(
    `SELECT cm.Content, cm.AttachmentName, cm.AttachmentType, cm.AttachmentData, cm.SentAt,
            u.FirstName + ' ' + u.LastName AS SenderName, u.Role AS SenderRole
     FROM ConversationMessages cm
     JOIN Conversations c ON cm.ConversationId = c.ConversationId
     JOIN Users u ON cm.SenderId = u.UserId
     WHERE c.ProjectId = @pid AND u.Role = 'student'
     ORDER BY cm.SentAt ASC`,
    { pid: projectId }
  );

  const fileExtractions = [];
  for (const m of [...messages.recordset, ...convFiles.recordset]) {
    if (m.AttachmentName && m.AttachmentData) {
      try {
        const type = m.AttachmentType === 'image' ? 'image' : m.AttachmentType === 'video' ? 'video' : 'file';
        const a = await analyzeAttachment({
          fileName: m.AttachmentName,
          attachmentData: m.AttachmentData,
          attachmentType: type,
          projectTitle: p.Title,
          projectAbstract: p.Abstract,
        });
        fileExtractions.push({ fileName: m.AttachmentName, summary: a.summary });
      } catch {
        fileExtractions.push({ fileName: m.AttachmentName, summary: '(Could not read file)' });
      }
    }
    if (m.Content?.trim()) {
      fileExtractions.push({ fileName: 'Student text', summary: m.Content.slice(0, 2000) });
    }
  }

  const parts = [];
  parts.push(`PROJECT TITLE: ${p.Title}`);
  if (p.Abstract) parts.push(`ABSTRACT:\n${p.Abstract}`);
  if (p.Description) parts.push(`DESCRIPTION:\n${p.Description}`);
  parts.push(`STATUS: ${p.Status}`);
  parts.push(`STUDENT: ${p.StudentName || 'Unknown'} (${p.StudentUniversityId || ''})`);

  for (const sub of submissions.recordset) {
    parts.push(`\n--- SUBMISSION ---`);
    parts.push(`Title: ${sub.Title}`);
    if (sub.Abstract) parts.push(`Abstract: ${sub.Abstract}`);
    if (sub.Content) parts.push(`Content:\n${sub.Content}`);
  }

  for (const m of messages.recordset) {
    if (m.Content?.trim()) parts.push(`\n--- STUDENT MESSAGE ---\n${m.Content}`);
    if (m.AttachmentName) parts.push(`[File attached: ${m.AttachmentName}]`);
  }

  for (const f of fileExtractions) {
    parts.push(`\n--- FILE "${f.fileName}" ---\n${f.summary}`);
  }

  return {
    projectId,
    title: p.Title,
    teacherId: p.AssignedByTeacherId,
    studentName: p.StudentName,
    fullContext: parts.join('\n').slice(0, 28000),
  };
}

export async function assertTeacherOwnsProject(userId, projectId) {
  const r = await query(
    'SELECT 1 FROM Projects WHERE ProjectId = @pid AND AssignedByTeacherId = @uid',
    { pid: projectId, uid: userId }
  );
  return r.recordset.length > 0;
}
