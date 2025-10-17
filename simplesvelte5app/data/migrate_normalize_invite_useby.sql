-- Migration: Normalize InviteCodes.UseBy
-- Ensure UseBy is stored as an integer epoch (seconds). If UseBy is missing or stored as a non-numeric string
-- (for example the literal "unixepoch('now', '+1 day')" was inserted) then set it to CreatedAt + 86400 (24 hours).

BEGIN TRANSACTION;

-- For rows where UseBy is NULL or contains non-digit characters, set UseBy = CreatedAt + 86400
UPDATE InviteCodes
SET UseBy = CreatedAt + 86400
WHERE UseBy IS NULL OR (typeof(UseBy) = 'text' AND UseBy GLOB '*[^0-9]*');

COMMIT;

-- Notes:
-- Run this against your sqlite DB file (data/db.db) using sqlite3 or your migration runner.
-- Example: sqlite3 data/db.db < data/migrate_normalize_invite_useby.sql
