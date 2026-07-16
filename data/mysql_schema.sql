-- MariaDB / MySQL schema adapted from newDB.sql
-- Use this file to import into an existing database (e.g., paranoid_DB, paranoid_staging_DB)
-- Note: uses INT AUTO_INCREMENT and UNIX_TIMESTAMP() defaults where appropriate.
-- Note: Database must be created and specified externally (e.g., mysql dbname < mysql_schema.sql)

-- Drop tables in correct order (child tables before parent tables)
DROP TABLE IF EXISTS SendAttempts;
DROP TABLE IF EXISTS Migrations;
DROP TABLE IF EXISTS Sessions;
DROP TABLE IF EXISTS InviteCodes;
DROP TABLE IF EXISTS Inquiries;
DROP TABLE IF EXISTS AdminUsers;

-- AdminUsers
CREATE TABLE AdminUsers (
  Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Email VARCHAR(255) NOT NULL UNIQUE,
  PasswordHash TEXT NOT NULL,
  CreatedAt INT NOT NULL DEFAULT (UNIX_TIMESTAMP())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inquiries
CREATE TABLE Inquiries (
  Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  UserId VARCHAR(255) NOT NULL,
  PageSentFrom TEXT NOT NULL DEFAULT '(unknown)',
  Message TEXT NOT NULL,
  Email TEXT,
  Reply TEXT,
  ReplyImageUrl TEXT,
  SeenByUser TINYINT NOT NULL DEFAULT 0,
  MessTimestamp INT NOT NULL DEFAULT 0,
  ReplyTimestamp INT,
  SentMessageId TEXT,
  SentTimestamp INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- InviteCodes
CREATE TABLE InviteCodes (
  Code VARCHAR(128) PRIMARY KEY,
  Used TINYINT NOT NULL DEFAULT 0,
  CreatedAt INT DEFAULT (UNIX_TIMESTAMP()),
  UseBy INT DEFAULT 0,
  UsedAt INT,
  AdminUsed TINYINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions
CREATE TABLE Sessions (
  Token VARCHAR(255) PRIMARY KEY,
  UserId VARCHAR(255) NOT NULL,
  CreatedAt INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
  ExpiresAt INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IX_Sessions_UserId ON Sessions(UserId);

-- SendAttempts
CREATE TABLE SendAttempts (
  Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  InquiryId INT NOT NULL,
  AttemptedAt INT NOT NULL,
  Success TINYINT NOT NULL,
  MessageId TEXT,
  Response TEXT,
  CONSTRAINT fk_sendattempts_inquiry FOREIGN KEY (InquiryId) REFERENCES Inquiries(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrations tracking table
CREATE TABLE Migrations (
  Name VARCHAR(255) PRIMARY KEY,
  AppliedAt INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SiteSettings for global configuration
CREATE TABLE SiteSettings (
  SettingKey VARCHAR(255) PRIMARY KEY,
  SettingValue TEXT NOT NULL,
  UpdatedAt INT NOT NULL DEFAULT (UNIX_TIMESTAMP())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed admin user (update password hash if desired)
INSERT INTO AdminUsers (Id,Email,PasswordHash,CreatedAt) VALUES
  (1,'zachdhunt@gmail.com','$2b$10$p/gKNYNmv8hdmlx7NhI2UOS/UywoCCqindqaj4KiOij3aa0CGTPrC',1758491873);

-- Seed invite codes (UseBy computed as CreatedAt + 86400)
INSERT INTO InviteCodes (Code,Used,CreatedAt,UseBy,UsedAt,AdminUsed) VALUES
  ('007e0330',0,1758490662,1758577062,NULL,NULL),
  ('4603d201',0,1758490773,1758577173,NULL,NULL),
  ('56c43b3e',0,1758490849,1758577249,NULL,NULL),
  ('a1f67045',0,1758491400,1758577800,NULL,NULL);

-- Seed default site settings
INSERT INTO SiteSettings (SettingKey, SettingValue) VALUES ('imageServingMode', 'auto')
ON DUPLICATE KEY UPDATE SettingKey = SettingKey;

-- You can insert initial Migration rows if you want to mark existing migrations as applied.
