import { Link2, Mail, MessageSquare, Video } from 'lucide-react';
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
}

interface TeacherConnectionCardProps {
  teacher: PersonInfo;
  student?: PersonInfo;
  projectTitle: string;
  projectId: number;
  viewerRole: Role;
}

export function TeacherConnectionCard({
  teacher, student, projectTitle, projectId, viewerRole,
}: TeacherConnectionCardProps) {
  const videoRoom = `https://meet.jit.si/ProjectHub-${projectId}`;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl border border-blue-100 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={18} className="text-blue-600" />
        <h3 className="font-bold text-base text-gray-900">Teacher ↔ Student Connection</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Project: <strong>{projectTitle}</strong> — direct line between assigned teacher and student
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        {/* Teacher */}
        <div className="flex flex-col items-center text-center bg-white rounded-xl border p-4 w-full sm:w-44 shadow-sm">
          <UserAvatar
            firstName={teacher.name.split(' ')[0]}
            lastName={teacher.name.split(' ').slice(1).join(' ')}
            profileImageUrl={teacher.profileImageUrl}
            role="teacher"
            size="lg"
          />
          <p className="font-bold text-sm mt-2">{teacher.name}</p>
          <p className="text-[10px] uppercase font-bold text-blue-600 mt-0.5">Assigned Teacher</p>
          <p className="font-mono text-xs text-green-700 font-semibold mt-1">{teacher.universityId}</p>
          {teacher.department && <p className="text-xs text-gray-500">{teacher.department}</p>}
          {teacher.email && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Mail size={10} /> {teacher.email}</p>
          )}
        </div>

        {/* Connection line */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block w-16 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 rounded" />
          <div className="flex flex-col gap-1.5">
            <Link to={`/projects/${projectId}#chat`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
              <MessageSquare size={12} /> Chat
            </Link>
            <a href={videoRoom} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700">
              <Video size={12} /> Video Call
            </a>
          </div>
          <div className="hidden sm:block w-16 h-0.5 bg-gradient-to-r from-green-400 to-blue-400 rounded" />
        </div>

        {/* Student */}
        <div className="flex flex-col items-center text-center bg-white rounded-xl border p-4 w-full sm:w-44 shadow-sm">
          {student ? (
            <>
              <UserAvatar
                firstName={student.name.split(' ')[0]}
                lastName={student.name.split(' ').slice(1).join(' ')}
                profileImageUrl={student.profileImageUrl}
                role="student"
                size="lg"
              />
              <p className="font-bold text-sm mt-2">{student.name}</p>
              <p className="text-[10px] uppercase font-bold text-green-600 mt-0.5">Student</p>
              <p className="font-mono text-xs text-green-700 font-semibold mt-1">{student.universityId}</p>
              {student.email && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Mail size={10} /> {student.email}</p>
              )}
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
              <p className="text-sm text-gray-500 mt-2">{viewerRole === 'student' ? 'You' : 'No student assigned'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
