import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { PublicChrome } from '../components/PublicChrome';
import { Reveal } from '../components/WelcomeMotion';
import {
  CONTACT_CAMPUS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE, CONTACT_TEL,
} from '../config/contact';
import { UNIVERSITY_NAME } from '../config/appImages';
import campusLife from '../../assets/hu/catalog/campus-life.webp';
import '../styles/home.css';

const topics = [
  'Account and HU ID',
  'Sending a proposal',
  'Teacher review decisions',
  'Marks and feedback',
  'Team invitations',
];

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(form.subject || `ProjectHub enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n—\n${form.name}\n${form.email}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <PublicChrome>
      <section className="story-hero story-hero--contact">
        <img src={campusLife} alt={`${UNIVERSITY_NAME} campus life`} />
        <div className="story-hero__wash" />
        <div className="hub-shell story-hero__copy">
          <Reveal>
            <span className="hub-label hub-label--light">Contact</span>
            <h1>Talk to the ProjectHub office.</h1>
            <p>
              Write about accounts, proposals, teacher decisions, marks, or access.
              For day-to-day project work, sign in to your portal instead of sending mail.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="hub-section hub-support">
        <div className="hub-shell hub-support__layout">
          <Reveal className="hub-support__copy">
            <span className="hub-label">ProjectHub office</span>
            <h2>{UNIVERSITY_NAME}, Mogadishu campus.</h2>
            <p>The team that handles ProjectHub sits with the academic office. Use this page only for the project itself — not for general university admissions.</p>
            <ul className="hub-support__topics">{topics.map((topic) => <li key={topic}><span>✓</span>{topic}</li>)}</ul>
            <ul className="hub-support__office">
              <li><span><MapPin size={14} /></span><div><em>Campus</em><strong>{CONTACT_CAMPUS}</strong></div></li>
              <li><span><Clock size={14} /></span><div><em>Office hours</em><strong>{CONTACT_HOURS}</strong></div></li>
              <li><span><Mail size={14} /></span><div><em>Email</em><strong><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></strong></div></li>
              <li><span><Phone size={14} /></span><div><em>Phone</em><strong><a href={CONTACT_TEL}>{CONTACT_PHONE}</a></strong></div></li>
            </ul>
            <div className="hub-support__portals">
              <Link to="/login/student" className="hub-btn hub-btn--sm">Student sign in</Link>
              <Link to="/login/teacher" className="hub-btn hub-btn--outline hub-btn--sm">Teacher sign in</Link>
            </div>
          </Reveal>

          <Reveal className="hub-support__form" delay={0.08}>
            <form onSubmit={submit}>
              <span className="hub-label">Send a message</span>
              <h3>How can we help with ProjectHub?</h3>
              <div className="hub-form-row">
                <label><span>Name</span><input required placeholder="Your full name" value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} /></label>
                <label><span>University email</span><input required type="email" placeholder="you@hu.edu.so" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} /></label>
              </div>
              <label><span>Subject</span><input required placeholder="Proposal, marks, account, or access" value={form.subject} onChange={(event) => setForm((state) => ({ ...state, subject: event.target.value }))} /></label>
              <label><span>Message</span><textarea required rows={5} placeholder="Tell us which project, HU ID, or class this is about…" value={form.message} onChange={(event) => setForm((state) => ({ ...state, message: event.target.value }))} /></label>
              <button type="submit" className="hub-btn"><Send size={15} /> Send message <ArrowRight size={15} /></button>
            </form>
          </Reveal>
        </div>
      </section>
    </PublicChrome>
  );
}
