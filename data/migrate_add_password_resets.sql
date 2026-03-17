-- Migration: Add PasswordResets table for secure password reset tokens
-- Usage: mysql -u root -prootpass PARANOiD_DB < data/migrate_add_password_resets.sql

CREATE TABLE IF NOT EXISTS PasswordResets (
  Token VARCHAR(128) PRIMARY KEY,
  AdminUserId INT NOT NULL,
  CreatedAt INT NOT NULL,
  ExpiresAt INT NOT NULL,
  Used TINYINT NOT NULL DEFAULT 0,
  CONSTRAINT fk_passwordresets_admin FOREIGN KEY (AdminUserId) REFERENCES AdminUsers(Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IX_PasswordResets_AdminUserId ON PasswordResets(AdminUserId);
CREATE INDEX IX_PasswordResets_ExpiresAt ON PasswordResets(ExpiresAt);

-- Mark this migration as applied
INSERT INTO Migrations (Name, AppliedAt) VALUES ('migrate_add_password_resets', UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE AppliedAt = UNIX_TIMESTAMP();
