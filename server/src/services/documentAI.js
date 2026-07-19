/**
 * AI document analysis — extracts text from uploads and generates summaries/feedback.
 * Supports: .txt, .pdf, .docx (and plain text from other formats when possible).
 */
import { combinedSimilarity } from './athena.js';
import { generateTeacherProjectBriefing, isRealAIConfigured } from './aiEngine.js';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'from', 'as', 'it']);

function decodeDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return { buffer: null, mime: '' };
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { buffer: null, mime: '' };
  return { buffer: Buffer.from(match[2], 'base64'), mime: match[1] };
}

function extFromName(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function readImageDimensions(buffer, ext) {
  try {
    if (['png'].includes(ext) && buffer.length > 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (['jpg', 'jpeg'].includes(ext) && buffer.length > 4) {
      let i = 2;
      while (i < buffer.length) {
        if (buffer[i] !== 0xff) break;
        const marker = buffer[i + 1];
        const len = buffer.readUInt16BE(i + 2);
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function extractText(buffer, fileName, mime) {
  const ext = extFromName(fileName);
  const text = buffer.toString('utf8');

  if (ext === 'txt' || mime === 'text/plain') {
    return text.slice(0, 50000);
  }

  if (ext === 'pdf' || mime === 'application/pdf') {
    try {
      const mod = await import('pdf-parse');
      const pdfParse = mod.default || mod;
      const result = await pdfParse(buffer);
      return (result.text || '').slice(0, 50000);
    } catch {
      return '';
    }
  }

  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').slice(0, 50000);
    } catch {
      return '';
    }
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || mime.startsWith('image/')) {
    const dims = readImageDimensions(buffer, ext);
    const sizeKb = Math.round(buffer.length / 1024);
    const parts = [`Image: ${fileName} (${sizeKb} KB)`];
    if (dims) parts.push(`Dimensions: ${dims.width}×${dims.height}px`);
    parts.push('Visual content — review the image for diagrams, screenshots, charts, or photos related to the project.');
    return parts.join(' ');
  }

  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext) || mime.startsWith('video/')) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    return `Video: ${fileName} (${sizeMb} MB). Student submitted a video — review for demo, presentation, or project walkthrough content.`;
  }

  if (['doc', 'ppt', 'pptx'].includes(ext)) {
    return `[${ext.toUpperCase()} file: ${fileName}. Full parsing limited — review attachment manually or convert to PDF/DOCX.]`;
  }

  // Fallback: try readable UTF-8
  if (/^[\x09\x0a\x0d\x20-\x7e\u00a0-\ufffd\s]+$/.test(text.slice(0, 2000))) {
    return text.slice(0, 50000);
  }
  return '';
}

function topWords(text, n = 8) {
  const counts = new Map();
  for (const w of text.toLowerCase().split(/\W+/)) {
    if (w.length > 3 && !STOP.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

function summarize(text, maxSentences = 4) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
  if (!sentences.length) return text.slice(0, 400) || 'No readable text extracted from this file.';
  return sentences.slice(0, maxSentences).join(' ');
}

function extractKeyPoints(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => /^[-•*]\s/.test(l) || /^\d+[.)]\s/.test(l)).slice(0, 8);
  if (bullets.length) return bullets.map(b => b.replace(/^[-•*\d.)]+\s*/, '').slice(0, 200));
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30);
  return sentences.slice(0, 5).map(s => s.slice(0, 200));
}

function extractObjectives(text) {
  const patterns = [
    /objective[s]?\s*[:\-]\s*(.+)/gi,
    /goal[s]?\s*[:\-]\s*(.+)/gi,
    /requirement[s]?\s*[:\-]\s*(.+)/gi,
    /aim[s]?\s*[:\-]\s*(.+)/gi,
  ];
  const found = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null && found.length < 6) {
      found.push(m[1].trim().slice(0, 200));
    }
  }
  if (!found.length) {
    const kw = text.match(/(?:we will|this project|the purpose|designed to)\s[^.!?]{10,120}[.!?]/gi);
    if (kw) return kw.slice(0, 4).map(s => s.trim());
  }
  return found.length ? found : ['Review document for stated project objectives.'];
}

function checkGrammar(text) {
  const issues = [];
  const doubled = text.match(/\b(\w+)\s+\1\b/gi);
  if (doubled) issues.push(`Repeated words detected: ${doubled.slice(0, 3).join(', ')}`);
  const longSentences = text.split(/(?<=[.!?])\s+/).filter(s => s.split(/\s+/).length > 40);
  if (longSentences.length) issues.push(`${longSentences.length} very long sentence(s) — consider splitting for clarity.`);
  const informal = text.match(/\b(gonna|wanna|stuff|things|lots of)\b/gi);
  if (informal) issues.push('Informal language detected — use academic tone where appropriate.');
  return issues.slice(0, 6);
}

function checkMissingSections(text) {
  const lower = text.toLowerCase();
  const sections = [
    { name: 'Abstract / Summary', keys: ['abstract', 'summary', 'overview'] },
    { name: 'Introduction', keys: ['introduction', 'background'] },
    { name: 'Methodology', keys: ['methodology', 'method', 'approach'] },
    { name: 'Results', keys: ['results', 'findings', 'outcome'] },
    { name: 'Conclusion', keys: ['conclusion', 'concluding', 'summary and conclusion'] },
    { name: 'References', keys: ['references', 'bibliography', 'works cited'] },
  ];
  return sections.filter(s => !s.keys.some(k => lower.includes(k))).map(s => s.name);
}

function qualityScore(text, missing, grammarCount) {
  let score = 50;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 200) score += 15;
  if (words > 800) score += 10;
  if (words > 1500) score += 5;
  score -= missing.length * 8;
  score -= grammarCount * 3;
  return Math.max(10, Math.min(100, Math.round(score)));
}

export async function analyzeTextContent(text, { projectTitle, projectAbstract, fileName = 'Message text' } = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      summary: 'Empty message.',
      mainTopic: 'No content',
      keyPoints: [],
      objectives: [],
      qualityScore: 0,
      relatedToProject: false,
      grammarIssues: [],
      missingSections: [],
      plagiarismNote: '',
      suggestions: [],
    };
  }
  return analyzeDocument({
    fileName: 'message.txt',
    attachmentData: `data:text/plain;base64,${Buffer.from(trimmed, 'utf8').toString('base64')}`,
    projectTitle,
    projectAbstract,
  });
}

export async function analyzeAttachment({ fileName, attachmentData, attachmentType, projectTitle, projectAbstract }) {
  if (attachmentType === 'image' || attachmentType === 'video') {
    const { buffer, mime } = decodeDataUrl(attachmentData);
    const extracted = buffer ? await extractText(buffer, fileName, mime) : '';
    const analysis = await analyzeDocument({ fileName, attachmentData, projectTitle, projectAbstract });
    if (extracted && !extracted.startsWith('[')) {
      analysis.summary = `${analysis.summary} ${extracted}`.trim();
    }
    return analysis;
  }
  return analyzeDocument({ fileName, attachmentData, projectTitle, projectAbstract });
}

export async function analyzeDocument({ fileName, attachmentData, projectTitle, projectAbstract }) {
  const { buffer, mime } = decodeDataUrl(attachmentData);
  if (!buffer) {
    return {
      summary: 'Could not read file data.',
      mainTopic: 'Unknown',
      keyPoints: [],
      objectives: [],
      qualityScore: 0,
      relatedToProject: false,
      grammarIssues: [],
      missingSections: [],
      plagiarismNote: '',
      suggestions: ['Re-upload the file in PDF, DOCX, or TXT format.'],
    };
  }

  const extracted = await extractText(buffer, fileName, mime);
  const text = extracted.trim();

  if (!text || text.startsWith('[')) {
    const fallbackSummary = text || `Uploaded file "${fileName}" — limited text extraction.`;
    return {
      summary: fallbackSummary,
      mainTopic: extFromName(fileName) || 'Document',
      keyPoints: [`File: ${fileName}`, 'Teacher should open the attachment for full review.'],
      objectives: ['Review attachment manually for project goals and deliverables.'],
      qualityScore: 35,
      relatedToProject: Boolean(projectTitle),
      grammarIssues: [],
      missingSections: ['Full text not extracted automatically'],
      plagiarismNote: 'Manual review recommended when text cannot be extracted.',
      suggestions: ['Convert to PDF or DOCX for deeper AI reading.', 'Ensure the document contains selectable text.'],
    };
  }

  const topics = topWords(text, 8);
  const mainTopic = topics.slice(0, 5).join(', ') || 'General academic document';
  const summary = projectTitle
    ? buildExecutiveSummary(text, projectTitle, projectAbstract || summarize(text, 2))
    : summarize(text, 5);
  const keyPoints = extractKeyPoints(text);
  const objectives = extractObjectives(text);
  const grammarIssues = checkGrammar(text);
  const missingSections = checkMissingSections(text);
  const score = qualityScore(text, missingSections, grammarIssues.length);

  let relatedToProject = false;
  let plagiarismNote = 'No significant overlap detected with other project titles in the system.';
  const suggestions = [];

  if (projectTitle || projectAbstract) {
    const combined = `${projectTitle || ''} ${projectAbstract || ''}`.toLowerCase();
    const overlap = topics.filter(t => combined.includes(t));
    relatedToProject = overlap.length >= 1 || text.toLowerCase().includes((projectTitle || '').toLowerCase().slice(0, 12));
    if (!relatedToProject) {
      suggestions.push('Document topic may not closely match the assigned project title — verify alignment with your teacher.');
    }
  }

  try {
    const sim = combinedSimilarity(text.slice(0, 3000), projectTitle || projectAbstract || '');
    if (sim > 0.4) {
      plagiarismNote = `Possible content overlap (${Math.round(sim * 100)}%) with project topic — teacher should review.`;
    }
  } catch {
    /* optional */
  }

  if (missingSections.length) suggestions.push(`Add missing sections: ${missingSections.join(', ')}.`);
  if (grammarIssues.length) suggestions.push('Revise grammar and sentence structure before final submission.');
  if (score < 60) suggestions.push('Expand content and include all required academic sections.');
  if (!suggestions.length) suggestions.push('Document looks complete — ready for teacher review.');

  return {
    summary,
    mainTopic,
    keyPoints,
    objectives,
    qualityScore: score,
    relatedToProject,
    grammarIssues,
    missingSections,
    plagiarismNote,
    suggestions,
  };
}

export const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'mp4', 'webm'];

const TECH_PATTERNS = [
  { re: /\b(python|django|flask|fastapi)\b/i, label: 'Python' },
  { re: /\b(javascript|typescript|react|vue|angular|node\.?js)\b/i, label: 'Web / JavaScript' },
  { re: /\b(java|spring|kotlin|android)\b/i, label: 'Java / Mobile' },
  { re: /\b(c\+\+|c#|\.net)\b/i, label: 'C / .NET' },
  { re: /\b(machine learning|deep learning|neural|tensorflow|pytorch|ai model)\b/i, label: 'Machine Learning / AI' },
  { re: /\b(sql|mysql|postgresql|mongodb|database)\b/i, label: 'Databases' },
  { re: /\b(iot|arduino|raspberry|sensor|embedded)\b/i, label: 'IoT / Embedded' },
  { re: /\b(mobile app|ios|flutter|react native)\b/i, label: 'Mobile Application' },
];

function detectTechnologies(text) {
  const found = TECH_PATTERNS.filter(t => t.re.test(text)).map(t => t.label);
  return [...new Set(found)];
}

function inferProjectKind(text) {
  const lower = text.toLowerCase();
  if (/research|study|survey|literature review|thesis/.test(lower)) return 'Research / academic study';
  if (/mobile app|android|ios|flutter/.test(lower)) return 'Mobile application';
  if (/web app|website|portal|platform/.test(lower)) return 'Web application / platform';
  if (/iot|sensor|hardware|embedded/.test(lower)) return 'Hardware / IoT system';
  if (/machine learning|classification|prediction|model/.test(lower)) return 'AI / data-driven system';
  if (/management system|dashboard|admin panel/.test(lower)) return 'Information management system';
  return 'Software / academic project';
}

function buildExecutiveSummary(text, title, abstract) {
  const combined = `${title}. ${abstract || ''} ${text}`.trim();
  const sentences = combined.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 25);
  const kind = inferProjectKind(combined);
  const techs = detectTechnologies(combined);
  const intro = `This submission is a ${kind.toLowerCase()} titled "${title}".`;
  const body = summarize(combined, 5);
  const techLine = techs.length
    ? `Technologies and methods mentioned include: ${techs.join(', ')}.`
    : 'Review the full write-up for tools, frameworks, and methods used.';
  return `${intro} ${body} ${techLine}`.trim();
}

/** Full AI read of a submitted project — ChatGPT-style briefing for teacher only */
export async function analyzeProjectSubmission({ title, abstract, content, description }) {
  const fullText = [title, abstract, content, description].filter(Boolean).join('\n\n').trim();
  if (!fullText) {
    return {
      summary: 'No project content was submitted.',
      mainTopic: title || 'Untitled project',
      keyPoints: [],
      objectives: [],
      qualityScore: 0,
      relatedToProject: true,
      grammarIssues: [],
      missingSections: ['Abstract', 'Full description'],
      plagiarismNote: '',
      suggestions: ['Ask the student to resubmit with title, abstract, and full project description.'],
    };
  }

  const topics = topWords(fullText, 8);
  const mainTopic = topics.slice(0, 4).join(', ') || title;
  const keyPoints = extractKeyPoints(fullText);
  const objectives = extractObjectives(fullText);
  const grammarIssues = checkGrammar(fullText);
  const missingSections = checkMissingSections(fullText);
  const score = qualityScore(fullText, missingSections, grammarIssues.length);
  const techs = detectTechnologies(fullText);
  const kind = inferProjectKind(fullText);

  const llmBriefing = await generateTeacherProjectBriefing({ title, abstract, content, description });
  if (llmBriefing) {
    return {
      ...llmBriefing,
      grammarIssues: grammarIssues.length ? grammarIssues : llmBriefing.grammarIssues,
      missingSections: missingSections.length ? missingSections : llmBriefing.missingSections,
      qualityScore: llmBriefing.qualityScore || score,
    };
  }

  if (!isRealAIConfigured()) {
    return {
      summary: 'Real AI is not configured. Add OPENAI_API_KEY or GEMINI_API_KEY to the server .env file and restart the API. No mock analysis is used.',
      mainTopic: title || 'Untitled project',
      keyPoints: [],
      objectives: [],
      qualityScore: 0,
      relatedToProject: true,
      grammarIssues: [],
      missingSections: [],
      plagiarismNote: '',
      suggestions: ['Configure OPENAI_API_KEY or GEMINI_API_KEY for real AI project analysis'],
      realAI: false,
    };
  }

  return {
    summary: 'Real AI analysis failed. Try again from the project page or check your API keys.',
    mainTopic: mainTopic,
    keyPoints,
    objectives,
    qualityScore: score,
    relatedToProject: true,
    grammarIssues,
    missingSections,
    plagiarismNote: '',
    suggestions: ['Re-run AI analysis from the teacher project page'],
    realAI: false,
  };
}
