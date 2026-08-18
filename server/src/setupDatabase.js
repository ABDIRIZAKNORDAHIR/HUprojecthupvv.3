import bcrypt from 'bcryptjs';
import { getAdminBootstrap } from './config/security.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
const serverRaw = process.env.DB_SERVER || 'AHMED666\\TEW_SQLEXPRESS';
const dbName = process.env.DB_DATABASE || 'ProjectHub';

async function getSql() {
  if (useWindowsAuth) {
    return (await import('mssql/msnodesqlv8.js')).default;
  }
  return (await import('mssql')).default;
}

function baseConfig(database) {
  if (useWindowsAuth) {
    return {
      server: serverRaw,
      database,
      options: {
        trustedConnection: true,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        encrypt: process.env.DB_ENCRYPT === 'true',
      },
    };
  }
  const [host, instance] = serverRaw.includes('\\') ? serverRaw.split('\\') : [serverRaw, undefined];
  return {
    server: host,
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      instanceName: instance,
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  };
}

async function runSetup() {
  const sql = await getSql();
  console.log(`[DB Setup] Connecting to SQL Server: ${serverRaw}`);

  // 1. Create database on master
  const masterPool = await sql.connect(baseConfig('master'));
  await masterPool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
    BEGIN
      CREATE DATABASE [${dbName}];
    END
  `);
  await masterPool.close();

  const pool = await sql.connect(baseConfig(dbName));

  const statements = [
    `IF OBJECT_ID('dbo.Users', 'U') IS NULL
     CREATE TABLE dbo.Users (
       UserId INT IDENTITY(1,1) PRIMARY KEY,
       UniversityId NVARCHAR(20) NOT NULL,
       Email NVARCHAR(255) NOT NULL,
       PasswordHash NVARCHAR(255) NOT NULL,
       FirstName NVARCHAR(100) NOT NULL,
       LastName NVARCHAR(100) NOT NULL,
       Role NVARCHAR(20) NOT NULL CHECK (Role IN ('student','teacher','admin')),
       Department NVARCHAR(100) NULL,
       IsActive BIT NOT NULL DEFAULT 1,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_Users_UniversityId UNIQUE (UniversityId),
       CONSTRAINT UQ_Users_Email UNIQUE (Email)
     )`,

    `IF OBJECT_ID('dbo.Settings', 'U') IS NULL
     CREATE TABLE dbo.Settings (
       SettingKey NVARCHAR(100) PRIMARY KEY,
       SettingValue NVARCHAR(MAX) NOT NULL,
       UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       UpdatedBy INT NULL
     )`,

    `IF OBJECT_ID('dbo.Projects', 'U') IS NULL
     CREATE TABLE dbo.Projects (
       ProjectId INT IDENTITY(1,1) PRIMARY KEY,
       TeacherAssignedId NVARCHAR(50) NOT NULL,
       Title NVARCHAR(500) NOT NULL,
       Abstract NVARCHAR(MAX) NULL,
       Description NVARCHAR(MAX) NULL,
       AssignedByTeacherId INT NOT NULL,
       OwnerStudentId INT NULL,
       Status NVARCHAR(30) NOT NULL DEFAULT 'assigned',
       AssignedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       SubmittedAt DATETIME2 NULL,
       ReviewedAt DATETIME2 NULL,
       UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_Projects_TeacherAssignedId UNIQUE (TeacherAssignedId)
     )`,

    `IF OBJECT_ID('dbo.ProjectMembers', 'U') IS NULL
     CREATE TABLE dbo.ProjectMembers (
       ProjectMemberId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL,
       StudentId INT NOT NULL,
       InvitedByStudentId INT NULL,
       JoinedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_ProjectMembers UNIQUE (ProjectId, StudentId)
     )`,

    `IF OBJECT_ID('dbo.ProjectInvitations', 'U') IS NULL
     CREATE TABLE dbo.ProjectInvitations (
       InvitationId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL,
       InvitedStudentId INT NOT NULL,
       InvitedByStudentId INT NOT NULL,
       Status NVARCHAR(20) NOT NULL DEFAULT 'pending',
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_ProjectInvitations UNIQUE (ProjectId, InvitedStudentId)
     )`,

    `IF OBJECT_ID('dbo.Submissions', 'U') IS NULL
     CREATE TABLE dbo.Submissions (
       SubmissionId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL,
       SubmittedByStudentId INT NOT NULL,
       Title NVARCHAR(500) NOT NULL,
       Abstract NVARCHAR(MAX) NOT NULL,
       Content NVARCHAR(MAX) NULL,
       SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       Version INT NOT NULL DEFAULT 1
     )`,

    `IF OBJECT_ID('dbo.AIAnalyses', 'U') IS NULL
     CREATE TABLE dbo.AIAnalyses (
       AnalysisId INT IDENTITY(1,1) PRIMARY KEY,
       SubmissionId INT NOT NULL,
       ProjectId INT NOT NULL,
       UniquenessScore DECIMAL(5,2) NOT NULL,
       AIConfidence DECIMAL(5,2) NOT NULL,
       SimilarProjectId INT NULL,
       SimilarProjectAssignedId NVARCHAR(50) NULL,
       SimilarityPercent DECIMAL(5,2) NULL,
       AISuggestion NVARCHAR(MAX) NOT NULL,
       SuggestedAction NVARCHAR(50) NOT NULL,
       RejectionReasons NVARCHAR(MAX) NULL,
       AnalyzedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF OBJECT_ID('dbo.Messages', 'U') IS NULL
     CREATE TABLE dbo.Messages (
       MessageId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL,
       SenderId INT NOT NULL,
       ReceiverId INT NOT NULL,
       Content NVARCHAR(MAX) NOT NULL,
       SentAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       IsRead BIT NOT NULL DEFAULT 0
     )`,
  ];

  for (const stmt of statements) {
    await pool.request().query(stmt);
  }

  // Migrations for existing databases
  const migrations = [
    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'LastLoginAt')
     ALTER TABLE dbo.Users ADD LastLoginAt DATETIME2 NULL, LastSeenAt DATETIME2 NULL, Specialty NVARCHAR(100) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Projects') AND name = 'RejectionReason')
     ALTER TABLE dbo.Projects ADD RejectionReason NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notifications')
     CREATE TABLE dbo.Notifications (
       NotificationId INT IDENTITY(1,1) PRIMARY KEY,
       UserId INT NOT NULL,
       Title NVARCHAR(200) NOT NULL,
       Message NVARCHAR(MAX) NOT NULL,
       Type NVARCHAR(50) NOT NULL DEFAULT 'info',
       RelatedProjectId INT NULL,
       IsRead BIT NOT NULL DEFAULT 0,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ProjectInvitations') AND name = 'InviteNote')
     ALTER TABLE dbo.ProjectInvitations ADD InviteNote NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ProjectMembers') AND name = 'MemberNote')
     ALTER TABLE dbo.ProjectMembers ADD MemberNote NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'ProfileImageUrl')
     ALTER TABLE dbo.Users ADD ProfileImageUrl NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'AttachmentType')
     ALTER TABLE dbo.Messages ADD AttachmentType NVARCHAR(20) NULL, AttachmentName NVARCHAR(255) NULL, AttachmentData NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'AccountStatus')
     ALTER TABLE dbo.Users ADD AccountStatus NVARCHAR(20) NOT NULL DEFAULT 'approved'`,

    `UPDATE Users SET AccountStatus = 'approved' WHERE AccountStatus IS NULL OR AccountStatus = ''`,

    `IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'PlainPassword')
     BEGIN
       UPDATE dbo.Users SET PasswordHash = '!RESET_REQUIRED!'
       WHERE PlainPassword IS NOT NULL AND PlainPassword <> '';
       ALTER TABLE dbo.Users DROP COLUMN PlainPassword;
     END`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'Phone')
     ALTER TABLE dbo.Users ADD Phone NVARCHAR(30) NULL, Bio NVARCHAR(MAX) NULL, ContactInfo NVARCHAR(500) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'ClassName')
     ALTER TABLE dbo.Users ADD ClassName NVARCHAR(50) NULL, StudyMode NVARCHAR(20) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'MessageScope')
     ALTER TABLE dbo.Messages ADD MessageScope NVARCHAR(30) NOT NULL DEFAULT 'teacher_student'`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Conversations')
     CREATE TABLE dbo.Conversations (
       ConversationId INT IDENTITY(1,1) PRIMARY KEY,
       ConversationType NVARCHAR(30) NOT NULL CHECK (ConversationType IN ('teacher_student','student_direct','project_group')),
       ProjectId INT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
       Title NVARCHAR(200) NULL,
       CreatedBy INT NOT NULL REFERENCES dbo.Users(UserId),
       IsArchived BIT NOT NULL DEFAULT 0,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConversationMembers')
     CREATE TABLE dbo.ConversationMembers (
       ConversationMemberId INT IDENTITY(1,1) PRIMARY KEY,
       ConversationId INT NOT NULL REFERENCES dbo.Conversations(ConversationId) ON DELETE CASCADE,
       UserId INT NOT NULL REFERENCES dbo.Users(UserId),
       JoinedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_ConversationMembers UNIQUE (ConversationId, UserId)
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConversationMessages')
     CREATE TABLE dbo.ConversationMessages (
       ConversationMessageId INT IDENTITY(1,1) PRIMARY KEY,
       ConversationId INT NOT NULL REFERENCES dbo.Conversations(ConversationId) ON DELETE CASCADE,
       SenderId INT NOT NULL REFERENCES dbo.Users(UserId),
       Content NVARCHAR(MAX) NOT NULL,
       AttachmentType NVARCHAR(20) NULL,
       AttachmentName NVARCHAR(255) NULL,
       AttachmentData NVARCHAR(MAX) NULL,
       SentAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       IsRead BIT NOT NULL DEFAULT 0
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProjectEvaluations')
     CREATE TABLE dbo.ProjectEvaluations (
       EvaluationId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
       StudentId INT NOT NULL REFERENCES dbo.Users(UserId),
       TeacherId INT NOT NULL REFERENCES dbo.Users(UserId),
       Grade DECIMAL(5,2) NULL,
       Feedback NVARCHAR(MAX) NOT NULL,
       Remarks NVARCHAR(MAX) NULL,
       EvaluatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DocumentAnalyses')
     CREATE TABLE dbo.DocumentAnalyses (
       DocumentAnalysisId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE SET NULL,
       MessageId INT NULL,
       ConversationMessageId INT NULL,
       FileName NVARCHAR(255) NOT NULL,
       FileType NVARCHAR(20) NOT NULL,
       Summary NVARCHAR(MAX) NULL,
       MainTopic NVARCHAR(500) NULL,
       KeyPoints NVARCHAR(MAX) NULL,
       Objectives NVARCHAR(MAX) NULL,
       QualityScore DECIMAL(5,2) NULL,
       RelatedToProject BIT NOT NULL DEFAULT 0,
       GrammarIssues NVARCHAR(MAX) NULL,
       MissingSections NVARCHAR(MAX) NULL,
       PlagiarismNote NVARCHAR(MAX) NULL,
       Suggestions NVARCHAR(MAX) NULL,
       AnalyzedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProjectAIChatMessages')
     CREATE TABLE dbo.ProjectAIChatMessages (
       MessageId INT IDENTITY(1,1) PRIMARY KEY,
       ProjectId INT NOT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
       TeacherId INT NOT NULL REFERENCES dbo.Users(UserId),
       Role NVARCHAR(10) NOT NULL CHECK (Role IN ('user','assistant')),
       Content NVARCHAR(MAX) NOT NULL,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.DocumentAnalyses') AND name = 'AiMetadata')
     ALTER TABLE dbo.DocumentAnalyses ADD AiMetadata NVARCHAR(MAX) NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmailOtps')
     CREATE TABLE dbo.EmailOtps (
       OtpId INT IDENTITY(1,1) PRIMARY KEY,
       Email NVARCHAR(255) NOT NULL,
       Purpose NVARCHAR(40) NOT NULL,
       CodeHash NVARCHAR(255) NOT NULL,
       PayloadJson NVARCHAR(MAX) NULL,
       ExpiresAt DATETIME2 NOT NULL,
       Attempts INT NOT NULL DEFAULT 0,
       ConsumedAt DATETIME2 NULL,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AuthActionTokens')
     CREATE TABLE dbo.AuthActionTokens (
       Jti NVARCHAR(64) PRIMARY KEY,
       Purpose NVARCHAR(40) NOT NULL,
       ConsumedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AuditLogs')
     CREATE TABLE dbo.AuditLogs (
       AuditLogId BIGINT IDENTITY(1,1) PRIMARY KEY,
       ActorUserId INT NULL,
       Action NVARCHAR(80) NOT NULL,
       EntityType NVARCHAR(80) NULL,
       EntityId NVARCHAR(80) NULL,
       MetadataJson NVARCHAR(MAX) NULL,
       IpAddress NVARCHAR(64) NULL,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ClassAssignments')
     CREATE TABLE dbo.ClassAssignments (
       AssignmentId INT IDENTITY(1,1) PRIMARY KEY,
       TeacherId INT NOT NULL,
       ClassName NVARCHAR(50) NOT NULL,
       StudyMode NVARCHAR(20) NULL,
       Title NVARCHAR(500) NOT NULL,
       Instructions NVARCHAR(MAX) NULL,
       OpensAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       DeadlineAt DATETIME2 NOT NULL,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       IsClosed BIT NOT NULL DEFAULT 0,
       ClosedNotified BIT NOT NULL DEFAULT 0
     )`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ClassAssignmentSubmissions')
     CREATE TABLE dbo.ClassAssignmentSubmissions (
       SubmissionId INT IDENTITY(1,1) PRIMARY KEY,
       AssignmentId INT NOT NULL,
       StudentId INT NOT NULL,
       Content NVARCHAR(MAX) NOT NULL,
       AttachmentName NVARCHAR(255) NULL,
       AttachmentData NVARCHAR(MAX) NULL,
       Score DECIMAL(5,2) NULL,
       BonusPoints DECIMAL(5,2) NOT NULL DEFAULT 0,
       TeacherFeedback NVARCHAR(MAX) NULL,
       GradedAt DATETIME2 NULL,
       GradedBy INT NULL,
       SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       CONSTRAINT UQ_ClassAssignmentStudent UNIQUE (AssignmentId, StudentId)
     )`,

    `IF COL_LENGTH('dbo.ClassAssignmentSubmissions', 'Score') IS NULL
       ALTER TABLE dbo.ClassAssignmentSubmissions ADD Score DECIMAL(5,2) NULL;
     IF COL_LENGTH('dbo.ClassAssignmentSubmissions', 'BonusPoints') IS NULL
       ALTER TABLE dbo.ClassAssignmentSubmissions ADD BonusPoints DECIMAL(5,2) NOT NULL
         CONSTRAINT DF_ClassAssignmentSubmissions_Bonus DEFAULT 0;
     IF COL_LENGTH('dbo.ClassAssignmentSubmissions', 'TeacherFeedback') IS NULL
       ALTER TABLE dbo.ClassAssignmentSubmissions ADD TeacherFeedback NVARCHAR(MAX) NULL;
     IF COL_LENGTH('dbo.ClassAssignmentSubmissions', 'GradedAt') IS NULL
       ALTER TABLE dbo.ClassAssignmentSubmissions ADD GradedAt DATETIME2 NULL;
     IF COL_LENGTH('dbo.ClassAssignmentSubmissions', 'GradedBy') IS NULL
       ALTER TABLE dbo.ClassAssignmentSubmissions ADD GradedBy INT NULL`,

    `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PushSubscriptions')
     CREATE TABLE dbo.PushSubscriptions (
       SubscriptionId INT IDENTITY(1,1) PRIMARY KEY,
       UserId INT NOT NULL,
       Endpoint NVARCHAR(500) NOT NULL UNIQUE,
       P256dh NVARCHAR(255) NOT NULL,
       Auth NVARCHAR(255) NOT NULL,
       UserAgent NVARCHAR(255) NULL,
       CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
     )`,
  ];
  for (const m of migrations) {
    await pool.request().query(m);
  }

  await pool.request().query(`
    DELETE cm FROM dbo.ConversationMembers cm
    INNER JOIN dbo.Conversations c ON c.ConversationId = cm.ConversationId
    INNER JOIN dbo.Users u ON u.UserId = cm.UserId
    WHERE u.Role = 'admin' AND c.ConversationType IN ('teacher_student', 'project_group')
  `);

  // Expand project status constraint to include pending_teacher
  await pool.request().query(`
    DECLARE @cn NVARCHAR(256);
    SELECT @cn = cc.name FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
    WHERE cc.parent_object_id = OBJECT_ID('dbo.Projects') AND c.name = 'Status';
    IF @cn IS NOT NULL EXEC('ALTER TABLE dbo.Projects DROP CONSTRAINT ' + @cn);
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Projects_Status')
      ALTER TABLE dbo.Projects ADD CONSTRAINT CK_Projects_Status CHECK (
        Status IN ('pending_teacher','assigned','submitted','under_review','approved','rejected','changes_requested')
      );
  `);

  // Default settings
  const settings = [
    ['theme_primary', '#008037'],
    ['theme_secondary', '#2563EB'],
    ['university_name', 'ProjectHub'],
    ['university_short', 'PH'],
    ['logo_path', '/projecthub-logo.png'],
    ['ai_similarity_threshold', '60'],
    ['db_server', serverRaw],
  ];
  for (const [key, value] of settings) {
    await pool.request()
      .input('key', key)
      .input('value', value)
      .query(`IF NOT EXISTS (SELECT 1 FROM Settings WHERE SettingKey = @key)
              INSERT INTO Settings (SettingKey, SettingValue) VALUES (@key, @value)`);
  }

  // Single admin account — only created if no admin exists
  const adminCheck = await pool.request().query(`SELECT COUNT(*) AS c FROM Users WHERE Role = 'admin'`);
  if (adminCheck.recordset[0].c === 0) {
    const admin = getAdminBootstrap();
    const hash = await bcrypt.hash(admin.password, 12);
    await pool.request()
      .input('uid', admin.universityId)
      .input('email', admin.email)
      .input('hash', hash)
      .input('fn', admin.firstName)
      .input('ln', admin.lastName)
      .query(`INSERT INTO Users (UniversityId, Email, PasswordHash, FirstName, LastName, Role, Department)
              VALUES (@uid, @email, @hash, @fn, @ln, 'admin', 'Administration')`);
    console.log('[DB Setup] Created single admin account:', admin.universityId);
  }

  await pool.close();
  console.log(`[DB Setup] Database "${dbName}" ready on ${serverRaw}`);
  return { ok: true, server: serverRaw, database: dbName };
}

export async function ensureDatabase() {
  const usePg =
    process.env.DB_DRIVER === 'postgres' ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL;
  const useMySql = process.env.DB_DRIVER === 'mysql';

  if (usePg) {
    const { ensureDatabasePg } = await import('./setupDatabasePg.js');
    return ensureDatabasePg();
  }

  if (useMySql) {
    const { ensureDatabaseMySql } = await import('./setupDatabaseMySql.js');
    return ensureDatabaseMySql();
  }

  try {
    return await runSetup();
  } catch (err) {
    console.error('[DB Setup] FAILED:', err.message);
    return { ok: false, error: err.message };
  }
}

// Run directly: node src/setupDatabase.js
if (process.argv[1]?.includes('setupDatabase')) {
  ensureDatabase().then(r => process.exit(r.ok ? 0 : 1));
}
