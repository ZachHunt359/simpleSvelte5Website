-- Add SendAttempts table and SentTimestamp column
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

ALTER TABLE Inquiries ADD COLUMN SentMessageId TEXT;
ALTER TABLE Inquiries ADD COLUMN SentTimestamp INTEGER;

CREATE TABLE IF NOT EXISTS SendAttempts (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  InquiryId INTEGER NOT NULL,
  AttemptedAt INTEGER NOT NULL,
  Success INTEGER NOT NULL,
  MessageId TEXT,
  Response TEXT,
  FOREIGN KEY(InquiryId) REFERENCES Inquiries(Id)
);

COMMIT;
PRAGMA foreign_keys=on;
