-- Add ReplyImageUrl column to Inquiries table for single image attachment per reply
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

ALTER TABLE Inquiries ADD COLUMN ReplyImageUrl TEXT;

COMMIT;
PRAGMA foreign_keys=on;
