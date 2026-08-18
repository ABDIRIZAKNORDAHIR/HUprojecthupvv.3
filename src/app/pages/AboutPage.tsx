import { Link } from 'react-router';
import { ArrowRight, BadgeCheck, ClipboardCheck, GraduationCap, ShieldCheck, UsersRound } from 'lucide-react';
import { PublicChrome } from '../components/PublicChrome';
import { Reveal } from '../components/WelcomeMotion';
import { HU_IMAGES, UNIVERSITY_NAME } from '../config/appImages';
import campusBuilding from '../../assets/hu/catalog/campus-building.jpg';
import practicalLab from '../../assets/hu/catalog/practical-lab.jpg';
import practicalTeam from '../../assets/hu/catalog/practical-team.jpg';
import '../styles/home.css';

const pillars = [
  {
    icon: GraduationCap,
    title: 'For Hormuud University',
    text: 'ProjectHub is the academic workspace where students propose work, teachers review it, and every mark stays on the official project record.',
  },
  {
    icon: ClipboardCheck,
    title: 'One place for the full lifecycle',
    text: 'Propose by HU ID, invite teammates, submit PDFs, receive a decision, and collect a mark out of 100 — without email chains or lost files.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for teachers to trust',
    text: 'Teachers see only their class and assigned projects. Students see their own work. Files open for review; they are not published to the campus.',
  },
];

const gallery = [
  { src: HU_IMAGES.heroStudents, title: 'Students', text: 'Send a proposal, join a team, and follow every teacher decision.' },
  { src: HU_IMAGES.library, title: 'Research', text: 'Abstracts, PDFs and drafts live on the project your teacher opens.' },
  { src: HU_IMAGES.lab, title: 'Practical work', text: 'Lab teams submit files and receive marks from the same teacher record.' },
  { src: HU_IMAGES.convocation, title: 'The goal', text: 'Approved work that is ready to stand at convocation.' },
];

export function AboutPage() {
  return (
    <PublicChrome>
      <section className="story-hero">
        <img src={campusBuilding} alt={`${UNIVERSITY_NAME} campus, where ProjectHub is used`} />
        <div className="story-hero__wash" />
        <div className="hub-shell story-hero__copy">
          <Reveal>
            <span className="hub-label hub-label--light">About ProjectHub</span>
            <h1>The project workspace for {UNIVERSITY_NAME}.</h1>
            <p>
              ProjectHub is not a public website for browsing student work. It is the private academic system
              students and teachers sign into — to propose, review, mark, and keep a complete record of every project.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-shell story-intro">
          <Reveal className="hub-head">
            <span className="hub-label">What this project is</span>
            <h2>Hormuud ProjectHub, in one sentence.</h2>
            <p>
              Students send a project to a teacher by University ID. Teachers accept it, request changes, or reject it
              with a reason. Teams collaborate, class assignments close on time, and marks with feedback stay on the record.
            </p>
          </Reveal>
          <div className="story-pillars">
            {pillars.map((item) => (
              <Reveal key={item.title} className="story-pillar">
                <span><item.icon size={20} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="hub-section story-split-section">
        <div className="hub-shell story-split">
          <Reveal>
            <img src={practicalLab} alt="Hormuud University practical laboratory" />
          </Reveal>
          <Reveal className="story-split__copy">
            <span className="hub-label">For teachers</span>
            <h2>Review the work. Keep the record.</h2>
            <p>
              Open a class, see who submitted, read the PDF in a new tab, and send a mark with feedback.
              Profile photos help you recognise the student. Initials appear when no photo is on file.
            </p>
            <ul>
              <li><BadgeCheck size={16} /> Oldest submissions first in the review queue</li>
              <li><BadgeCheck size={16} /> Accept, request changes, or reject — with the reason saved</li>
              <li><BadgeCheck size={16} /> Class assignments with a hard deadline</li>
            </ul>
            <Link to="/login/teacher" className="hub-btn">Teacher sign in <ArrowRight size={16} /></Link>
          </Reveal>
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-shell story-split story-split--flip">
          <Reveal className="story-split__copy">
            <span className="hub-label">For students</span>
            <h2>Your project, your teacher, your team.</h2>
            <p>
              Choose the teacher by HU ID, attach a PDF proposal, invite classmates, and watch the status move
              from pending to assigned, submitted, and approved.
            </p>
            <ul>
              <li><UsersRound size={16} /> Invite teammates by University ID</li>
              <li><UsersRound size={16} /> Messages stay on the project</li>
              <li><UsersRound size={16} /> Marks and feedback arrive in one place</li>
            </ul>
            <Link to="/register/student" className="hub-btn">Start your project <ArrowRight size={16} /></Link>
          </Reveal>
          <Reveal>
            <img src={practicalTeam} alt="Hormuud University students collaborating on project work" />
          </Reveal>
        </div>
      </section>

      <section className="hub-section story-gallery-section">
        <div className="hub-shell">
          <Reveal className="hub-head hub-head--center">
            <span className="hub-label">Campus and the work</span>
            <h2>Real places. Real academic work.</h2>
            <p>These are Hormuud University photographs — the campus where ProjectHub projects are researched, written, and defended.</p>
          </Reveal>
          <div className="story-gallery">
            {gallery.map((item) => (
              <Reveal key={item.title} className="story-gallery__card">
                <img src={item.src} alt={item.title} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </PublicChrome>
  );
}
