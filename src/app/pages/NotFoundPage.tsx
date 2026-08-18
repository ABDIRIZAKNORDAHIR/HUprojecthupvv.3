import { Link } from 'react-router';
import { ArrowRight, SearchX } from 'lucide-react';
import { PublicChrome } from '../components/PublicChrome';
import { Reveal } from '../components/WelcomeMotion';
import { HU_IMAGES, UNIVERSITY_NAME } from '../config/appImages';
import '../styles/home.css';

export function NotFoundPage() {
  return (
    <PublicChrome>
      <section className="story-hero">
        <img src={HU_IMAGES.campus} alt={`${UNIVERSITY_NAME} campus`} />
        <div className="story-hero__wash" />
        <div className="hub-shell story-hero__copy">
          <Reveal>
            <span className="hub-label hub-label--light">Page not found</span>
            <h1>This page is not part of ProjectHub.</h1>
            <p>
              The link may be incomplete, or the page may have moved. Return home, or sign in with your
              Hormuud University account.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="hub-section">
        <div className="hub-shell privacy-note">
          <Reveal>
            <span className="workspace-notice__icon" aria-hidden="true"><SearchX size={22} /></span>
            <h2>Need a way in?</h2>
            <p>Students, teachers, and staff each have their own sign-in. Public pages for About, Contact, and Privacy are in the footer.</p>
            <div className="notfound-actions">
              <Link to="/" className="hub-btn">Back to ProjectHub</Link>
              <Link to="/login/student" className="hub-inline-link">Student sign in <ArrowRight size={16} /></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicChrome>
  );
}
