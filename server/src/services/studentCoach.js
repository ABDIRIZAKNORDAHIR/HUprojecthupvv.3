import {
  isRealAIConfigured,
  getAIProviderInfo,
  askStudentCoachChat,
} from './aiEngine.js';
import { semanticSimilarity } from './embeddings.js';

const COACH_SYSTEM = `You are Athena Student Coach for Hormuud University ProjectHub.
Help STUDENTS improve project topics, abstracts, and plans.
Be encouraging, specific, and academic. Keep answers concise and actionable.
Never invent university policies. Suggest structure, originality tips, and next steps.
If the idea seems too similar to common topics, suggest unique angles.`;

function localCoachAdvice({ title, abstract, question }) {
  const text = `${title || ''} ${abstract || ''} ${question || ''}`.trim();
  const tips = [];
  if (!title || title.trim().length < 8) {
    tips.push('Make the title more specific — include domain, method, and target users.');
  }
  if (!abstract || abstract.trim().length < 80) {
    tips.push('Expand the abstract: problem, approach, expected outcome, and who benefits.');
  }
  if (/(app|website|system)/i.test(text) && !/(algorithm|dataset|evaluation|survey|framework)/i.test(text)) {
    tips.push('Add a research angle: evaluation method, dataset, or comparison criteria.');
  }
  tips.push('Check Project Atlas for similar titles before proposing.');
  tips.push('List 3 measurable deliverables and one risk with a mitigation plan.');

  return {
    ok: true,
    provider: 'local-coach',
    model: 'athena-rules',
    answer: [
      'Athena Coach (offline mode):',
      '',
      ...tips.map((t, i) => `${i + 1}. ${t}`),
      '',
      question
        ? `On your question (“${question.slice(0, 120)}”): focus on clarity, originality, and a realistic scope for one semester.`
        : 'Ask a follow-up question for more targeted advice.',
    ].join('\n'),
  };
}

export async function coachStudent({ title, abstract, question, history = [] }) {
  if (!isRealAIConfigured()) {
    return localCoachAdvice({ title, abstract, question });
  }

  const messages = [
    { role: 'system', content: COACH_SYSTEM },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: [
        title ? `Working title: ${title}` : null,
        abstract ? `Abstract draft:\n${abstract}` : null,
        question ? `Student question: ${question}` : 'Please review my topic and suggest improvements.',
      ].filter(Boolean).join('\n\n'),
    },
  ];

  try {
    const result = await askStudentCoachChat(messages);
    if (!result?.ok || !result.answer) {
      return localCoachAdvice({ title, abstract, question });
    }
    return result;
  } catch (err) {
    return {
      ...localCoachAdvice({ title, abstract, question }),
      warning: err.message,
      providerInfo: getAIProviderInfo(),
    };
  }
}

export function scoreTopicOriginality(title, abstract, otherProjects = []) {
  const combined = `${title || ''} ${abstract || ''}`;
  let best = 0;
  let match = null;
  for (const p of otherProjects) {
    const sim = semanticSimilarity(combined, `${p.Title || ''} ${p.Abstract || ''}`);
    if (sim > best) {
      best = sim;
      match = p;
    }
  }
  const similarityPercent = Math.round(best * 100);
  return {
    originalityScore: Math.max(0, 100 - similarityPercent),
    similarityPercent,
    similarProject: match
      ? { projectId: match.ProjectId, title: match.Title, teacherAssignedId: match.TeacherAssignedId }
      : null,
    tip:
      similarityPercent >= 55
        ? 'High overlap detected — refine scope or pick a clearer unique angle.'
        : similarityPercent >= 35
          ? 'Moderate overlap — differentiate method, dataset, or target users.'
          : 'Looks relatively unique so far — keep refining the abstract.',
  };
}
