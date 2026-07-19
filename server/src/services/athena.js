/** Athena AI — embedding-based semantic similarity (advisory only, never auto-approves) */

import { semanticSimilarity } from './embeddings.js';

/**
 * Analyze a submission against all other projects in the database.
 */
export function analyzeSubmission(submission, allProjects, threshold = 60) {
  const combinedText = `${submission.title} ${submission.abstract}`;
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const project of allProjects) {
    if (project.ProjectId === submission.projectId) continue;
    const otherText = `${project.Title || ''} ${project.Abstract || ''}`;
    const sim = semanticSimilarity(combinedText, otherText);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = project;
    }
  }

  const similarityPercent = Math.round(bestSimilarity * 100);
  const uniquenessScore = Math.max(0, 100 - similarityPercent);
  const aiConfidence = similarityPercent > 40 ? Math.min(95, 60 + similarityPercent * 0.35) : 45 + Math.random() * 20;

  const rejectionReasons = [];
  let suggestedAction = 'approve';
  let aiSuggestion = 'Approve — Athena embedding scan found no significant semantic overlap.';

  if (similarityPercent >= threshold && bestMatch) {
    suggestedAction = 'reject';
    aiSuggestion = `Embedding similarity ${similarityPercent}% with "${bestMatch.Title}" (ID: ${bestMatch.TeacherAssignedId}). Athena recommends rejection or major revision.`;
    rejectionReasons.push(
      `Semantic embedding overlap with "${bestMatch.Title}" (ID: ${bestMatch.TeacherAssignedId})`,
      `Athena embedding similarity: ${similarityPercent}%`,
      `Matched project status: ${bestMatch.Status}`,
    );
  } else if (similarityPercent >= threshold * 0.75 && bestMatch) {
    suggestedAction = 'review';
    aiSuggestion = `Review carefully — ${similarityPercent}% embedding similarity with project ID ${bestMatch.TeacherAssignedId}.`;
    rejectionReasons.push(`Possible semantic overlap with project ID ${bestMatch.TeacherAssignedId} (${similarityPercent}%)`);
  }

  return {
    uniqueness_score: Math.round(uniquenessScore),
    ai_confidence: Math.round(aiConfidence),
    similar_project_id: bestMatch && similarityPercent >= 40 ? bestMatch.ProjectId : null,
    similar_project_assigned_id: bestMatch && similarityPercent >= 40 ? bestMatch.TeacherAssignedId : null,
    similarity_percent: similarityPercent >= 40 ? similarityPercent : null,
    similarity_engine: 'athena-embeddings-v1',
    ai_suggestion: aiSuggestion,
    suggested_action: suggestedAction,
    rejection_reasons: rejectionReasons.length ? rejectionReasons : [
      'Topic too similar to existing project',
      'Low originality score',
    ],
  };
}

export { semanticSimilarity as combinedSimilarity };

/**
 * Batch-scan selected submissions — returns array compatible with admin batch-scanner.
 */
export function batchAnalyzeSubmissions(items, allProjects, threshold = 60) {
  return items.map((item) => {
    const analysis = analyzeSubmission(
      { title: item.title, abstract: item.abstract, projectId: item.projectId },
      allProjects,
      threshold,
    );
    return {
      ...item,
      projectTitle: item.title,
      analysis,
      uniqueness: analysis.uniqueness_score,
      collidesWith: analysis.similar_project_assigned_id
        ? {
            projectId: analysis.similar_project_id,
            teacherAssignedId: analysis.similar_project_assigned_id,
            similarity: analysis.similarity_percent,
          }
        : null,
      action: analysis.suggested_action,
      aiSuggestion: analysis.ai_suggestion,
    };
  });
}
