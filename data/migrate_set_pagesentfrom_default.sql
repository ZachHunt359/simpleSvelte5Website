-- Migration: ensure Inquiries.PageSentFrom has a DEFAULT '(unknown)'
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

-- Create a new table with DEFAULT for PageSentFrom
-- Avoid function calls in column DEFAULT (some SQLite builds disallow it).
CREATE TABLE IF NOT EXISTS "Inquiries_new" (
  "Id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "UserId" TEXT NOT NULL,
  "PageSentFrom" TEXT NOT NULL DEFAULT '(unknown)',
  "Message" TEXT NOT NULL,
  "Email" TEXT,
  "Reply" TEXT,
  "SeenByUser" INTEGER NOT NULL DEFAULT 0,
  "MessTimestamp" INTEGER NOT NULL DEFAULT 0,
  "ReplyTimestamp" INTEGER
);

-- Copy data over, ensuring PageSentFrom is not null/empty
-- Also normalize MessTimestamp: if it's already numeric keep it; if it's an ISO datetime string
-- like '2025-10-08T19:13:27.000Z' convert it to epoch seconds using strftime after stripping 'T' and 'Z'.
INSERT INTO Inquiries_new (Id, UserId, PageSentFrom, Message, Email, Reply, SeenByUser, MessTimestamp, ReplyTimestamp)
SELECT
  Id,
  UserId,
  CASE WHEN PageSentFrom IS NULL OR trim(PageSentFrom) = '' THEN '(unknown)' ELSE PageSentFrom END,
  Message,
  Email,
  Reply,
  SeenByUser,
  CASE
    WHEN MessTimestamp IS NULL OR trim(MessTimestamp) = '' THEN cast(strftime('%s','now') as integer)
    WHEN typeof(MessTimestamp) = 'integer' THEN MessTimestamp
    ELSE cast(strftime('%s', replace(replace(MessTimestamp, 'T', ' '), 'Z', '')) as integer)
  END,
  ReplyTimestamp
FROM Inquiries;

-- Replace old table
DROP TABLE Inquiries;
ALTER TABLE Inquiries_new RENAME TO Inquiries;

COMMIT;
PRAGMA foreign_keys=on;
