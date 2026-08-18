import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getPool } from './db.js';
import { getAdminBootstrap } from './config/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS Users (
  UserId SERIAL PRIMARY KEY,
  UniversityId VARCHAR(20) NOT NULL UNIQUE,
  Email VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL,
  FirstName VARCHAR(100) NOT NULL,
  LastName VARCHAR(100) NOT NULL,
  Role VARCHAR(20) NOT NULL CHECK (Role IN ('student','teacher','admin')),
  Department VARCHAR(100),
  IsActive SMALLINT NOT NULL DEFAULT 1,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  LastLoginAt TIMESTAMPTZ,
  LastSeenAt TIMESTAMPTZ,
  Specialty VARCHAR(100),
  ProfileImageUrl TEXT,
  AccountStatus VARCHAR(20) NOT NULL DEFAULT 'approved',
  Phone VARCHAR(30),
  Bio TEXT,
  ContactInfo VARCHAR(500),
  ClassName VARCHAR(50),
  StudyMode VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS EmailOtps (
  OtpId SERIAL PRIMARY KEY,
  Email VARCHAR(255) NOT NULL,
  Purpose VARCHAR(40) NOT NULL,
  CodeHash VARCHAR(255) NOT NULL,
  PayloadJson TEXT,
  ExpiresAt TIMESTAMPTZ NOT NULL,
  Attempts INT NOT NULL DEFAULT 0,
  ConsumedAt TIMESTAMPTZ,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_EmailOtps_EmailPurpose
  ON EmailOtps (Email, Purpose);

CREATE TABLE IF NOT EXISTS AuthActionTokens (
  Jti VARCHAR(64) PRIMARY KEY,
  Purpose VARCHAR(40) NOT NULL,
  ConsumedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS AuditLogs (
  AuditLogId BIGSERIAL PRIMARY KEY,
  ActorUserId INT,
  Action VARCHAR(80) NOT NULL,
  EntityType VARCHAR(80),
  EntityId VARCHAR(80),
  MetadataJson TEXT,
  IpAddress VARCHAR(64),
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_AuditLogs_CreatedAt ON AuditLogs (CreatedAt);
CREATE INDEX IF NOT EXISTS IX_AuditLogs_Actor ON AuditLogs (ActorUserId);

CREATE TABLE IF NOT EXISTS Settings (
  SettingKey VARCHAR(100) PRIMARY KEY,
  SettingValue TEXT NOT NULL,
  UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UpdatedBy INT
);

CREATE TABLE IF NOT EXISTS Projects (
  ProjectId SERIAL PRIMARY KEY,
  TeacherAssignedId VARCHAR(50) NOT NULL UNIQUE,
  Title VARCHAR(500) NOT NULL,
  Abstract TEXT,
  Description TEXT,
  AssignedByTeacherId INT NOT NULL,
  OwnerStudentId INT,
  Status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  AssignedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  SubmittedAt TIMESTAMPTZ,
  ReviewedAt TIMESTAMPTZ,
  UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  RejectionReason TEXT,
  CONSTRAINT CK_Projects_Status CHECK (
    Status IN ('pending_teacher','assigned','submitted','under_review','approved','rejected','changes_requested')
  )
);

CREATE TABLE IF NOT EXISTS ProjectMembers (
  ProjectMemberId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL,
  StudentId INT NOT NULL,
  InvitedByStudentId INT,
  JoinedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  MemberNote TEXT,
  UNIQUE (ProjectId, StudentId)
);

CREATE TABLE IF NOT EXISTS ProjectInvitations (
  InvitationId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL,
  InvitedStudentId INT NOT NULL,
  InvitedByStudentId INT NOT NULL,
  Status VARCHAR(20) NOT NULL DEFAULT 'pending',
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  InviteNote TEXT,
  UNIQUE (ProjectId, InvitedStudentId)
);

CREATE TABLE IF NOT EXISTS Submissions (
  SubmissionId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL,
  SubmittedByStudentId INT NOT NULL,
  Title VARCHAR(500) NOT NULL,
  Abstract TEXT NOT NULL,
  Content TEXT,
  SubmittedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  Version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS AIAnalyses (
  AnalysisId SERIAL PRIMARY KEY,
  SubmissionId INT NOT NULL,
  ProjectId INT NOT NULL,
  UniquenessScore DECIMAL(5,2) NOT NULL,
  AIConfidence DECIMAL(5,2) NOT NULL,
  SimilarProjectId INT,
  SimilarProjectAssignedId VARCHAR(50),
  SimilarityPercent DECIMAL(5,2),
  AISuggestion TEXT NOT NULL,
  SuggestedAction VARCHAR(50) NOT NULL,
  RejectionReasons TEXT,
  AnalyzedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Messages (
  MessageId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL,
  SenderId INT NOT NULL,
  ReceiverId INT NOT NULL,
  Content TEXT NOT NULL,
  SentAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  IsRead SMALLINT NOT NULL DEFAULT 0,
  AttachmentType VARCHAR(20),
  AttachmentName VARCHAR(255),
  AttachmentData TEXT,
  MessageScope VARCHAR(30) NOT NULL DEFAULT 'teacher_student'
);

CREATE TABLE IF NOT EXISTS Notifications (
  NotificationId SERIAL PRIMARY KEY,
  UserId INT NOT NULL,
  Title VARCHAR(200) NOT NULL,
  Message TEXT NOT NULL,
  Type VARCHAR(50) NOT NULL DEFAULT 'info',
  RelatedProjectId INT,
  IsRead SMALLINT NOT NULL DEFAULT 0,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Conversations (
  ConversationId SERIAL PRIMARY KEY,
  ConversationType VARCHAR(30) NOT NULL CHECK (ConversationType IN ('teacher_student','student_direct','project_group')),
  ProjectId INT REFERENCES Projects(ProjectId) ON DELETE CASCADE,
  Title VARCHAR(200),
  CreatedBy INT NOT NULL REFERENCES Users(UserId),
  IsArchived SMALLINT NOT NULL DEFAULT 0,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ConversationMembers (
  ConversationMemberId SERIAL PRIMARY KEY,
  ConversationId INT NOT NULL REFERENCES Conversations(ConversationId) ON DELETE CASCADE,
  UserId INT NOT NULL REFERENCES Users(UserId),
  JoinedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ConversationId, UserId)
);

CREATE TABLE IF NOT EXISTS ConversationMessages (
  ConversationMessageId SERIAL PRIMARY KEY,
  ConversationId INT NOT NULL REFERENCES Conversations(ConversationId) ON DELETE CASCADE,
  SenderId INT NOT NULL REFERENCES Users(UserId),
  Content TEXT NOT NULL,
  AttachmentType VARCHAR(20),
  AttachmentName VARCHAR(255),
  AttachmentData TEXT,
  SentAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  IsRead SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ProjectEvaluations (
  EvaluationId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL REFERENCES Projects(ProjectId) ON DELETE CASCADE,
  StudentId INT NOT NULL REFERENCES Users(UserId),
  TeacherId INT NOT NULL REFERENCES Users(UserId),
  Grade DECIMAL(5,2),
  Feedback TEXT NOT NULL,
  Remarks TEXT,
  EvaluatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DocumentAnalyses (
  DocumentAnalysisId SERIAL PRIMARY KEY,
  ProjectId INT REFERENCES Projects(ProjectId) ON DELETE SET NULL,
  MessageId INT,
  ConversationMessageId INT,
  FileName VARCHAR(255) NOT NULL,
  FileType VARCHAR(20) NOT NULL,
  Summary TEXT,
  MainTopic VARCHAR(500),
  KeyPoints TEXT,
  Objectives TEXT,
  QualityScore DECIMAL(5,2),
  RelatedToProject SMALLINT NOT NULL DEFAULT 0,
  GrammarIssues TEXT,
  MissingSections TEXT,
  PlagiarismNote TEXT,
  Suggestions TEXT,
  AiMetadata TEXT,
  AnalyzedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ProjectAIChatMessages (
  MessageId SERIAL PRIMARY KEY,
  ProjectId INT NOT NULL REFERENCES Projects(ProjectId) ON DELETE CASCADE,
  TeacherId INT NOT NULL REFERENCES Users(UserId),
  Role VARCHAR(10) NOT NULL CHECK (Role IN ('user','assistant')),
  Content TEXT NOT NULL,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ClassAssignments (
  AssignmentId SERIAL PRIMARY KEY,
  TeacherId INT NOT NULL,
  ClassName VARCHAR(50) NOT NULL,
  StudyMode VARCHAR(20),
  Title VARCHAR(500) NOT NULL,
  Instructions TEXT,
  OpensAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  DeadlineAt TIMESTAMPTZ NOT NULL,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  IsClosed SMALLINT NOT NULL DEFAULT 0,
  ClosedNotified SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ClassAssignmentSubmissions (
  SubmissionId SERIAL PRIMARY KEY,
  AssignmentId INT NOT NULL,
  StudentId INT NOT NULL,
  Content TEXT NOT NULL,
  AttachmentName VARCHAR(255),
  AttachmentData TEXT,
  Score NUMERIC(5,2),
  BonusPoints NUMERIC(5,2) NOT NULL DEFAULT 0,
  TeacherFeedback TEXT,
  GradedAt TIMESTAMPTZ,
  GradedBy INT,
  SubmittedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (AssignmentId, StudentId)
);

CREATE TABLE IF NOT EXISTS PushSubscriptions (
  SubscriptionId SERIAL PRIMARY KEY,
  UserId INT NOT NULL,
  Endpoint VARCHAR(500) NOT NULL UNIQUE,
  P256dh VARCHAR(255) NOT NULL,
  Auth VARCHAR(255) NOT NULL,
  UserAgent VARCHAR(255),
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Push_UserId
  ON PushSubscriptions (UserId);
`;

async function runSetupPg() {
  console.log('[DB Setup] Connecting to PostgreSQL (cloud)...');
  await getPool();

  for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
    await query(stmt);
  }

  const legacyBooleanColumns = [
    ['Users', 'IsActive'],
    ['Messages', 'IsRead'],
    ['Notifications', 'IsRead'],
    ['Conversations', 'IsArchived'],
    ['ConversationMessages', 'IsRead'],
    ['DocumentAnalyses', 'RelatedToProject'],
    ['ClassAssignments', 'IsClosed'],
    ['ClassAssignments', 'ClosedNotified'],
  ];
  for (const [table, column] of legacyBooleanColumns) {
    const type = await query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND LOWER(table_name) = LOWER(@table)
         AND LOWER(column_name) = LOWER(@column)`,
      { table, column }
    );
    if (type.recordset[0]?.data_type === 'boolean') {
      await query(
        `ALTER TABLE ${table} ALTER COLUMN ${column} DROP DEFAULT`
      );
      await query(
        `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE SMALLINT
         USING (CASE WHEN ${column} THEN 1 ELSE 0 END)`
      );
      await query(
        `ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT ${table === 'Users' && column === 'IsActive' ? 1 : 0}`
      );
    }
  }

  // Invalidate accounts whose recoverable password was exposed, then remove it.
  const legacyPasswordColumn = await query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND LOWER(table_name) = 'users'
       AND LOWER(column_name) = 'plainpassword'`
  );
  if (legacyPasswordColumn.recordset.length) {
    await query(
      `UPDATE Users SET PasswordHash = '!RESET_REQUIRED!'
       WHERE PlainPassword IS NOT NULL AND PlainPassword <> ''`
    );
    await query('ALTER TABLE Users DROP COLUMN PlainPassword');
    console.warn('[Security] Removed legacy plaintext passwords; affected users must use password reset');
  }
  await query('ALTER TABLE Users ADD COLUMN IF NOT EXISTS ClassName VARCHAR(50)');
  await query('ALTER TABLE Users ADD COLUMN IF NOT EXISTS StudyMode VARCHAR(20)');
  await query('ALTER TABLE ClassAssignmentSubmissions ADD COLUMN IF NOT EXISTS Score NUMERIC(5,2)');
  await query('ALTER TABLE ClassAssignmentSubmissions ADD COLUMN IF NOT EXISTS BonusPoints NUMERIC(5,2) NOT NULL DEFAULT 0');
  await query('ALTER TABLE ClassAssignmentSubmissions ADD COLUMN IF NOT EXISTS TeacherFeedback TEXT');
  await query('ALTER TABLE ClassAssignmentSubmissions ADD COLUMN IF NOT EXISTS GradedAt TIMESTAMPTZ');
  await query('ALTER TABLE ClassAssignmentSubmissions ADD COLUMN IF NOT EXISTS GradedBy INT');

  await query(`
    DELETE FROM ConversationMembers cm
    USING Conversations c, Users u
    WHERE c.ConversationId = cm.ConversationId
      AND u.UserId = cm.UserId
      AND u.Role = 'admin'
      AND c.ConversationType IN ('teacher_student', 'project_group')
  `);

  const settings = [
    ['theme_primary', '#16A34A'],
    ['theme_secondary', '#0F2D5C'],
    ['university_name', 'Hormuud University'],
    ['university_short', 'HU'],
    ['logo_path', '/projecthub-logo.png'],
    ['ai_similarity_threshold', '60'],
    ['db_server', 'cloud-postgres'],
  ];

  for (const [key, value] of settings) {
    await query(
      `INSERT INTO Settings (SettingKey, SettingValue) VALUES (@key, @value)
       ON CONFLICT (SettingKey) DO NOTHING`,
      { key, value }
    );
  }

  const adminCheck = await query(`SELECT COUNT(*) AS c FROM Users WHERE Role = 'admin'`);
  if (Number(adminCheck.recordset[0].c) === 0) {
    const admin = getAdminBootstrap();
    const hash = await bcrypt.hash(admin.password, 12);
    await query(
      `INSERT INTO Users (UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department)
       VALUES (@uid, @email, @hash, @fn, @ln, 'admin', 'Administration')`,
      {
        uid: admin.universityId,
        email: admin.email,
        hash,
        fn: admin.firstName,
        ln: admin.lastName,
      }
    );
    console.log('[DB Setup] Created admin account:', admin.universityId);
  }

  console.log('[DB Setup] PostgreSQL database ready');
  return { ok: true, driver: 'postgres' };
}

export async function ensureDatabasePg() {
  try {
    return await runSetupPg();
  } catch (err) {
    console.error('[DB Setup] PostgreSQL FAILED:', err.message);
    return { ok: false, error: err.message };
  }
}

if (process.argv[1]?.includes('setupDatabasePg')) {
  ensureDatabasePg().then(r => process.exit(r.ok ? 0 : 1));
}
