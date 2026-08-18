import { FileText, ClipboardCheck } from 'lucide-react';
import { PublicChrome } from '../components/PublicChrome';
import { Reveal } from '../components/WelcomeMotion';
import { HU_IMAGES, UNIVERSITY_NAME } from '../config/appImages';
import { CONTACT_EMAIL } from '../config/contact';
import '../styles/home.css';

type LegalKind = 'terms' | 'ai';

const content: Record<LegalKind, {
  eyebrow: string;
  title: string;
  summary: string;
  image: string;
  sections: Array<{ title: string; body: string }>;
}> = {
  terms: {
    eyebrow: 'Acceptable use',
    title: 'Rules for using Hormuud ProjectHub.',
    summary: 'ProjectHub is the academic workspace of Hormuud University. These terms explain how students, teachers, and staff should use it.',
    image: HU_IMAGES.campus,
    sections: [
      { title: 'University use', body: 'ProjectHub is provided for authorized academic work. Use only the role and projects assigned to your Hormuud University account, and keep your profile details accurate.' },
      { title: 'Account safety', body: 'Keep your password private and report suspected unauthorized access immediately. Attempts to open another person’s projects, messages, or marks are prohibited.' },
      { title: 'Academic integrity', body: 'You remain responsible for originality, citations, and university academic-integrity rules. Similarity and review tools support teachers; they do not replace formal academic judgment.' },
      { title: 'Content and conduct', body: 'Do not upload malware, illegal material, harassment, confidential third-party information, or content unrelated to university projects.' },
      { title: 'Availability', body: 'The university may maintain, suspend, or update the service for security or reliability. Follow any official backup procedure required by your department for important submissions.' },
    ],
  },
  ai: {
    eyebrow: 'Review tools',
    title: 'How analysis supports teachers — and where judgment stays human.',
    summary: 'Review and coaching tools summarize project material and suggest next steps. They are assistants, not examiners or final grading systems.',
    image: HU_IMAGES.library,
    sections: [
      { title: 'Purpose', body: 'ProjectHub can summarize a submission, suggest improvements, support teacher review, and coach students on scope and originality. Final marks and decisions remain with the assigned teacher.' },
      { title: 'Information used', body: 'A request may include the project title, abstract, submission text, selected messages, and extracted document text needed to answer that request.' },
      { title: 'Limitations', body: 'Automated notes can be incomplete or inaccurate. Teachers must verify evidence. Students should check suggestions and cite original sources rather than presenting tool output as independent research.' },
      { title: 'Safe use', body: 'Do not enter passwords, API keys, medical information, financial data, or unrelated personal information into a project or coaching question.' },
      { title: 'Oversight', body: `Contact the ProjectHub office at ${CONTACT_EMAIL} if a result appears unsafe, exposes data, or materially affects an academic decision.` },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const page = content[kind];
  const Icon = kind === 'ai' ? ClipboardCheck : FileText;

  return (
    <PublicChrome>
      <section className="story-hero">
        <img src={page.image} alt={`${UNIVERSITY_NAME} — ${page.eyebrow}`} />
        <div className="story-hero__wash" />
        <div className="hub-shell story-hero__copy">
          <Reveal>
            <span className="hub-label hub-label--light">{page.eyebrow}</span>
            <h1>{page.title}</h1>
            <p>{page.summary}</p>
          </Reveal>
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-shell legal-stack">
          {page.sections.map((section) => (
            <Reveal key={section.title} className="legal-article">
              <span><Icon size={18} /></span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            </Reveal>
          ))}
          <p className="legal-effective">Effective 15 August 2026 · {UNIVERSITY_NAME}</p>
        </div>
      </section>
    </PublicChrome>
  );
}
