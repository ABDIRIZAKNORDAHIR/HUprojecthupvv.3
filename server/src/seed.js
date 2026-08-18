import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seeding is disabled in production');
}

const PASSWORD = process.env.DEMO_PASSWORD || 'ProjectHub123!';

/** 1 admin + 5 teachers + 10 students */
const users = [
  { universityId: 'HU0009000', email: 'admin@hu.edu', firstName: 'James', lastName: 'Mitchell', role: 'admin', department: 'IT', specialty: null, className: null, studyMode: null },

  { universityId: 'HU0005001', email: 'swilliams@hu.edu', firstName: 'Sarah', lastName: 'Williams', role: 'teacher', department: 'Computer Science', specialty: 'Computer Science', className: null, studyMode: null },
  { universityId: 'HU0005002', email: 'jkumar@hu.edu', firstName: 'Raj', lastName: 'Kumar', role: 'teacher', department: 'Engineering', specialty: 'Engineering', className: null, studyMode: null },
  { universityId: 'HU0005003', email: 'ai.teacher@hu.edu', firstName: 'David', lastName: 'Park', role: 'teacher', department: 'Artificial Intelligence', specialty: 'Artificial Intelligence', className: null, studyMode: null },
  { universityId: 'HU0005004', email: 'n.hassan@hu.edu', firstName: 'Nadia', lastName: 'Hassan', role: 'teacher', department: 'Business', specialty: 'Business Administration', className: null, studyMode: null },
  { universityId: 'HU0005005', email: 'm.ali@hu.edu', firstName: 'Mohamed', lastName: 'Ali', role: 'teacher', department: 'Data Science', specialty: 'Data Science', className: null, studyMode: null },

  { universityId: 'HU0001001', email: 'alex.chen@hu.edu', firstName: 'Alex', lastName: 'Chen', role: 'student', department: 'CS', specialty: null, className: 'BIT 9', studyMode: 'full_time' },
  { universityId: 'HU0001002', email: 'emma.watson@hu.edu', firstName: 'Emma', lastName: 'Watson', role: 'student', department: 'CS', specialty: null, className: 'BIT 9', studyMode: 'full_time' },
  { universityId: 'HU0001003', email: 'maria.garcia@hu.edu', firstName: 'Maria', lastName: 'Garcia', role: 'student', department: 'CS', specialty: null, className: 'BIT 9', studyMode: 'part_time' },
  { universityId: 'HU0001004', email: 'james.liu@hu.edu', firstName: 'James', lastName: 'Liu', role: 'student', department: 'EE', specialty: null, className: 'BIT 9', studyMode: 'full_time' },
  { universityId: 'HU0001005', email: 'aisha.noor@hu.edu', firstName: 'Aisha', lastName: 'Noor', role: 'student', department: 'CS', specialty: null, className: 'BIT 8', studyMode: 'full_time' },
  { universityId: 'HU0001006', email: 'omar.farah@hu.edu', firstName: 'Omar', lastName: 'Farah', role: 'student', department: 'Business', specialty: null, className: 'BIT 8', studyMode: 'part_time' },
  { universityId: 'HU0001007', email: 'layla.abdi@hu.edu', firstName: 'Layla', lastName: 'Abdi', role: 'student', department: 'Data Science', specialty: null, className: 'BIT 9', studyMode: 'full_time' },
  { universityId: 'HU0001008', email: 'yusuf.hassan@hu.edu', firstName: 'Yusuf', lastName: 'Hassan', role: 'student', department: 'Engineering', specialty: null, className: 'BIT 8', studyMode: 'full_time' },
  { universityId: 'HU0001009', email: 'fatima.said@hu.edu', firstName: 'Fatima', lastName: 'Said', role: 'student', department: 'AI', specialty: null, className: 'BIT 9', studyMode: 'part_time' },
  { universityId: 'HU0001010', email: 'daniel.kim@hu.edu', firstName: 'Daniel', lastName: 'Kim', role: 'student', department: 'CS', specialty: null, className: 'BIT 9', studyMode: 'full_time' },
];

async function seed() {
  await getPool();
  const hash = await bcrypt.hash(PASSWORD, 12);
  console.log('Seeding users (password reset for demo accounts)...');

  const userIds = {};
  for (const u of users) {
    const existing = await query('SELECT UserId FROM Users WHERE Email = @email', { email: u.email });
    if (existing.recordset.length) {
      userIds[u.universityId] = existing.recordset[0].UserId;
      await query(
        `UPDATE Users SET UniversityId = @universityId, PasswordHash = @hash, Email = @email, FirstName = @firstName, LastName = @lastName,
         Role = @role, Department = @department, Specialty = @specialty, ClassName = @className, StudyMode = @studyMode, IsActive = 1, AccountStatus = 'approved' WHERE Email = @email`,
        { universityId: u.universityId, hash, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, department: u.department, specialty: u.specialty || null, className: u.className || null, studyMode: u.studyMode || null }
      );
      console.log(`  Updated ${u.role}: ${u.universityId} / ${u.email}`);
      continue;
    }
    const r = await query(
      `INSERT INTO Users (UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department, Specialty, ClassName, StudyMode, IsActive, AccountStatus)
       OUTPUT INSERTED.UserId VALUES (@universityId, @email, @hash, @firstName, @lastName, @role, @department, @specialty, @className, @studyMode, 1, 'approved')`,
      { universityId: u.universityId, email: u.email, hash, firstName: u.firstName, lastName: u.lastName, role: u.role, department: u.department, specialty: u.specialty || null, className: u.className || null, studyMode: u.studyMode || null }
    );
    userIds[u.universityId] = r.recordset[0].UserId;
    console.log(`  Created ${u.role}: ${u.universityId} / ${u.email}`);
  }

  const projects = [
    { id: 'PRJ-CS-2026-001', title: 'AI-Powered Crop Yield Prediction', abstract: 'Machine learning system using satellite imagery and IoT sensors for crop yield prediction.', student: 'HU0001002', teacher: 'HU0005001' },
    { id: 'PRJ-CS-2026-002', title: 'Blockchain Supply Chain Tracker', abstract: 'Decentralized supply chain platform using Hyperledger Fabric with smart contracts.', student: 'HU0001001', teacher: 'HU0005001' },
    { id: 'PRJ-CS-2026-003', title: 'Distributed Ledger for Logistics', abstract: 'Blockchain solution for logistics companies to track shipments in real-time.', student: 'HU0001003', teacher: 'HU0005002' },
    { id: 'PRJ-EE-2026-001', title: 'Neural Interface for Prosthetics', abstract: 'Brain-computer interface for prosthetic limb control via EEG signal processing.', student: 'HU0001004', teacher: 'HU0005003' },
    { id: 'PRJ-DS-2026-001', title: 'Student Success Analytics Dashboard', abstract: 'Predictive analytics to identify at-risk students using academic and engagement data.', student: 'HU0001007', teacher: 'HU0005005' },
  ];

  console.log('Seeding projects...');
  for (const p of projects) {
    const exists = await query('SELECT ProjectId FROM Projects WHERE TeacherAssignedId = @id', { id: p.id });
    if (exists.recordset.length) continue;
    const ownerId = userIds[p.student];
    const teacherId = userIds[p.teacher];
    const r = await query(
      `INSERT INTO Projects (TeacherAssignedId, Title, Abstract, AssignedByTeacherId, OwnerStudentId, Status)
       OUTPUT INSERTED.ProjectId VALUES (@id, @title, @abstract, @teacherId, @ownerId, 'assigned')`,
      { id: p.id, title: p.title, abstract: p.abstract, teacherId, ownerId }
    );
    await query(
      'INSERT INTO ProjectMembers (ProjectId, StudentId, InvitedByStudentId) VALUES (@projectId, @studentId, @studentId)',
      { projectId: r.recordset[0].ProjectId, studentId: ownerId }
    );
    console.log(`  Created project: ${p.id}`);
  }

  const settings = {
    theme_primary: '#008037',
    theme_secondary: '#2563EB',
    theme_accent: '#7C3AED',
    university_name: 'Hormuud University',
    university_short: 'HU',
    logo_path: '/projecthub-logo.png',
    ai_similarity_threshold: '60',
  };
  for (const [key, value] of Object.entries(settings)) {
    await query(
      `MERGE Settings AS t USING (SELECT @key AS SettingKey, @value AS SettingValue) AS s ON t.SettingKey = s.SettingKey
       WHEN MATCHED THEN UPDATE SET SettingValue = @value
       WHEN NOT MATCHED THEN INSERT (SettingKey, SettingValue) VALUES (@key, @value);`,
      { key, value }
    );
  }

  const teachers = users.filter((u) => u.role === 'teacher');
  const students = users.filter((u) => u.role === 'student');

  console.log('\nSeed complete!');
  console.log(`Database: ProjectHub (MySQL)`);
  console.log(`Password for ALL accounts: ${PASSWORD}`);
  console.log(`\nAdmin (email only): admin@hu.edu`);
  console.log(`\nTeachers (${teachers.length}):`);
  for (const t of teachers) console.log(`  ${t.universityId}  ${t.email}`);
  console.log(`\nStudents (${students.length}):`);
  for (const s of students) console.log(`  ${s.universityId}  ${s.email}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
