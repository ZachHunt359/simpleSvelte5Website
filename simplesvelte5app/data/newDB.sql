-- Consolidated schema (merged migrations)
-- This file is SQLite-flavored SQL intended to create a fresh DB that includes
-- the effects of the migration files in data/*.sql. If you plan to import to
-- MariaDB, adapt AUTO_INCREMENT and function defaults accordingly (see README).

BEGIN TRANSACTION;

-- Admin users
DROP TABLE IF EXISTS AdminUsers;
CREATE TABLE AdminUsers (
  Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  Email TEXT NOT NULL UNIQUE,
  PasswordHash TEXT NOT NULL,
  CreatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Inquiries (includes migrated columns and defaults)
DROP TABLE IF EXISTS Inquiries;
CREATE TABLE Inquiries (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  UserId TEXT NOT NULL,
  PageSentFrom TEXT NOT NULL DEFAULT '(unknown)',
  Message TEXT NOT NULL,
  Email TEXT,
  Reply TEXT,
  SeenByUser INTEGER NOT NULL DEFAULT 0,
  MessTimestamp INTEGER NOT NULL DEFAULT 0,
  ReplyTimestamp INTEGER,
  -- added by migrations
  SentMessageId TEXT,
  SentTimestamp INTEGER
);

-- Invite codes (UseBy normalized to integer epoch seconds)
DROP TABLE IF EXISTS InviteCodes;
CREATE TABLE InviteCodes (
  Code TEXT PRIMARY KEY,
  Used INTEGER NOT NULL DEFAULT 0,
  CreatedAt INTEGER DEFAULT (strftime('%s','now')),
  UseBy INTEGER DEFAULT 0,
  UsedAt INTEGER,
  AdminUsed INTEGER
);

-- Sessions
CREATE TABLE IF NOT EXISTS Sessions (
  Token TEXT PRIMARY KEY,
  UserId TEXT NOT NULL,
  CreatedAt INTEGER NOT NULL,
  ExpiresAt INTEGER NULL
);
CREATE INDEX IF NOT EXISTS IX_Sessions_UserId ON Sessions(UserId);

-- SendAttempts (new table added by migrations)
CREATE TABLE IF NOT EXISTS SendAttempts (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  InquiryId INTEGER NOT NULL,
  AttemptedAt INTEGER NOT NULL,
  Success INTEGER NOT NULL,
  MessageId TEXT,
  Response TEXT,
  FOREIGN KEY(InquiryId) REFERENCES Inquiries(Id)
);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS Migrations (
  Name TEXT PRIMARY KEY,
  AppliedAt INTEGER
);

-- Seed admin users (example)
INSERT INTO AdminUsers (Id,Email,PasswordHash,CreatedAt) VALUES
  (1,'zachdhunt@gmail.com','$2b$10$p/gKNYNmv8hdmlx7NhI2UOS/UywoCCqindqaj4KiOij3aa0CGTPrC',1758491873);

-- Seed invite codes with numeric UseBy (CreatedAt + 86400)
INSERT INTO InviteCodes (Code,Used,CreatedAt,UseBy,UsedAt,AdminUsed) VALUES
  ('007e0330',0,1758490662,1758490662 + 86400,NULL,NULL),
  ('4603d201',0,1758490773,1758490773 + 86400,NULL,NULL),
  ('56c43b3e',0,1758490849,1758490849 + 86400,NULL,NULL),
  ('a1f67045',0,1758491400,1758491400 + 86400,NULL,NULL);

COMMIT;

-- Notes for MariaDB import:
-- * Replace INTEGER PRIMARY KEY AUTOINCREMENT with INT AUTO_INCREMENT PRIMARY KEY
-- * Replace strftime('%s','now') with UNIX_TIMESTAMP() or set values in the INSERTs
-- * Remove FOREIGN KEY clauses if your MySQL config doesn't support them or adjust syntax
-- * Convert boolean/int defaults as needed
BEGIN TRANSACTION;
DROP TABLE IF EXISTS "AdminUsers";
CREATE TABLE "AdminUsers" (
	"Id"	INTEGER NOT NULL,
	"Email"	TEXT NOT NULL UNIQUE,
	"PasswordHash"	TEXT NOT NULL,
	"CreatedAt"	INTEGER NOT NULL DEFAULT "unixepoch('now')",
	PRIMARY KEY("Id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "Inquiries";
CREATE TABLE "Inquiries" (
	"Id"	INTEGER,
	"UserId"	TEXT NOT NULL,
	"PageSentFrom"	TEXT NOT NULL,
	"Message"	TEXT NOT NULL,
	"Email"	TEXT,
	"Reply"	TEXT,
	"SeenByUser"	INTEGER NOT NULL DEFAULT 0,
	"MessTimestamp"	INTEGER NOT NULL DEFAULT "unixepoch('now')",
	"ReplyTimestamp"	INTEGER,
	PRIMARY KEY("Id" AUTOINCREMENT)
);
DROP TABLE IF EXISTS "InviteCodes";
CREATE TABLE "InviteCodes" (
	"Code"	TEXT,
	"Used"	INTEGER NOT NULL DEFAULT 0,
	"CreatedAt"	INTEGER DEFAULT "unixepoch('now')",
	"UseBy"	INTEGER DEFAULT "unixepoch('now', '+1 day')",
	```ct-sql
	BEGIN TRANSACTION;

	-- Admin users
	DROP TABLE IF EXISTS "AdminUsers";
	CREATE TABLE "AdminUsers" (
			"Id"    INTEGER NOT NULL,
			"Email"    TEXT NOT NULL UNIQUE,
			"PasswordHash"    TEXT NOT NULL,
			"CreatedAt"    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
			PRIMARY KEY("Id" AUTOINCREMENT)
	);

	-- Inquiries (includes migrated columns and defaults)
	DROP TABLE IF EXISTS "Inquiries";
	CREATE TABLE "Inquiries" (
			"Id"    INTEGER PRIMARY KEY AUTOINCREMENT,
			"UserId"    TEXT NOT NULL,
			"PageSentFrom"    TEXT NOT NULL DEFAULT '(unknown)',
			"Message"    TEXT NOT NULL,
			"Email"    TEXT,
			"Reply"    TEXT,
			"SeenByUser"    INTEGER NOT NULL DEFAULT 0,
			"MessTimestamp"    INTEGER NOT NULL DEFAULT 0,
			"ReplyTimestamp"    INTEGER,
			-- added by migrations
			"SentMessageId"    TEXT,
			"SentTimestamp"    INTEGER
	);

	-- Invite codes (UseBy normalized to integer epoch seconds)
	DROP TABLE IF EXISTS "InviteCodes";
	CREATE TABLE "InviteCodes" (
			"Code"    TEXT PRIMARY KEY,
			"Used"    INTEGER NOT NULL DEFAULT 0,
			"CreatedAt"    INTEGER DEFAULT (strftime('%s','now')),
			"UseBy"    INTEGER DEFAULT 0,
			"UsedAt"    INTEGER,
			"AdminUsed"    INTEGER
	);

	-- Sessions
	CREATE TABLE IF NOT EXISTS Sessions (
		Token TEXT PRIMARY KEY,
		UserId TEXT NOT NULL,
		CreatedAt INTEGER NOT NULL,
		ExpiresAt INTEGER NULL
	);
	CREATE INDEX IF NOT EXISTS IX_Sessions_UserId ON Sessions(UserId);

	-- SendAttempts (new table added by migrations)
	CREATE TABLE IF NOT EXISTS SendAttempts (
		Id INTEGER PRIMARY KEY AUTOINCREMENT,
		InquiryId INTEGER NOT NULL,
		AttemptedAt INTEGER NOT NULL,
		Success INTEGER NOT NULL,
		MessageId TEXT,
		Response TEXT,
		FOREIGN KEY(InquiryId) REFERENCES Inquiries(Id)
	);

	-- Migrations tracking table
	CREATE TABLE IF NOT EXISTS Migrations (
		Name TEXT PRIMARY KEY,
		AppliedAt INTEGER
	);

	-- Seed admin users
	INSERT INTO "AdminUsers" ("Id","Email","PasswordHash","CreatedAt") VALUES (1,'test@email.com','$2b$10$Q89TR52IGIYghdnNa5OoHOrhMI/yN5YhOoZitCKsm7mZgWh7lDfsa',1758489583),
	 (2,'zachdhunt@gmail.com','$2b$10$p/gKNYNmv8hdmlx7NhI2UOS/UywoCCqindqaj4KiOij3aa0CGTPrC',1758491873);

	-- Seed invite codes with numeric UseBy (CreatedAt + 86400)
	INSERT INTO "InviteCodes" ("Code","Used","CreatedAt","UseBy","UsedAt","AdminUsed") VALUES ('007e0330',0,1758490662,1758490662 + 86400,NULL,NULL),
	 ('4603d201',0,1758490773,1758490773 + 86400,NULL,NULL),
	 ('56c43b3e',0,1758490849,1758490849 + 86400,NULL,NULL),
	 ('a1f67045',0,1758491400,1758491400 + 86400,NULL,NULL);

	COMMIT;
	```
