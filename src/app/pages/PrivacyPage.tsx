import { Link } from 'react-router';
import {
  EyeOff, KeyRound, Lock, ShieldCheck, UserRound, Users,
} from 'lucide-react';
import { PublicChrome } from '../components/PublicChrome';
import { Reveal } from '../components/WelcomeMotion';
import { HU_IMAGES, UNIVERSITY_NAME } from '../config/appImages';
import researchLab from '../../assets/hu/catalog/research-lab.jpg';
import '../styles/home.css';

const guarantees = [
  {
    icon: Users,
    title: 'Role walls',
    text: 'A student cannot open another student’s project. A teacher sees only their assigned class and projects. Administrator accounts cannot read private teacher–student project threads.',
    image: HU_IMAGES.heroStudents,
    caption: 'Each portal is separate: student, teacher, and staff.',
  },
  {
    icon: EyeOff,
    title: 'Work is not public',
    text: 'Proposals, PDFs, marks, and chat stay inside ProjectHub. There is no public gallery of student files. A teacher reviews a PDF in a private tab; classmates do not see it unless they are on that project team.',
    image: HU_IMAGES.lab,
    caption: 'Teacher review happens on the assigned project only.',
  },
  {
    icon: Lock,
    title: 'Files stay on the record',
    text: 'Assignment PDFs are stored on the submission, not emailed around campus. The teacher opens the file when needed. Download is optional. The original file remains the academic record.',
    image: HU_IMAGES.library,
    caption: 'Research and files belong to the project record.',
  },
  {
    icon: UserRound,
    title: 'Photos are for recognition',
    text: 'If a student adds a profile photo, the assigned teacher sees it on the class list, submissions, and messages. If there is no photo, ProjectHub shows initials from the student’s name. Photos are not published off the platform.',
    image: HU_IMAGES.teamWork,
    caption: 'Teachers recognise their students. The campus does not.',
  },
];

const controls = [
  { icon: KeyRound, title: 'Passwords', text: 'Passwords are stored as one-way hashes. ProjectHub never shows a password back to anyone — including administrators.' },
  { icon: Lock, title: 'Signed-in access', text: 'Every project, mark, message, and file request requires a signed-in session. Unsigned visitors see only these public pages.' },
  { icon: ShieldCheck, title: 'Approved accounts', text: 'New accounts wait for approval before they can enter. A HU ID lookup confirms the person without exposing extra private records.' },
  { icon: EyeOff, title: 'Review tools', text: 'When a teacher uses analysis, only the project text needed for that request is sent. Do not paste passwords, medical data, or unrelated personal information into a project.' },
];

export function PrivacyPage() {
  return (
    <PublicChrome>
      <section className="story-hero">
        <img src={researchLab} alt="Private academic work at Hormuud University" />
        <div className="story-hero__wash" />
        <div className="hub-shell story-hero__copy">
          <Reveal>
            <span className="hub-label hub-label--light">Privacy</span>
            <h1>How ProjectHub keeps student work private.</h1>
            <p>
              This is an academic system, not a social network. Marks, PDFs, messages, and profile photos
              stay behind the correct Hormuud University role — student, teacher, or staff.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-shell">
          <Reveal className="hub-head">
            <span className="hub-label">The promise</span>
            <h2>Your project is visible to the people who must see it — and not to everyone else.</h2>
            <p>
              {UNIVERSITY_NAME} uses ProjectHub to run proposals, class assignments, and marks.
              Privacy here means access control: who can open the file, who can see the mark, and who cannot.
            </p>
          </Reveal>
          <div className="privacy-grid">
            {guarantees.map((item) => (
              <Reveal key={item.title} className="privacy-card">
                <img src={item.image} alt={item.caption} />
                <div>
                  <span><item.icon size={16} /> {item.title}</span>
                  <p>{item.text}</p>
                  <em>{item.caption}</em>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hub-section privacy-controls-section">
        <div className="hub-shell">
          <Reveal className="hub-head hub-head--center">
            <span className="hub-label">How it is kept</span>
            <h2>The controls behind every login.</h2>
          </Reveal>
          <div className="privacy-controls">
            {controls.map((item) => (
              <Reveal key={item.title} className="privacy-control">
                <span><item.icon size={18} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-shell privacy-note">
          <Reveal>
            <h2>If you need a record changed.</h2>
            <p>
              Academic records follow university policy. To request access, a correction, an export, or deletion
              where it applies, write to the ProjectHub office from the contact page. Bring your HU ID.
            </p>
            <Link to="/contact" className="hub-btn">Open contact</Link>
          </Reveal>
        </div>
      </section>
    </PublicChrome>
  );
}
