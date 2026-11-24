-- ============================================================================
-- Additive Migration for Android Mobile Companion API
-- Preserves all existing tables and data in ConstructionMatFlow.
-- ============================================================================

USE ConstructionMatFlow;
GO

-- 1. Users table for authenticated web & mobile accounts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id              NVARCHAR(64) PRIMARY KEY,
        username        NVARCHAR(150) NOT NULL UNIQUE,
        password_hash   NVARCHAR(256) NOT NULL,
        full_name       NVARCHAR(150) NOT NULL,
        role            NVARCHAR(50) NOT NULL,
        department      NVARCHAR(200) NOT NULL,
        is_active       BIT NOT NULL DEFAULT 1,
        created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

-- 2. Extend prs table with PR approval/rejection audit metadata
IF COL_LENGTH('prs', 'rejection_comments') IS NULL
    ALTER TABLE prs ADD rejection_comments NVARCHAR(500) NULL;
IF COL_LENGTH('prs', 'approved_by') IS NULL
    ALTER TABLE prs ADD approved_by NVARCHAR(150) NULL;
IF COL_LENGTH('prs', 'approved_at') IS NULL
    ALTER TABLE prs ADD approved_at DATETIME2 NULL;
IF COL_LENGTH('prs', 'rejected_by') IS NULL
    ALTER TABLE prs ADD rejected_by NVARCHAR(150) NULL;
IF COL_LENGTH('prs', 'rejected_at') IS NULL
    ALTER TABLE prs ADD rejected_at DATETIME2 NULL;
IF COL_LENGTH('prs', 'project_code') IS NULL
    ALTER TABLE prs ADD project_code NVARCHAR(50) NOT NULL DEFAULT 'PROJ-TWRB';
GO

-- 3. Extend pqtos table with project_code
IF COL_LENGTH('pqtos', 'project_code') IS NULL
    ALTER TABLE pqtos ADD project_code NVARCHAR(50) NOT NULL DEFAULT 'PROJ-TWRB';
GO

-- 4. Extend attachments table with storage_path and mime_type
IF COL_LENGTH('attachments', 'storage_path') IS NULL
    ALTER TABLE attachments ADD storage_path NVARCHAR(500) NULL;
IF COL_LENGTH('attachments', 'mime_type') IS NULL
    ALTER TABLE attachments ADD mime_type NVARCHAR(100) NULL;
GO

-- 5. Extend notifications table with deep-link reference fields
IF COL_LENGTH('notifications', 'doc_type') IS NULL
    ALTER TABLE notifications ADD doc_type NVARCHAR(30) NULL;
IF COL_LENGTH('notifications', 'doc_id') IS NULL
    ALTER TABLE notifications ADD doc_id NVARCHAR(64) NULL;
IF COL_LENGTH('notifications', 'doc_no') IS NULL
    ALTER TABLE notifications ADD doc_no NVARCHAR(50) NULL;
GO

-- 6. Extend transaction_logs table with user_role
IF COL_LENGTH('transaction_logs', 'user_role') IS NULL
    ALTER TABLE transaction_logs ADD user_role NVARCHAR(50) NULL;
GO
