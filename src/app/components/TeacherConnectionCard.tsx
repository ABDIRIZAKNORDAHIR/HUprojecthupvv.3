import { motion, useReducedMotion } from 'motion/react';
import { Link2, Mail, MessageSquare, ShieldCheck, Video } from 'lucide-react';
import { Link } from 'react-router';
import { UserAvatar } from './UserAvatar';
import type { Role } from '../types';

interface PersonInfo {
  name: string;
  universityId: string;
  email?: string;
  department?: string;
  profileImageUrl?: string | null;
  role: Role;
  userId?: number | null;
}

interface TeacherConnectionCardProps {
  teacher: PersonInfo;
  student?: PersonInfo;
  projectTitle: string;
  projectId: number;
  viewerRole: Role;
}

function Party({
  person, label, tone, href,
}: { person: PersonInfo; label: string; tone: 'teacher' | 'student'; href?: string }) {
  const body = (
    <>
      <UserAvatar
        firstName={person.name.split(' ')[0]}
        lastName={person.name.split(' ').slice(1).join(' ')}
        profileImageUrl={person.profileImageUrl}
        role={tone}
        size="lg"
      />
      <span className="connection-party__label">{label}</span>
      <strong className="connection-party__name">{person.name}</strong>
      <span className="connection-party__id">{person.universityId}</span>
      {person.department && <span className="connection-party__dept">{person.department}</span>}
      {person.email && (
        <span className="connection-party__mail" title={person.email}>
          <Mail size={11} /> {person.email}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link to={href} className={`connection-party connection-party--${tone} connection-party--link`}>
        {body}
      </Link>
    );
  }
  return (
    <div className={`connection-party connection-party--${tone}`}>
      {body}
    </div>
  );
}

export function TeacherConnectionCard({
  teacher, student, projectTitle, projectId, viewerRole,
}: TeacherConnectionCardProps) {
  const videoRoom = `https://meet.jit.si/ProjectHub-${projectId}`;
  const reducedMotion = useReducedMotion();

  return (
    <motion.section
      className="connection-card"
      initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Teacher and student connection"
    >
      <header className="connection-card__head">
        <span className="connection-card__icon"><Link2 size={17} /></span>
        <div>
          <h3>Supervision link</h3>
          <p>Direct line between the assigned teacher and student on <strong>{projectTitle}</strong>.</p>
        </div>
        <span className="connection-card__seal"><ShieldCheck size={12} /> Verified pairing</span>
      </header>

      <div className="connection-card__body">
        <Party person={teacher} label="Assigned teacher" tone="teacher" />

        <div className="connection-bridge">
          <span className="connection-bridge__line" aria-hidden="true">
            {!reducedMotion && <i />}
          </span>
          <div className="connection-bridge__actions">
            <Link to={`/projects/${projectId}#chat`} className="connection-action connection-action--chat">
              <MessageSquare size={14} /> Message
            </Link>
            <a href={videoRoom} target="_blank" rel="noreferrer" className="connection-action connection-action--call">
              <Video size={14} /> Video call
            </a>
          </div>
          <span className="connection-bridge__line" aria-hidden="true">
            {!reducedMotion && <i />}
          </span>
        </div>

        {student ? (
          <Party
            person={student}
            label="Student"
            tone="student"
            href={viewerRole === 'teacher' && student.userId ? `/students/${student.userId}` : undefined}
          />
        ) : (
          <div className="connection-party connection-party--empty">
            <span className="connection-party__placeholder">—</span>
            <strong className="connection-party__name">
              {viewerRole === 'student' ? 'You' : 'No student assigned'}
            </strong>
          </div>
        )}
      </div>
    </motion.section>
  );
}
