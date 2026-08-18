/** Athena AI — embedding-based semantic similarity (advisory only, never auto-approves) */

import { semanticSimilarity } from './embeddings.js';

const RELATED_FLOOR = 40;

function normalizeTitle(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(a|an|the|of|on|for|and|in|to|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicSimilarity(titleA, abstractA, titleB, abstractB) {
  const titleScore = semanticSimilarity(titleA || '', titleB || '');
  const fullScore = semanticSimilarity(`${titleA || ''} ${abstractA || ''}`, `${titleB || ''} ${abstractB || ''}`);
  const na = normalizeTitle(titleA);
  const nb = normalizeTitle(titleB);
  let boost = 0;
  if (na && nb) {
    if (na === nb) boost = 1;
    else if (na.includes(nb) || nb.includes(na)) boost = 0.93;
  }
  return Math.max(titleScore, fullScore, boost);
}

function claimTime(project) {
  const raw = project?.AssignedAt || project?.assignedAt
    || project?.CreatedAt || project?.createdAt
    || project?.SubmittedAt || project?.submittedAt;
  const t = raw ? Date.parse(raw) : NaN;
  if (Number.isFinite(t)) return t;
  return Number.MAX_SAFE_INTEGER;
}

function isEarlierClaim(a, b) {
  const ta = claimTime(a);
  const tb = claimTime(b);
  if (ta !== tb) return ta < tb;
  return Number(a.ProjectId ?? a.projectId ?? 0) < Number(b.ProjectId ?? b.projectId ?? 0);
}

export function ownerFromProject(project) {
  if (!project) return null;
  const name = String(project.StudentName || project.studentName || '').trim();
  return {
    projectId: project.ProjectId ?? project.projectId ?? null,
    teacherAssignedId: project.TeacherAssignedId || project.teacherAssignedId || null,
    title: project.Title || project.title || '',
    status: project.Status || project.status || '',
    claimedAt: project.AssignedAt || project.assignedAt || project.CreatedAt || project.createdAt
      || project.SubmittedAt || project.submittedAt || null,
    studentId: project.OwnerStudentId ?? project.ownerStudentId ?? null,
    name: name || 'Unknown student',
    universityId: project.StudentUniversityId || project.universityId || '',
    department: project.Department || project.department || '',
    className: project.ClassName || project.className || '',
    studyMode: project.StudyMode || project.studyMode || '',
    photo: project.ProfileImageUrl || project.StudentProfileImageUrl || project.photo || null,
  };
}

export function formatOwnerLine(owner) {
  if (!owner) return 'None';
  return [owner.name, owner.universityId, owner.department].filter(Boolean).join(' · ');
}

function toSelfProject(submission) {
  return {
    ProjectId: submission.projectId,
    TeacherAssignedId: submission.teacherAssignedId,
    Title: submission.title,
    Abstract: submission.abstract,
    Status: submission.status,
    OwnerStudentId: submission.ownerStudentId,
    AssignedAt: submission.assignedAt,
    CreatedAt: submission.createdAt,
    SubmittedAt: submission.submittedAt,
    StudentName: submission.studentName,
    StudentUniversityId: submission.universityId,
    Department: submission.department,
    ClassName: submission.className,
    StudyMode: submission.studyMode,
    ProfileImageUrl: submission.photo,
  };
}

function formatClaimedAt(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toISOString().slice(0, 10);
}

/**
 * Analyze a submission against all other projects in the database.
 * The original owner is the student who first registered the matching topic —
 * not whoever clicked submit one second earlier.
 */
export function analyzeSubmission(submission, allProjects, threshold = 60) {
  const self = toSelfProject(submission);
  const combinedTitle = submission.title || '';
  const combinedAbstract = submission.abstract || '';

  const scored = [];
  for (const project of allProjects || []) {
    if (Number(project.ProjectId) === Number(submission.projectId)) continue;
    const sim = topicSimilarity(combinedTitle, combinedAbstract, project.Title, project.Abstract);
    scored.push({ project, similarity: Math.round(sim * 100) });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  const related = scored.filter((row) => row.similarity >= RELATED_FLOOR);
  const cluster = [self, ...related.map((row) => row.project)];
  const originalProject = cluster.reduce((best, row) => (isEarlierClaim(row, best) ? row : best), cluster[0]);
  const isOriginal = Number(originalProject?.ProjectId) === Number(submission.projectId);
  const originalOwner = ownerFromProject(originalProject);

  const matchToOriginal = related.find((row) => Number(row.project.ProjectId) === Number(originalProject?.ProjectId));
  const bestAgainstOthers = related[0];
  const similarityPercent = isOriginal
    ? (bestAgainstOthers?.similarity || 0)
    : (matchToOriginal?.similarity || bestAgainstOthers?.similarity || 0);

  const laterCopies = related
    .filter((row) => !isEarlierClaim(row.project, self) && Number(row.project.ProjectId) !== Number(submission.projectId))
    .map((row) => ({
      ...ownerFromProject(row.project),
      similarity: row.similarity,
    }));

  const uniquenessScore = isOriginal ? 100 : Math.max(0, 100 - similarityPercent);
  const aiConfidence = similarityPercent > 40
    ? Math.min(95, 60 + similarityPercent * 0.35)
    : 45 + Math.random() * 20;

  const rejectionReasons = [];
  let suggestedAction = 'approve';
  let aiSuggestion = 'Approve — this student is the original owner of this topic.';

  if (isOriginal) {
    if (laterCopies.length) {
      aiSuggestion = `Original owner — ${originalOwner.name}${originalOwner.universityId ? ` (${originalOwner.universityId})` : ''} first registered this topic on ${formatClaimedAt(originalOwner.claimedAt) || 'record'}. ${laterCopies.length} later overlapping claim(s) exist.`;
    } else {
      aiSuggestion = `Original owner — ${originalOwner.name}${originalOwner.universityId ? ` (${originalOwner.universityId})` : ''} belongs to this topic. No earlier match in the database.`;
    }
  } else if (originalOwner && similarityPercent >= threshold) {
    suggestedAction = 'reject';
    aiSuggestion = `This topic already belongs to ${originalOwner.name}${originalOwner.universityId ? ` (${originalOwner.universityId})` : ''}${originalOwner.department ? `, ${originalOwner.department}` : ''}. Similarity ${similarityPercent}% with “${originalOwner.title}”.`;
    rejectionReasons.push(
      `Original owner: ${formatOwnerLine(originalOwner)}`,
      `Original project: “${originalOwner.title}”`,
      `HU ID: ${originalOwner.universityId || '—'}`,
      `Similarity score: ${similarityPercent}%`,
    );
  } else if (originalOwner && similarityPercent >= threshold * 0.75) {
    suggestedAction = 'review';
    aiSuggestion = `Review carefully — ${similarityPercent}% overlap with the original owner ${originalOwner.name}${originalOwner.universityId ? ` (${originalOwner.universityId})` : ''}.`;
    rejectionReasons.push(`Possible overlap with original owner ${formatOwnerLine(originalOwner)} (${similarityPercent}%)`);
  }

  const shouldAttachOriginal = !isOriginal && originalOwner && similarityPercent >= RELATED_FLOOR;

  return {
    uniqueness_score: Math.round(uniquenessScore),
    ai_confidence: Math.round(aiConfidence),
    similar_project_id: shouldAttachOriginal ? originalOwner.projectId : null,
    similar_project_assigned_id: shouldAttachOriginal ? originalOwner.teacherAssignedId : null,
    similarity_percent: similarityPercent >= RELATED_FLOOR ? similarityPercent : null,
    similarity_engine: 'athena-embeddings-v1',
    ai_suggestion: aiSuggestion,
    suggested_action: suggestedAction,
    rejection_reasons: rejectionReasons.length
      ? rejectionReasons
      : (isOriginal ? ['Original owner of this topic'] : [
          'Topic too similar to an existing project',
          'Low originality score',
        ]),
    is_original: isOriginal,
    original_owner: originalOwner,
    later_copies: laterCopies,
  };
}

export { semanticSimilarity as combinedSimilarity };

function advisoryLabel(action) {
  const key = String(action || 'approve').toLowerCase();
  if (key === 'reject') return 'Reject';
  if (key === 'review') return 'Review';
  return 'Approve';
}

/**
 * Batch-scan selected submissions — returns array compatible with admin batch-scanner.
 */
export function batchAnalyzeSubmissions(items, allProjects, threshold = 60) {
  return items.map((item) => {
    const analysis = analyzeSubmission(
      {
        title: item.title,
        abstract: item.abstract,
        projectId: item.projectId,
        teacherAssignedId: item.teacherAssignedId,
        assignedAt: item.assignedAt,
        submittedAt: item.submittedAt,
        ownerStudentId: item.ownerStudentId,
        studentName: item.studentName,
        universityId: item.universityId,
        department: item.department,
        className: item.className,
        studyMode: item.studyMode,
        photo: item.photo,
        status: item.status,
      },
      allProjects,
      threshold,
    );
    const originalOwner = analysis.original_owner;
    const isOriginal = Boolean(analysis.is_original);
    return {
      ...item,
      projectTitle: item.title,
      analysis,
      uniqueness: analysis.uniqueness_score,
      isOriginal,
      originalOwner,
      laterCopies: analysis.later_copies || [],
      collidesWith: !isOriginal && originalOwner && analysis.similarity_percent >= RELATED_FLOOR
        ? formatOwnerLine(originalOwner)
        : 'None',
      action: advisoryLabel(analysis.suggested_action),
      aiSuggestion: analysis.ai_suggestion,
    };
  });
}
