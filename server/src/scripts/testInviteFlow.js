/**
 * End-to-end test: propose project → invite member → load team
 */
const API = 'http://localhost:3004/api';

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function main() {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'alex.chen@hu.edu', password: 'ProjectHub123!', universityId: 'HU0001001', role: 'student' },
  });
  const token = login.token;
  console.log('1. login ok');

  let projects = await api('/projects', { token });
  let projectId = projects.projects?.[0]?.ProjectId;

  if (!projectId) {
    const teachers = await api('/student/teachers', { token });
    const teacherId = teachers.teachers?.[0]?.UserId;
    if (!teacherId) throw new Error('No teacher available');
    const proposed = await api('/student/propose-project', {
      method: 'POST',
      token,
      body: { teacherId, title: 'Team Invite Test Project', abstract: 'Testing invite flow' },
    });
    projectId = proposed.project.ProjectId;
    console.log('2. created project', projectId);
  } else {
    console.log('2. using existing project', projectId);
  }

  const invite = await api('/student/invite-member', {
    method: 'POST',
    token,
    body: { projectId, universityId: 'HU0001003', inviteNote: 'Join our team' },
  });
  console.log('3. invite ok:', invite.message);

  const team = await api('/student/team', { token });
  console.log('4. team ok:', team.team.length, 'rows');
  if (!team.team.length) throw new Error('Team query returned no rows');

  console.log('\nAll invite flow checks passed.');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
