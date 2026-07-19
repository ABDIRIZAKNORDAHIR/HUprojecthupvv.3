import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getPool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS Users (
  UserId INT AUTO_INCREMENT PRIMARY KEY,
  UniversityId VARCHAR(20) NOT NULL UNIQUE,
  Email VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL,
  FirstName VARCHAR(100) NOT NULL,
  LastName VARCHAR(100) NOT NULL,
  Role VARCHAR(20) NOT NULL,
  Department VARCHAR(100),
  IsActive TINYINT(1) NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  LastLoginAt DATETIME NULL,
  LastSeenAt DATETIME NULL,
  Specialty VARCHAR(100),
  ProfileImageUrl LONGTEXT,
  AccountStatus VARCHAR(20) NOT NULL DEFAULT 'approved',
  PlainPassword VARCHAR(255),
  Phone VARCHAR(30),
  Bio TEXT,
  ContactInfo VARCHAR(500),
  ClassName VARCHAR(50),
  StudyMode VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS EmailOtps (
  OtpId INT AUTO_INCREMENT PRIMARY KEY,
  Email VARCHAR(255) NOT NULL,
  Purpose VARCHAR(40) NOT NULL,
  CodeHash VARCHAR(255) NOT NULL,
  PayloadJson TEXT NULL,
  ExpiresAt DATETIME NOT NULL,
  Attempts INT NOT NULL DEFAULT 0,
  ConsumedAt DATETIME NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX IX_EmailOtps_EmailPurpose (Email, Purpose)
);

CREATE TABLE IF NOT EXISTS Settings (
  SettingKey VARCHAR(100) PRIMARY KEY,
  SettingValue TEXT NOT NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedBy INT NULL
);

CREATE TABLE IF NOT EXISTS Projects (
  ProjectId INT AUTO_INCREMENT PRIMARY KEY,
  TeacherAssignedId VARCHAR(50) NOT NULL UNIQUE,
  Title VARCHAR(500) NOT NULL,
  Abstract TEXT,
  Description TEXT,
  AssignedByTeacherId INT NOT NULL,
  OwnerStudentId INT NULL,
  Status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  AssignedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SubmittedAt DATETIME NULL,
  ReviewedAt DATETIME NULL,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  RejectionReason TEXT,
  CHECK (Status IN ('pending_teacher','assigned','submitted','under_review','approved','rejected','changes_requested'))
);

CREATE TABLE IF NOT EXISTS ProjectMembers (
  ProjectMemberId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  StudentId INT NOT NULL,
  InvitedByStudentId INT NULL,
  JoinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MemberNote TEXT,
  UNIQUE KEY UQ_ProjectMembers (ProjectId, StudentId)
);

CREATE TABLE IF NOT EXISTS ProjectInvitations (
  InvitationId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  InvitedStudentId INT NOT NULL,
  InvitedByStudentId INT NOT NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'pending',
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  InviteNote TEXT,
  UNIQUE KEY UQ_ProjectInvitations (ProjectId, InvitedStudentId)
);

CREATE TABLE IF NOT EXISTS Submissions (
  SubmissionId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  SubmittedByStudentId INT NOT NULL,
  Title VARCHAR(500) NOT NULL,
  Abstract TEXT NOT NULL,
  Content TEXT,
  SubmittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS AIAnalyses (
  AnalysisId INT AUTO_INCREMENT PRIMARY KEY,
  SubmissionId INT NOT NULL,
  ProjectId INT NOT NULL,
  UniquenessScore DECIMAL(5,2) NOT NULL,
  AIConfidence DECIMAL(5,2) NOT NULL,
  SimilarProjectId INT NULL,
  SimilarProjectAssignedId VARCHAR(50) NULL,
  SimilarityPercent DECIMAL(5,2) NULL,
  AISuggestion TEXT NOT NULL,
  SuggestedAction VARCHAR(50) NOT NULL,
  RejectionReasons TEXT,
  AnalyzedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Messages (
  MessageId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  SenderId INT NOT NULL,
  ReceiverId INT NOT NULL,
  Content TEXT NOT NULL,
  SentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  IsRead TINYINT(1) NOT NULL DEFAULT 0,
  AttachmentType VARCHAR(20),
  AttachmentName VARCHAR(255),
  AttachmentData LONGTEXT,
  MessageScope VARCHAR(30) NOT NULL DEFAULT 'teacher_student'
);

CREATE TABLE IF NOT EXISTS Notifications (
  NotificationId INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  Title VARCHAR(200) NOT NULL,
  Message TEXT NOT NULL,
  Type VARCHAR(50) NOT NULL DEFAULT 'info',
  RelatedProjectId INT NULL,
  IsRead TINYINT(1) NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Conversations (
  ConversationId INT AUTO_INCREMENT PRIMARY KEY,
  ConversationType VARCHAR(30) NOT NULL,
  ProjectId INT NULL,
  Title VARCHAR(200),
  CreatedBy INT NOT NULL,
  IsArchived TINYINT(1) NOT NULL DEFAULT 0,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (ConversationType IN ('teacher_student','student_direct','project_group'))
);

CREATE TABLE IF NOT EXISTS ConversationMembers (
  ConversationMemberId INT AUTO_INCREMENT PRIMARY KEY,
  ConversationId INT NOT NULL,
  UserId INT NOT NULL,
  JoinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_ConversationMembers (ConversationId, UserId)
);

CREATE TABLE IF NOT EXISTS ConversationMessages (
  ConversationMessageId INT AUTO_INCREMENT PRIMARY KEY,
  ConversationId INT NOT NULL,
  SenderId INT NOT NULL,
  Content TEXT NOT NULL,
  AttachmentType VARCHAR(20),
  AttachmentName VARCHAR(255),
  AttachmentData LONGTEXT,
  SentAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  IsRead TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ProjectEvaluations (
  EvaluationId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  StudentId INT NOT NULL,
  TeacherId INT NOT NULL,
  Grade DECIMAL(5,2) NULL,
  Feedback TEXT NOT NULL,
  Remarks TEXT,
  EvaluatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS DocumentAnalyses (
  DocumentAnalysisId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NULL,
  MessageId INT NULL,
  ConversationMessageId INT NULL,
  FileName VARCHAR(255) NOT NULL,
  FileType VARCHAR(20) NOT NULL,
  Summary TEXT,
  MainTopic VARCHAR(500),
  KeyPoints TEXT,
  Objectives TEXT,
  QualityScore DECIMAL(5,2),
  RelatedToProject TINYINT(1) NOT NULL DEFAULT 0,
  GrammarIssues TEXT,
  MissingSections TEXT,
  PlagiarismNote TEXT,
  Suggestions TEXT,
  AiMetadata TEXT,
  AnalyzedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ProjectAIChatMessages (
  MessageId INT AUTO_INCREMENT PRIMARY KEY,
  ProjectId INT NOT NULL,
  TeacherId INT NOT NULL,
  Role VARCHAR(10) NOT NULL,
  Content TEXT NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (Role IN ('user','assistant'))
);

CREATE TABLE IF NOT EXISTS ClassAssignments (
  AssignmentId INT AUTO_INCREMENT PRIMARY KEY,
  TeacherId INT NOT NULL,
  ClassName VARCHAR(50) NOT NULL,
  StudyMode VARCHAR(20) NULL,
  Title VARCHAR(500) NOT NULL,
  Instructions TEXT,
  OpensAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DeadlineAt DATETIME NOT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  IsClosed TINYINT(1) NOT NULL DEFAULT 0,
  ClosedNotified TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ClassAssignmentSubmissions (
  SubmissionId INT AUTO_INCREMENT PRIMARY KEY,
  AssignmentId INT NOT NULL,
  StudentId INT NOT NULL,
  Content TEXT NOT NULL,
  AttachmentName VARCHAR(255),
  AttachmentData LONGTEXT,
  SubmittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_ClassAssignmentStudent (AssignmentId, StudentId)
);

CREATE TABLE IF NOT EXISTS PushSubscriptions (
  SubscriptionId INT AUTO_INCREMENT PRIMARY KEY,
  UserId INT NOT NULL,
  Endpoint VARCHAR(500) NOT NULL,
  P256dh VARCHAR(255) NOT NULL,
  Auth VARCHAR(255) NOT NULL,
  UserAgent VARCHAR(255) NULL,
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY UQ_PushEndpoint (Endpoint),
  INDEX IX_Push_UserId (UserId)
);
`;

async function runSetupMySql() {
  console.log('[DB Setup] Connecting to MySQL...');

  const dbName = process.env.DB_DATABASE || 'ProjectHub';
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  const tempConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await tempConnection.end();

  await getPool();

  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    await query(stmt);
  }

  // Widen large payload columns on existing DBs (TEXT ~64KB is too small for base64 images)
  const widenColumns = [
    ['Users', 'ProfileImageUrl', 'LONGTEXT NULL'],
    ['Messages', 'AttachmentData', 'LONGTEXT NULL'],
    ['ConversationMessages', 'AttachmentData', 'LONGTEXT NULL'],
    ['Submissions', 'Content', 'LONGTEXT NULL'],
    ['DocumentAnalyses', 'AiMetadata', 'LONGTEXT NULL'],
    ['Settings', 'SettingValue', 'LONGTEXT NOT NULL'],
  ];
  for (const [table, column, definition] of widenColumns) {
    try {
      await query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
    } catch (err) {
      console.warn(`[DB Setup] Could not widen ${table}.${column}:`, err.message);
    }
  }

  // New student class fields (existing DBs)
  for (const [column, definition] of [
    ['ClassName', 'VARCHAR(50) NULL'],
    ['StudyMode', 'VARCHAR(20) NULL'],
  ]) {
    try {
      await query(`ALTER TABLE Users ADD COLUMN ${column} ${definition}`);
    } catch {
      /* column already exists */
    }
  }

  await query(`
    DELETE cm FROM ConversationMembers cm
    JOIN Conversations c ON c.ConversationId = cm.ConversationId
    JOIN Users u ON u.UserId = cm.UserId
    WHERE u.Role = 'admin'
      AND c.ConversationType IN ('teacher_student', 'project_group')
  `);

  const settings = [
    ['theme_primary', '#16A34A'],
    ['theme_secondary', '#0F2D5C'],
    ['university_name', 'Hormuud University'],
    ['university_short', 'HU'],
    ['logo_path', '/projecthub-logo.png'],
    ['ai_similarity_threshold', '60'],
    ['db_server', 'local-mysql'],
  ];

  for (const [key, value] of settings) {
    await query(
      `INSERT INTO Settings (SettingKey, SettingValue) VALUES (@key, @value)
       ON DUPLICATE KEY UPDATE SettingValue = VALUES(SettingValue)`,
      { key, value }
    );
  }

  const adminCheck = await query(`SELECT COUNT(*) AS c FROM Users WHERE Role = 'admin'`);
  if (Number(adminCheck.recordset[0].c) === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'ProjectHub123!', 12);
    await query(
      `INSERT INTO Users (UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department)
       VALUES (@uid, @email, @hash, @fn, @ln, 'admin', 'Administration')`,
      {
        uid: process.env.ADMIN_UNIVERSITY_ID || 'HU0009000',
        email: (process.env.ADMIN_EMAIL || 'daacadnuur646@gmail.com').toLowerCase().trim(),
        hash,
        fn: process.env.ADMIN_FIRST_NAME || 'System',
        ln: process.env.ADMIN_LAST_NAME || 'Administrator',
      }
    );
    console.log('[DB Setup] Created admin account:', process.env.ADMIN_UNIVERSITY_ID || 'HU0009000');
  } else {
    // Keep existing admin email aligned with ADMIN_EMAIL when set
    if (process.env.ADMIN_EMAIL) {
      await query(
        `UPDATE Users SET Email = @email WHERE Role = 'admin'`,
        { email: process.env.ADMIN_EMAIL.toLowerCase().trim() }
      );
    }
  }

  console.log('[DB Setup] MySQL database ready');
  return { ok: true, driver: 'mysql' };
}

export async function ensureDatabaseMySql() {
  try {
    return await runSetupMySql();
  } catch (err) {
    console.error('[DB Setup] MySQL FAILED:', err.message);
    return { ok: false, error: err.message };
  }
}

if (process.argv[1]?.includes('setupDatabaseMySql')) {
  ensureDatabaseMySql().then(r => process.exit(r.ok ? 0 : 1));
}
