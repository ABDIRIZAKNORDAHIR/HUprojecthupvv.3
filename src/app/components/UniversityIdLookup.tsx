import { useEffect, useRef, useState } from 'react';
import { Search, IdCard, Mail, GraduationCap } from 'lucide-react';
import { api } from '../api/client';
import { UserAvatar } from './UserAvatar';
import { formatUniversityId, UNIVERSITY_ID_HINT } from '../utils/universityId';

export interface LookupPerson {
  UserId: number;
  UniversityId: string;
  Email?: string;
  FirstName: string;
  LastName: string;
  Department?: string;
  Specialty?: string;
  ActiveProjects?: number;
}

interface UniversityIdLookupProps {
  role: 'student' | 'teacher';
  value: string;
  onChange: (value: string) => void;
  onFound: (person: LookupPerson | null) => void;
  placeholder?: string;
  label?: string;
}

export function UniversityIdLookup({
  role, value, onChange, onFound, placeholder, label,
}: UniversityIdLookupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [person, setPerson] = useState<LookupPerson | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLookup = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPerson(null);
      setError('');
      onFound(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (role === 'student') {
        const r = await api.lookupStudent(trimmed);
        const s = r.student as LookupPerson;
        setPerson(s);
        onFound(s);
      } else {
        const r = await api.lookupTeacher(trimmed);
        const t = r.teacher as LookupPerson;
        setPerson(t);
        onFound(t);
      }
    } catch (e) {
      setPerson(null);
      onFound(null);
      setError(e instanceof Error ? e.message : `${role === 'student' ? 'Student' : 'Teacher'} not found`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setPerson(null);
      setError('');
      onFound(null);
      return;
    }
    debounceRef.current = setTimeout(() => runLookup(value), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, role]);

  return (
    <div>
      {label && <label className="text-sm font-semibold">{label}</label>}
      <div className={`flex gap-2 ${label ? 'mt-1' : ''}`}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || (role === 'student' ? 'HU000-1002' : 'HU000-5001')}
          className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-mono"
        />
        <button type="button" onClick={() => runLookup(value)} disabled={loading || !value.trim()}
          className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50">
          <Search size={16} />
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{UNIVERSITY_ID_HINT}</p>
      {loading && <p className="text-xs text-gray-500 mt-2">Looking up account...</p>}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {person && !error && (
        <div className="mt-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-[10px] uppercase font-bold text-green-700 mb-2">Account found — you can proceed</p>
          <div className="flex items-center gap-3">
            <UserAvatar firstName={person.FirstName} lastName={person.LastName} role={role} size="md" />
            <div className="min-w-0">
              <p className="font-bold text-gray-900">{person.FirstName} {person.LastName}</p>
              <p className="font-mono text-sm font-bold text-green-700 flex items-center gap-1">
                <IdCard size={13} /> {formatUniversityId(person.UniversityId)}
              </p>
              {person.Department && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <GraduationCap size={11} /> {person.Specialty || person.Department}
                </p>
              )}
              {person.Email && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Mail size={11} /> {person.Email}
                </p>
              )}
              {role === 'teacher' && person.ActiveProjects != null && (
                <p className="text-xs text-gray-500 mt-1">{person.ActiveProjects} active project(s)</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
