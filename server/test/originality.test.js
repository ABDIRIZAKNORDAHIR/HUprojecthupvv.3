import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeSubmission, batchAnalyzeSubmissions, formatOwnerLine } from '../src/services/athena.js';

const amina = {
  ProjectId: 11,
  TeacherAssignedId: 'HU-P-11',
  Title: 'Human Resources',
  Abstract: 'A campus human resources management system for staff records.',
  Status: 'submitted',
  OwnerStudentId: 101,
  AssignedAt: '2026-03-01T08:00:00.000Z',
  StudentName: 'Amina Ali',
  StudentUniversityId: 'HU2026101',
  Department: 'Business Administration',
  ClassName: 'CA221',
  StudyMode: 'Full-time',
  ProfileImageUrl: '/uploads/amina.jpg',
};

const omar = {
  ProjectId: 22,
  TeacherAssignedId: 'HU-P-22',
  Title: 'Human Resources',
  Abstract: 'Human resources portal for hiring and payroll.',
  Status: 'submitted',
  OwnerStudentId: 202,
  AssignedAt: '2026-03-01T08:00:01.000Z',
  StudentName: 'Omar Nur',
  StudentUniversityId: 'HU2026202',
  Department: 'Business Administration',
  ClassName: 'CA221',
  StudyMode: 'Full-time',
};

test('the earlier topic owner is original even if another student submits one second later', () => {
  const first = analyzeSubmission(
    {
      title: amina.Title,
      abstract: amina.Abstract,
      projectId: amina.ProjectId,
      assignedAt: amina.AssignedAt,
      studentName: amina.StudentName,
      universityId: amina.StudentUniversityId,
      department: amina.Department,
      className: amina.ClassName,
      studyMode: amina.StudyMode,
      photo: amina.ProfileImageUrl,
      teacherAssignedId: amina.TeacherAssignedId,
      ownerStudentId: amina.OwnerStudentId,
    },
    [amina, omar],
    60,
  );

  assert.equal(first.is_original, true);
  assert.equal(first.uniqueness_score, 100);
  assert.equal(first.original_owner.universityId, 'HU2026101');
  assert.equal(first.original_owner.name, 'Amina Ali');
  assert.equal(first.suggested_action, 'approve');
});

test('the later similar project points at the original student identity, not a timestamp', () => {
  const second = analyzeSubmission(
    {
      title: omar.Title,
      abstract: omar.Abstract,
      projectId: omar.ProjectId,
      assignedAt: omar.AssignedAt,
      studentName: omar.StudentName,
      universityId: omar.StudentUniversityId,
      department: omar.Department,
      teacherAssignedId: omar.TeacherAssignedId,
      ownerStudentId: omar.OwnerStudentId,
    },
    [amina, omar],
    60,
  );

  assert.equal(second.is_original, false);
  assert.ok(second.uniqueness_score < 40);
  assert.equal(second.original_owner.name, 'Amina Ali');
  assert.equal(second.original_owner.universityId, 'HU2026101');
  assert.equal(second.original_owner.department, 'Business Administration');
  assert.equal(second.original_owner.className, 'CA221');
  assert.match(second.ai_suggestion, /Amina Ali/);
  assert.match(second.ai_suggestion, /HU2026101/);
});

test('batch scan labels the original owner and the later copy', () => {
  const rows = batchAnalyzeSubmissions(
    [
      {
        projectId: amina.ProjectId,
        title: amina.Title,
        abstract: amina.Abstract,
        assignedAt: amina.AssignedAt,
        studentName: amina.StudentName,
        universityId: amina.StudentUniversityId,
        department: amina.Department,
        className: amina.ClassName,
        teacherAssignedId: amina.TeacherAssignedId,
        ownerStudentId: amina.OwnerStudentId,
        photo: amina.ProfileImageUrl,
      },
      {
        projectId: omar.ProjectId,
        title: omar.Title,
        abstract: omar.Abstract,
        assignedAt: omar.AssignedAt,
        studentName: omar.StudentName,
        universityId: omar.StudentUniversityId,
        department: omar.Department,
        teacherAssignedId: omar.TeacherAssignedId,
        ownerStudentId: omar.OwnerStudentId,
      },
    ],
    [amina, omar],
    60,
  );

  assert.equal(rows[0].isOriginal, true);
  assert.equal(rows[0].action, 'Approve');
  assert.equal(rows[0].collidesWith, 'None');
  assert.equal(rows[1].isOriginal, false);
  assert.equal(rows[1].collidesWith, formatOwnerLine({
    name: 'Amina Ali',
    universityId: 'HU2026101',
    department: 'Business Administration',
  }));
  assert.equal(rows[1].originalOwner.photo, '/uploads/amina.jpg');
});
