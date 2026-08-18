import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring,
  useTransform,
} from 'motion/react';
import {
  Activity, Award, ArrowRight, BadgeCheck, Bell, Building2, Check, CheckCircle2,
  ClipboardCheck, ClipboardList, Eye, FileStack, FilePlus2, FolderKanban, Gauge, Globe,
  GraduationCap, LayoutDashboard, LogIn, Mail, MapPin, Menu, MessageSquare, Minus,
  Phone, Plus, RefreshCcw, Search, Settings2, Star, TrendingUp, UploadCloud,
  UserPlus, UserRoundCheck, UsersRound, X,
} from 'lucide-react';
import { BrandLockup } from '../components/BrandLockup';
import { Reveal } from '../components/WelcomeMotion';
import {
  CAMPUS_SHOWCASE, HERO_SLIDES, HU_IMAGES, HU_WEBSITE, UNIVERSITY_NAME,
} from '../config/appImages';
import {
  CONTACT_CAMPUS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE, CONTACT_TEL,
} from '../config/contact';
import studentPortrait from '../../assets/cut-student-portrait.webp';
import avatarStudentF from '../../assets/hu-avatar-student-f.webp';
import avatarStudentM from '../../assets/hu-avatar-student-m.webp';
import avatarSupervisor from '../../assets/hu-avatar-supervisor.webp';
import '../styles/home.css';

const navLinks = [
  { label: 'Platform', href: '#platform' },
  { label: 'Lifecycle', href: '#lifecycle' },
  { label: 'Campus', href: '#campus' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'FAQ', href: '#faq' },
] as const;

interface Feature {
  icon: typeof Award;
  title: string;
  text: string;
}

/** Every card below maps to a screen that exists inside ProjectHub. */
const features: Feature[] = [
  { icon: FilePlus2, title: 'Propose by HU ID', text: 'Choose your teacher by name or University ID, then send the title, abstract and a PDF proposal (PDF only, up to 3 MB).' },
  { icon: ClipboardCheck, title: 'Accept · Request changes · Reject', text: 'One control for the teacher. A reason is required to reject or request changes, and it is stored on the project.' },
  { icon: UsersRound, title: 'Invite teammates by HU ID', text: 'Look up a classmate by University ID and invite them. Invitations stay pending until they accept.' },
  { icon: ClipboardList, title: 'Class assignments', text: 'Teachers publish to a class and study mode. Students upload text or a file, and submission closes at the deadline.' },
  { icon: Award, title: 'Marks out of 100', text: 'A base score from 0–100, optional bonus up to 20, capped at 100, with written feedback up to 4,000 characters.' },
  { icon: MessageSquare, title: 'Realtime messages', text: 'Teacher–student threads, direct messages, and project group chat, with typing indicators and online presence.' },
  { icon: Gauge, title: 'Progress and uniqueness', text: 'Every project carries a status, a uniqueness score and a similarity percent you can see on the project page.' },
  { icon: Globe, title: 'Project Atlas', text: 'Search topics across departments and check whether a title is available, pending or already taken.' },
];

/** The exact Projects.Status values in the database, in the order they occur. */
const lifecycle = [
  {
    status: 'pending_teacher',
    label: 'Pending teacher',
    actor: 'Student proposes',
    icon: FilePlus2,
    text: 'The student sends a title, abstract and optional PDF to a chosen teacher. The teacher is notified immediately.',
    weight: 15,
  },
  {
    status: 'assigned',
    label: 'Assigned',
    actor: 'Teacher accepts',
    icon: CheckCircle2,
    text: 'The proposal is accepted, the project becomes active work, and the student may begin and submit.',
    weight: 40,
  },
  {
    status: 'changes_requested',
    label: 'Changes requested',
    actor: 'Teacher returns it',
    icon: RefreshCcw,
    text: 'The teacher must write what to fix. The student edits and the project goes back for a new decision.',
    weight: 50,
  },
  {
    status: 'submitted',
    label: 'Submitted',
    actor: 'Student submits',
    icon: UploadCloud,
    text: 'A new numbered submission version is stored and checked for similarity against existing projects.',
    weight: 70,
  },
  {
    status: 'under_review',
    label: 'Under review',
    actor: 'Waiting on the teacher',
    icon: Eye,
    text: 'The submission sits in the review queue with its analysis ready, oldest arrival first.',
    weight: 85,
  },
  {
    status: 'approved',
    label: 'Approved',
    actor: 'Teacher approves',
    icon: BadgeCheck,
    text: 'The approval is recorded on the project, with a notification and a message to the student.',
    weight: 100,
  },
  {
    status: 'rejected',
    label: 'Rejected',
    actor: 'Teacher rejects',
    icon: X,
    text: 'A rejection reason is required and is saved on the project so the student can read exactly why.',
    weight: 30,
  },
] as const;

const workflow = [
  { icon: FilePlus2, title: 'Propose', text: 'Pick the teacher by HU ID, add title, abstract and PDF.' },
  { icon: Eye, title: 'Review queue', text: 'The teacher opens the project with its analysis prepared.' },
  { icon: ClipboardCheck, title: 'Decision', text: 'Accept, request changes, or reject with a reason.' },
  { icon: UsersRound, title: 'Team', text: 'Invite classmates by University ID to join the project.' },
  { icon: UploadCloud, title: 'Submit', text: 'Each submission is stored as a new version.' },
  { icon: Award, title: 'Marks', text: 'Score out of 100, bonus up to 20, written feedback.' },
  { icon: BadgeCheck, title: 'Approved', text: 'The decision is recorded on the project record.' },
] as const;

/** Metrics the product genuinely computes, with the field each one comes from. */
const teacherMetrics = [
  { icon: ClipboardList, label: 'Review queue', value: 'Oldest first', note: 'Submitted and under-review projects' },
  { icon: Activity, label: 'Uniqueness score', value: '0 – 100', note: 'Stored per project as UniquenessScore' },
  { icon: ClipboardCheck, label: 'One decision', value: '3 outcomes', note: 'Accept · Request changes · Reject' },
  { icon: Star, label: 'Class mark', value: 'Score + bonus', note: 'Capped at 100, feedback attached' },
] as const;

const statusCards = [
  { icon: Activity, label: 'Similarity percent', value: 'Per submission' },
  { icon: UploadCloud, label: 'Submission version', value: 'Kept in full' },
  { icon: ClipboardCheck, label: 'Decision reason', value: 'Saved on project' },
] as const;

const testimonials = [
  {
    quote: 'I choose my teacher by University ID, attach the proposal PDF, and the answer comes back on the project itself.',
    name: 'Hodan Abdi',
    role: 'Final-year student',
    dept: 'Computer Science',
    avatar: avatarStudentF,
  },
  {
    quote: 'The queue gives me the oldest submission with its analysis ready. I accept, request changes, or reject once — with the reason recorded.',
    name: 'Dr. Sagal Warsame',
    role: 'Project teacher',
    dept: 'Faculty of Engineering',
    avatar: avatarSupervisor,
  },
  {
    quote: 'My teammates joined by HU ID and the project group chat keeps every file and message on the project record.',
    name: 'Mohamed Yusuf',
    role: 'Team lead',
    dept: 'Information Technology',
    avatar: avatarStudentM,
  },
] as const;

const faqs = [
  ['How do I send a project to my teacher?', 'Open My Projects and choose the teacher by name or University ID, then add the title, abstract and an optional PDF. The project is created with the status “pending teacher” and the teacher is notified.'],
  ['What can I attach to a proposal?', 'One PDF, up to 3 MB. The file type and signature are both verified, and the PDF is stored on the project so your teacher can read it without downloading.'],
  ['How does the teacher decide?', 'The teacher opens the project, reads the prepared analysis, and uses one control with three outcomes: accept, request changes, or reject. A reason is required for the last two and is saved on the project.'],
  ['What happens if changes are requested?', 'The project moves to “changes requested” and the reason appears on your project page. You edit and send it again, and it returns to your teacher for a fresh decision.'],
  ['How are class marks calculated?', 'Your teacher enters a base score from 0 to 100 and an optional bonus of up to 20. The final mark is the total capped at 100, saved with the feedback and the time it was graded.'],
  ['Can I still submit after the deadline?', 'No. Class assignment submission closes at the deadline. Before it, you can keep updating your work as many times as you need.'],
  ['How do I know my topic is original?', 'Project Atlas checks a title across departments and reports it as available, pending or taken, and each submission is measured for similarity against existing projects.'],
  ['Who can read my project files?', 'Access follows your role. Your team and the assigned teacher see the project; administrators cannot open private teacher–student project threads.'],
] as const;

const campusFacts = [
  { icon: MapPin, title: 'Main campus, Mogadishu', text: 'KM4, Maka al-Mukarama Road — the buildings where every ProjectHub proposal is researched, written and defended.' },
  { icon: Building2, title: 'Library and lecture halls', text: 'Abstracts, PDFs and chapter drafts start in the library, then live on the project your teacher reviews.' },
  { icon: ClipboardList, title: 'Practical laboratories', text: 'Team work from the labs is proposed by HU ID, submitted as files, and marked out of 100 inside ProjectHub.' },
] as const;

const roleWork = [
  {
    role: 'Students',
    image: HU_IMAGES.heroStudents,
    login: '/login/student',
    register: '/register/student',
  },
  {
    role: 'Teachers',
    image: HU_IMAGES.library,
    login: '/login/teacher',
    register: '/register/teacher',
  },
] as const;

/** Analyses the product stores against a project. */
const analysisFacts = [
  { label: 'Project summary', text: 'Main topic, expected content and what the document actually provides.' },
  { label: 'Strengths and gaps', text: 'What is solid, what is missing, and suggested improvements.' },
  { label: 'Quality and uniqueness', text: 'A quality score, a uniqueness score and a similarity percent.' },
  { label: 'Suggested decision', text: 'Approve, request changes or reject — advisory only, with confidence and reasoning.' },
] as const;

function VisibilityRing({ value, size = 78, display }: { value: number; size?: number; display?: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="hub-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} />
        <motion.circle
          className="hub-ring__value"
          cx="32"
          cy="32"
          r={radius}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <strong>{display ?? `${value}%`}</strong>
    </span>
  );
}

function InfographicDial({
  value,
  max = 100,
  label,
  note,
  icon: Icon,
}: {
  value: number;
  max?: number;
  label: string;
  note: string;
  icon: typeof Award;
}) {
  const percent = Math.round((value / max) * 100);
  return (
    <article className="hub-dial">
      <VisibilityRing value={percent} size={118} display={String(value)} />
      <span className="hub-dial__icon" aria-hidden="true"><Icon size={14} /></span>
      <strong>{label}</strong>
      <em>{note}</em>
    </article>
  );
}

/** Hero photography: real campus slides that cross-fade and drift on scroll. */
function HeroSlides() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % HERO_SLIDES.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const slide = HERO_SLIDES[index];

  return (
    <div
      className="hub-shot hub-shot--hero"
      style={{ backgroundImage: `url(${slide.src})` }}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={slide.src}
          src={slide.src}
          alt={`${UNIVERSITY_NAME} — ${slide.label}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
    </div>
  );
}

/** Click-through gallery of official Hormuud University photography. */
function CampusGallery() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const current = CAMPUS_SHOWCASE[active];

  useEffect(() => {
    if (reduced || held) return;
    const timer = window.setInterval(() => {
      setActive(index => (index + 1) % CAMPUS_SHOWCASE.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reduced, held]);

  return (
    <div className="hub-gallery">
      <div className="hub-gallery__stage" style={{ backgroundImage: `url(${current.src})` }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={current.src}
            src={current.src}
            alt={current.title}
            initial={reduced ? undefined : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
      </div>

      <div className="hub-gallery__thumbs" role="tablist" aria-label="Campus photographs">
        {CAMPUS_SHOWCASE.map((item, i) => (
          <motion.button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`hub-gallery__thumb ${i === active ? 'is-active' : ''}`}
            onClick={() => { setActive(i); setHeld(true); }}
            whileHover={reduced ? undefined : { y: -5 }}
            whileTap={{ scale: 0.97 }}
          >
            <img src={item.src} alt={item.title} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Continuous strip of campus photos — pauses when hovered. */
function CampusMarquee() {
  const reduced = useReducedMotion();
  const strip = [...CAMPUS_SHOWCASE, ...CAMPUS_SHOWCASE];
  if (reduced) return null;

  return (
    <div className="hub-marquee" aria-hidden="true">
      <div className="hub-marquee__track">
        {strip.map((item, i) => (
          <figure key={`${item.key}-${i}`}>
            <img src={item.src} alt="" loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}

/**
 * The seven real Projects.Status values, advancing on their own so the whole
 * lifecycle plays out, with each card clickable to hold a stage.
 */
function LifecyclePipeline() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  useEffect(() => {
    if (reduced || held || !inView) return;
    const timer = window.setInterval(() => {
      setActive(current => (current + 1) % lifecycle.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [reduced, held, inView]);

  const current = lifecycle[active];
  const CurrentIcon = current.icon;

  return (
    <div className="hub-flow" ref={ref}>
      <div className="hub-flow__rail">
        <motion.span
          className="hub-flow__progress"
          animate={{ width: `${((active + 1) / lifecycle.length) * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {lifecycle.map((stage, index) => {
          const StageIcon = stage.icon;
          return (
            <motion.button
              key={stage.status}
              type="button"
              className={`hub-flow__node ${index === active ? 'is-active' : ''} ${index < active ? 'is-done' : ''}`}
              onClick={() => { setActive(index); setHeld(true); }}
              whileHover={reduced ? undefined : { y: -6 }}
              whileTap={{ scale: 0.96 }}
              aria-pressed={index === active}
            >
              <motion.span
                className="hub-flow__dot"
                animate={index === active && !reduced
                  ? { scale: [1, 1.16, 1], boxShadow: ['0 0 0 0 rgba(16,185,129,.4)', '0 0 0 10px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0)'] }
                  : undefined}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <StageIcon size={15} />
              </motion.span>
              <em>{stage.label}</em>
              <code>{stage.status}</code>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={current.status}
          className="hub-flow__detail"
          initial={reduced ? undefined : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <header>
            <span className="hub-flow__badge"><CurrentIcon size={14} /> {current.actor}</span>
            <code>Status: {current.status}</code>
          </header>
          <p>{current.text}</p>
          <footer>
            <span>Progress weight used on the student dashboard</span>
            <div className="hub-flow__bar">
              <motion.i
                initial={{ width: 0 }}
                animate={{ width: `${current.weight}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <strong>{current.weight}%</strong>
          </footer>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

/** Pointer-reactive 3D tilt wrapper used on cards and the product preview. */
function Tilt({
  children,
  className = '',
  strength = 8,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [strength, -strength]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-strength, strength]), { stiffness: 220, damping: 22 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={`hub-tilt ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={event => {
        const box = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - box.left) / box.width - 0.5);
        y.set((event.clientY - box.top) / box.height - 0.5);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/** Live ticker that walks the real status values, as they appear in the database. */
function StatusTicker() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % lifecycle.length), 2000);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const stage = lifecycle[index];
  const Icon = stage.icon;

  return (
    <span className="hub-ticker">
      <i className="hub-ticker__pulse" />
      <span className="hub-ticker__label">Project status</span>
      <AnimatePresence mode="wait">
        <motion.strong
          key={stage.status}
          initial={reduced ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          <Icon size={13} /> {stage.status}
        </motion.strong>
      </AnimatePresence>
    </span>
  );
}

/** Compact ProjectHub window used as the product preview. */
function AppPreview() {
  /** Status mix a teacher sees on the dashboard — the real Projects.Status buckets. */
  const statusMix = [
    { status: 'pending_teacher', value: 62 },
    { status: 'assigned', value: 88 },
    { status: 'changes_requested', value: 44 },
    { status: 'submitted', value: 71 },
    { status: 'under_review', value: 96 },
    { status: 'approved', value: 100 },
    { status: 'rejected', value: 28 },
  ] as const;
  const tasks = [
    ['Proposal PDF · 3 MB limit', 'Accepted'],
    ['Submission version 3', 'Under review'],
    ['Class assignment', 'Graded 90/100'],
  ] as const;

  return (
    <div className="hub-app">
      <aside className="hub-app__rail">
        <span className="hub-app__mark">PH</span>
        {[LayoutDashboard, FolderKanban, UsersRound, MessageSquare, TrendingUp, Settings2].map((Icon, index) => (
          <span key={index} className={index === 0 ? 'is-active' : ''}><Icon size={14} /></span>
        ))}
      </aside>

      <div className="hub-app__body">
        <header className="hub-app__bar">
          <div>
            <span>Projects / Final year</span>
            <h3>Campus Energy Monitor</h3>
          </div>
          <div className="hub-app__tools">
            <Search size={14} />
            <Bell size={14} />
            <img src={avatarStudentF} alt="" className="hub-face hub-face--xs" />
          </div>
        </header>

        <div className="hub-app__kpis">
          <article><em>Status</em><strong>under_review</strong><span>waiting on teacher</span></article>
          <article><em>Team</em><strong>5</strong><span>joined by HU ID</span></article>
          <article><em>Uniqueness</em><strong>82</strong><i><b style={{ width: '82%' }} /></i></article>
          <article><em>Class mark</em><strong>90 / 100</strong><span>86 + 4 bonus</span></article>
        </div>

        <div className="hub-app__grid">
          <section className="hub-app__card hub-app__card--chart">
            <header><h4>Projects by status</h4><span className="hub-chip">Dashboard grouping</span></header>
            <div className="hub-bars">
              {statusMix.map(({ status, value }, index) => (
                <motion.i
                  key={status}
                  title={status}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
            <p className="hub-app__legend">pending · assigned · changes · submitted · review · approved · rejected</p>
          </section>

          <section className="hub-app__card hub-app__card--ring">
            <header><h4>Uniqueness</h4></header>
            <VisibilityRing value={82} size={72} />
            <p>Stored on the project as UniquenessScore</p>
          </section>

          <section className="hub-app__card hub-app__card--tasks">
            <header><h4>On this project</h4><span className="hub-chip">Full history kept</span></header>
            <ul>
              {tasks.map(([name, state]) => (
                <li key={name}><span><CheckCircle2 size={12} /></span><p>{name}</p><em>{state}</em></li>
              ))}
            </ul>
          </section>

          <section className="hub-app__card hub-app__card--review">
            <div className="hub-person">
              <img src={avatarSupervisor} alt="" className="hub-face hub-face--sm" />
              <div><strong>Dr. Sagal Warsame</strong><em>Assigned teacher</em></div>
              <span className="hub-status"><i /> Live</span>
            </div>
            <p>“Changes requested: add the energy baseline to chapter 3 before you submit again.”</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, restDelta: 0.001 });

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setActiveStep(step => (step + 1) % workflow.length), 2200);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <div className="hub" id="top">
      <motion.span className="hub-progress" style={{ scaleX: progress }} aria-hidden="true" />

      <header className="hub-nav">
        <div className="hub-shell hub-nav__inner">
          <Link to="/" className="hub-nav__brand" aria-label="Hormuud ProjectHub home">
            <BrandLockup size="bar" withCaption={false} className="lockup--on-light" />
          </Link>
          <nav>
            {navLinks.map((item) => (
              <a key={item.label} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <div className="hub-nav__actions">
            <Link to="/login/student" className="hub-nav__signin"><LogIn size={14} /> Log in</Link>
            <Link to="/register/student" className="hub-btn hub-btn--sm"><UserPlus size={14} /> Create account</Link>
          </div>
          <button type="button" className="hub-nav__toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="hub-shell hub-nav__sheet"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {navLinks.map((item) => (
                <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
              ))}
              <Link to="/login/student" onClick={() => setMenuOpen(false)}><LogIn size={15} /> Log in</Link>
              <Link to="/register/student" className="hub-btn" onClick={() => setMenuOpen(false)}>Sign in now</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hub-hero">
          <div className="hub-hero__bg" aria-hidden="false">
            <HeroSlides />
          </div>
          <span className="hub-hero__wash" aria-hidden="true" />
          <div className="hub-shell hub-hero__grid">
            <div className="hub-hero__copy">
              <motion.span className="hub-kicker" initial={reduced ? undefined : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {UNIVERSITY_NAME} <i /> ProjectHub
              </motion.span>
              <h1>
                {['Build.', 'Collaborate.', 'Submit.'].map((word, index) => (
                  <motion.span
                    key={word}
                    className="hub-hero__word"
                    initial={reduced ? undefined : { opacity: 0, y: 26, rotate: -3 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: 0.08 + index * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {word}
                  </motion.span>
                ))}
                <br />
                <motion.span
                  initial={reduced ? undefined : { opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  Get Approved.
                </motion.span>
              </h1>
              <motion.p initial={reduced ? undefined : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.6 }}>
                The academic project workspace for {UNIVERSITY_NAME} — send your proposal to a teacher,
                work with your team, and receive marks and feedback in one place.
              </motion.p>
              <motion.div className="hub-hero__actions" initial={reduced ? undefined : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <Link to="/register/student" className="hub-btn hub-btn--dark">Start Your Project <ArrowRight size={17} /></Link>
                <a href="#platform" className="hub-btn hub-btn--outline">Explore ProjectHub</a>
              </motion.div>
              <motion.div initial={reduced ? undefined : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                <StatusTicker />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Project lifecycle ── */}
        <section id="lifecycle" className="hub-section hub-lifecycle">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">The HU project lifecycle</span>
              <h2>Seven states. Every project lives in one of them.</h2>
              <p>These are the exact statuses ProjectHub stores on a project — not a diagram, but the record your teacher acts on.</p>
            </Reveal>
            <Reveal><LifecyclePipeline /></Reveal>
          </div>
        </section>

        {/* ── Features + product preview ── */}
        <section id="platform" className="hub-section hub-features">
          <div className="hub-shell">
            <Reveal className="hub-head">
              <span className="hub-label">Inside ProjectHub</span>
              <h2>Everything your project needs.</h2>
              <p>One connected system for proposals, teams, files, teacher decisions and the marks behind every {UNIVERSITY_NAME} project.</p>
            </Reveal>

            <div className="hub-features__layout">
              <div className="hub-features__grid">
                {features.map(({ icon: Icon, title, text }, index) => (
                  <Reveal key={title} delay={index * 0.04}>
                    <Tilt strength={6}>
                      <motion.article
                        className="hub-feature"
                        whileHover={reduced ? undefined : { y: -7, boxShadow: '0 22px 44px rgba(10,34,28,.12)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                      >
                        <motion.span className="hub-feature__icon" whileHover={reduced ? undefined : { rotate: -8, scale: 1.08 }}>
                          <Icon size={17} />
                        </motion.span>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </motion.article>
                    </Tilt>
                  </Reveal>
                ))}
              </div>

              <Reveal className="hub-features__preview" delay={0.1}>
                <Tilt className="hub-stage" strength={5}>
                  <AppPreview />
                </Tilt>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Campus gallery ── */}
        <section id="campus" className="hub-section hub-campus">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">Our campus</span>
              <h2>Built on the Hormuud University campus.</h2>
              <p>ProjectHub is the academic workspace for this campus — labs, library and lecture halls in Mogadishu, and one record for every student project.</p>
            </Reveal>
            <div className="hub-campus__facts">
              {campusFacts.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 0.06}>
                  <motion.article className="hub-campus__fact" whileHover={reduced ? undefined : { y: -5 }}>
                    <span><Icon size={18} /></span>
                    <div>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  </motion.article>
                </Reveal>
              ))}
            </div>
            <Reveal><CampusGallery /></Reveal>
          </div>
          <CampusMarquee />
        </section>

        {/* ── Workflow ── */}
        <section id="workflow" className="hub-section hub-workflow">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">Project workflow</span>
              <h2>From proposal to approved project.</h2>
              <p>Seven stages that every student and every teacher follows inside ProjectHub.</p>
            </Reveal>
            <div className="hub-workflow__track">
              <motion.span className="hub-workflow__line" initial={reduced ? undefined : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
              {workflow.map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 0.05}>
                  <motion.article
                    className={`hub-step ${activeStep === index ? 'is-active' : ''}`}
                    whileHover={reduced ? undefined : { y: -6 }}
                    onMouseEnter={() => setActiveStep(index)}
                  >
                    <motion.span
                      className="hub-step__icon"
                      animate={activeStep === index && !reduced ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                      transition={{ duration: 0.9 }}
                    >
                      <Icon size={17} />
                    </motion.span>
                    <h3><em>{String(index + 1).padStart(2, '0')}</em>{title}</h3>
                    <p>{text}</p>
                  </motion.article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Teacher visibility ── */}
        <section id="teachers" className="hub-section hub-supervisor">
          <div className="hub-shell">
            <Reveal className="hub-head">
              <span className="hub-label">For teachers</span>
              <h2>Your teacher decides once, and you see it.</h2>
              <p>Teachers open a project, read a prepared summary of what it is about, then approve, request changes or reject — with a comment that reaches you straight away.</p>
            </Reveal>

            <div className="hub-supervisor__layout">
              <Reveal className="hub-supervisor__visual">
                <motion.div className="hub-shot" style={{ backgroundImage: `url(${HU_IMAGES.library})` }} whileHover={reduced ? undefined : { scale: 1.015 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
                  <img src={HU_IMAGES.library} alt={`${UNIVERSITY_NAME} library and research spaces`} />
                </motion.div>
              </Reveal>

              <Reveal className="hub-metrics" delay={0.1}>
                {teacherMetrics.map(({ icon: Icon, label, value, note }, index) => (
                  <motion.article
                    key={label}
                    whileHover={reduced ? undefined : { y: -5 }}
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.07, duration: 0.5 }}
                  >
                    <span><Icon size={15} /></span>
                    <div><em>{label}</em><strong>{value}</strong><p>{note}</p></div>
                  </motion.article>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Document analysis ── */}
        <section className="hub-section hub-intel">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">Prepared before the decision</span>
              <h2>Every submission arrives already read.</h2>
              <p>ProjectHub extracts the text from a PDF, DOCX or TXT submission and stores an analysis on the project, so the teacher opens a briefing instead of a blank page. The teacher still makes the decision.</p>
            </Reveal>

            <div className="hub-intel__cards">
              <Reveal>
                <motion.article className="hub-intel__card" whileHover={reduced ? undefined : { y: -6 }}>
                  <header><span className="hub-label">Scores on the project</span><span className="hub-status"><i /> Stored</span></header>
                  <div className="hub-intel__health">
                    <VisibilityRing value={82} size={76} />
                    <div><strong>Uniqueness 82</strong><p>Similarity 18% against existing projects.</p></div>
                  </div>
                  <ul>
                    <li className="is-good"><CheckCircle2 size={13} /> Quality score saved with the analysis</li>
                    <li className="is-good"><CheckCircle2 size={13} /> Every submission version kept</li>
                  </ul>
                </motion.article>
              </Reveal>

              <Reveal delay={0.08}>
                <motion.article className="hub-intel__card" whileHover={reduced ? undefined : { y: -6 }}>
                  <header><span className="hub-label">What the briefing contains</span><FileStack size={16} /></header>
                  <ul className="hub-intel__risks">
                    {analysisFacts.map(item => (
                      <li key={item.label} className="is-good">
                        <span><Check size={13} /></span>
                        <div><strong>{item.label}</strong><em>{item.text}</em></div>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              </Reveal>

              <Reveal delay={0.16}>
                <motion.article className="hub-intel__card hub-intel__card--next" whileHover={reduced ? undefined : { y: -6 }}>
                  <header><span className="hub-label">The teacher decides</span><ClipboardCheck size={16} /></header>
                  <p className="hub-intel__next">“Suggested: request changes — advisory only.”</p>
                  <ul>
                    <li><Check size={13} /> One control, three outcomes</li>
                    <li><Check size={13} /> Reason required to reject or return</li>
                    <li><Check size={13} /> Saved on the project and sent to the student</li>
                  </ul>
                </motion.article>
              </Reveal>
            </div>

            <Reveal className="hub-intel__visual" delay={0.1}>
              <motion.div className="hub-shot hub-shot--wide" style={{ backgroundImage: `url(${HU_IMAGES.lab})` }} whileHover={reduced ? undefined : { scale: 1.01 }}>
                <img src={HU_IMAGES.lab} alt={`${UNIVERSITY_NAME} practical laboratory`} />
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* ── What each role opens ── */}
        <section id="portals" className="hub-section hub-portals">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">Inside the HU project workspace</span>
              <h2>Students propose. Teachers decide.</h2>
              <p>Open the portal that matches your Hormuud University role.</p>
            </Reveal>
            <div className="hub-portals__grid">
              {roleWork.map((item, index) => (
                <Reveal key={item.role} delay={index * 0.08}>
                  <motion.article className="hub-portal" whileHover={reduced ? undefined : { y: -8 }}>
                    <div className="hub-portal__photo">
                      <img src={item.image} alt="" />
                    </div>
                    <div className="hub-portal__body">
                      <h3>{item.role}</h3>
                      <div>
                        <Link to={item.login} className="hub-btn hub-btn--sm"><LogIn size={14} /> Open portal</Link>
                        {item.register && <Link to={item.register} className="hub-btn hub-btn--outline hub-btn--sm">Create account</Link>}
                      </div>
                    </div>
                  </motion.article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Statistics ── */}
        <section id="statistics" className="hub-section hub-stats">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">What ProjectHub measures</span>
              <h2>Numbers that come from your own projects.</h2>
              <p>Each ring fills to a real ProjectHub field — uniqueness, class mark, bonus, and status.</p>
            </Reveal>

            <div className="hub-infographic">
              <Reveal className="hub-infographic__dials">
                <InfographicDial icon={Activity} value={100} label="Uniqueness" note="Score per project" />
                <InfographicDial icon={Award} value={90} label="Class mark" note="86 + 4 bonus" />
              </Reveal>

              <Reveal className="hub-infographic__stage" delay={0.08}>
                <motion.span
                  className="hub-infographic__orbit hub-infographic__orbit--outer"
                  aria-hidden="true"
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
                />
                <motion.span
                  className="hub-infographic__orbit hub-infographic__orbit--mid"
                  aria-hidden="true"
                  animate={reduced ? undefined : { rotate: -360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                />
                <div className="hub-infographic__disc">
                  <motion.img
                    className="hub-infographic__campus"
                    src={HU_IMAGES.heroStudents}
                    alt=""
                    animate={reduced ? undefined : { scale: [1.08, 1.16, 1.08] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="hub-infographic__wash" aria-hidden="true" />
                  <motion.img
                    className="hub-infographic__student"
                    src={studentPortrait}
                    alt="Hormuud University student with a project notebook"
                    animate={reduced ? undefined : { y: [8, -6, 8] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <span className="hub-infographic__badge" aria-hidden="true">
                  <VisibilityRing value={100} size={78} display="100" />
                </span>
              </Reveal>

              <Reveal className="hub-infographic__dials" delay={0.12}>
                <InfographicDial icon={Star} value={20} max={20} label="Bonus cap" note="Maximum extra points" />
                <InfographicDial icon={FolderKanban} value={7} max={7} label="Statuses" note="Tracked lifecycle" />
              </Reveal>
            </div>

            <div className="hub-infographic__facts">
              {statusCards.map(({ icon: Icon, label, value }) => (
                <motion.article key={label} className="hub-infographic__fact" whileHover={reduced ? undefined : { y: -4 }}>
                  <span><Icon size={14} /></span>
                  <div><em>{label}</em><strong>{value}</strong></div>
                </motion.article>
              ))}
              <motion.article className="hub-infographic__fact" whileHover={reduced ? undefined : { y: -4 }}>
                <span><UserRoundCheck size={14} /></span>
                <div><em>Mark released</em><strong>86 + 4 = 90 / 100</strong></div>
              </motion.article>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section id="stories" className="hub-section hub-stories">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">Testimonials</span>
              <h2>Built for the people behind every project.</h2>
            </Reveal>
            <div className="hub-stories__grid">
              {testimonials.map((item, index) => (
                <Reveal key={item.name} delay={index * 0.08}>
                  <motion.article className="hub-story" whileHover={reduced ? undefined : { y: -7 }}>
                    <p>“{item.quote}”</p>
                    <footer>
                      <motion.img
                        src={item.avatar}
                        alt=""
                        className="hub-face hub-face--lg"
                        whileHover={reduced ? undefined : { scale: 1.08, rotate: -4 }}
                      />
                      <div>
                        <strong>{item.name} <BadgeCheck size={14} /></strong>
                        <span>{item.role}</span>
                        <em>{item.dept}</em>
                      </div>
                    </footer>
                  </motion.article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="hub-section hub-faq">
          <div className="hub-shell">
            <Reveal className="hub-head hub-head--center">
              <span className="hub-label">FAQ</span>
              <h2>Everything you need to know.</h2>
            </Reveal>
            <div className="hub-faq__list">
              {faqs.map(([question, answer], index) => (
                <Reveal key={question as string} delay={index * 0.03}>
                  <article className={`hub-faq__item ${openFaq === index ? 'is-open' : ''}`}>
                    <button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                      <span>{question as string}</span>
                      <i>{openFaq === index ? <Minus size={15} /> : <Plus size={15} />}</i>
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === index && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {answer as string}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing call to action ── */}
        <section className="hub-section hub-cta">
          <div className="hub-shell">
            <Reveal className="hub-cta__panel">
              <div className="hub-cta__copy">
                <span className="hub-label hub-label--light">Get started</span>
                <h2>Your project deserves a complete academic record.</h2>
                <p>Send your proposal, work with your team, and follow every teacher decision from first idea to graduation.</p>
                <div>
                  <Link to="/register/student" className="hub-btn hub-btn--light">Start Your Project <ArrowRight size={16} /></Link>
                  <a href="#workflow" className="hub-btn hub-btn--glass">Explore how it works</a>
                </div>
              </div>
              <div className="hub-cta__visual">
                <motion.img
                  src={HU_IMAGES.convocation}
                  alt={`${UNIVERSITY_NAME} graduation ceremony`}
                  initial={reduced ? undefined : { opacity: 0, scale: 1.05 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="hub-footer">
        <div className="hub-shell hub-footer__grid">
          <div className="hub-footer__brand">
            <BrandLockup size="bar" withCaption={false} />
            <p>Academic project management for {UNIVERSITY_NAME}.</p>
            <div>
              <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email ProjectHub"><Mail size={15} /></a>
              <a href={CONTACT_TEL} aria-label="Call ProjectHub"><Phone size={15} /></a>
              <a href={HU_WEBSITE} target="_blank" rel="noreferrer" aria-label="Hormuud University"><GraduationCap size={15} /></a>
            </div>
          </div>
          <div className="hub-footer__col">
            <h3>Platform</h3>
            <a href="#platform">Projects</a>
            <Link to="/login/student">Students</Link>
            <Link to="/login/teacher">Teachers</Link>
            <a href="#workflow">Approvals</a>
            <a href="#workflow">How it works</a>
          </div>
          <div className="hub-footer__col">
            <h3>On this page</h3>
            <a href="#campus">Campus</a>
            <a href="#faq">FAQ</a>
            <a href="#workflow">How it works</a>
          </div>
          <div className="hub-footer__col">
            <h3>ProjectHub</h3>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/login/admin" className="hub-footer__staff">Staff</Link>
          </div>
          <div className="hub-footer__col hub-footer__contact">
            <h3>Contact</h3>
            <a href={`mailto:${CONTACT_EMAIL}`}><Mail size={13} /> {CONTACT_EMAIL}</a>
            <a href={CONTACT_TEL}><Phone size={13} /> {CONTACT_PHONE}</a>
            <p><MapPin size={13} /> {CONTACT_CAMPUS}</p>
            <p>{CONTACT_HOURS}</p>
          </div>
        </div>
        <div className="hub-shell hub-footer__legal">
          <p>© {new Date().getFullYear()} {UNIVERSITY_NAME}. All rights reserved.</p>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
