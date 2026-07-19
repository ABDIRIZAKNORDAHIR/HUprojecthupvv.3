-- ProjectHub SQL Server Database Schema
-- Run in SQL Server Management Studio or: sqlcmd -S localhost -i schema.sql

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ProjectHub')
BEGIN
    CREATE DATABASE ProjectHub;
END
GO

USE ProjectHub;
GO

-- Users: students (HU ID + email), teachers, admins
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    UserId              INT IDENTITY(1,1) PRIMARY KEY,
    UniversityId        NVARCHAR(20)  NOT NULL,
    Email               NVARCHAR(255) NOT NULL,
    PasswordHash        NVARCHAR(255) NOT NULL,
    FirstName           NVARCHAR(100) NOT NULL,
    LastName            NVARCHAR(100) NOT NULL,
    Role                NVARCHAR(20)  NOT NULL CHECK (Role IN ('student','teacher','admin')),
    Department          NVARCHAR(100) NULL,
    IsActive            BIT NOT NULL DEFAULT 1,
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_UniversityId UNIQUE (UniversityId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
GO

-- App settings (theme, university name, logo path)
IF OBJECT_ID('dbo.Settings', 'U') IS NULL
CREATE TABLE dbo.Settings (
    SettingKey          NVARCHAR(100) PRIMARY KEY,
    SettingValue        NVARCHAR(MAX) NOT NULL,
    UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedBy           INT NULL REFERENCES dbo.Users(UserId)
);
GO

-- Projects assigned by teachers (TeacherAssignedId = teacher's own project ID)
IF OBJECT_ID('dbo.Projects', 'U') IS NULL
CREATE TABLE dbo.Projects (
    ProjectId           INT IDENTITY(1,1) PRIMARY KEY,
    TeacherAssignedId   NVARCHAR(50)  NOT NULL,
    Title               NVARCHAR(500) NOT NULL,
    Abstract            NVARCHAR(MAX) NULL,
    Description         NVARCHAR(MAX) NULL,
    AssignedByTeacherId INT NOT NULL REFERENCES dbo.Users(UserId),
    OwnerStudentId      INT NULL REFERENCES dbo.Users(UserId),
    Status              NVARCHAR(30) NOT NULL DEFAULT 'assigned'
                        CHECK (Status IN ('assigned','submitted','under_review','approved','rejected','changes_requested')),
    AssignedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SubmittedAt         DATETIME2 NULL,
    ReviewedAt          DATETIME2 NULL,
    UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Projects_TeacherAssignedId UNIQUE (TeacherAssignedId)
);
GO

-- Students sharing the same project
IF OBJECT_ID('dbo.ProjectMembers', 'U') IS NULL
CREATE TABLE dbo.ProjectMembers (
    ProjectMemberId     INT IDENTITY(1,1) PRIMARY KEY,
    ProjectId           INT NOT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
    StudentId           INT NOT NULL REFERENCES dbo.Users(UserId),
    InvitedByStudentId  INT NULL REFERENCES dbo.Users(UserId),
    JoinedAt            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ProjectMembers UNIQUE (ProjectId, StudentId)
);
GO

-- Invitations to join a shared project
IF OBJECT_ID('dbo.ProjectInvitations', 'U') IS NULL
CREATE TABLE dbo.ProjectInvitations (
    InvitationId        INT IDENTITY(1,1) PRIMARY KEY,
    ProjectId           INT NOT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
    InvitedStudentId    INT NOT NULL REFERENCES dbo.Users(UserId),
    InvitedByStudentId  INT NOT NULL REFERENCES dbo.Users(UserId),
    Status              NVARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (Status IN ('pending','accepted','declined')),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ProjectInvitations UNIQUE (ProjectId, InvitedStudentId)
);
GO

-- Student submissions to teacher
IF OBJECT_ID('dbo.Submissions', 'U') IS NULL
CREATE TABLE dbo.Submissions (
    SubmissionId        INT IDENTITY(1,1) PRIMARY KEY,
    ProjectId           INT NOT NULL REFERENCES dbo.Projects(ProjectId),
    SubmittedByStudentId INT NOT NULL REFERENCES dbo.Users(UserId),
    Title               NVARCHAR(500) NOT NULL,
    Abstract            NVARCHAR(MAX) NOT NULL,
    Content             NVARCHAR(MAX) NULL,
    SubmittedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Version             INT NOT NULL DEFAULT 1
);
GO

-- Athena AI analysis results
IF OBJECT_ID('dbo.AIAnalyses', 'U') IS NULL
CREATE TABLE dbo.AIAnalyses (
    AnalysisId              INT IDENTITY(1,1) PRIMARY KEY,
    SubmissionId            INT NOT NULL REFERENCES dbo.Submissions(SubmissionId),
    ProjectId               INT NOT NULL REFERENCES dbo.Projects(ProjectId),
    UniquenessScore         DECIMAL(5,2) NOT NULL,
    AIConfidence            DECIMAL(5,2) NOT NULL,
    SimilarProjectId        INT NULL REFERENCES dbo.Projects(ProjectId),
    SimilarProjectAssignedId NVARCHAR(50) NULL,
    SimilarityPercent       DECIMAL(5,2) NULL,
    AISuggestion            NVARCHAR(MAX) NOT NULL,
    SuggestedAction         NVARCHAR(50) NOT NULL,
    RejectionReasons        NVARCHAR(MAX) NULL,
    AnalyzedAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Direct teacher-student conversation per project
IF OBJECT_ID('dbo.Messages', 'U') IS NULL
CREATE TABLE dbo.Messages (
    MessageId           INT IDENTITY(1,1) PRIMARY KEY,
    ProjectId           INT NOT NULL REFERENCES dbo.Projects(ProjectId) ON DELETE CASCADE,
    SenderId            INT NOT NULL REFERENCES dbo.Users(UserId),
    ReceiverId          INT NOT NULL REFERENCES dbo.Users(UserId),
    Content             NVARCHAR(MAX) NOT NULL,
    SentAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsRead              BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_Projects_AssignedByTeacherId ON dbo.Projects(AssignedByTeacherId);
CREATE INDEX IX_Projects_OwnerStudentId ON dbo.Projects(OwnerStudentId);
CREATE INDEX IX_Projects_Status ON dbo.Projects(Status);
CREATE INDEX IX_Messages_ProjectId ON dbo.Messages(ProjectId);
CREATE INDEX IX_Submissions_ProjectId ON dbo.Submissions(ProjectId);
GO

PRINT 'ProjectHub schema created successfully.';
GO
