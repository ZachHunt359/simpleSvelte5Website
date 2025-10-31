CREATE TABLE IF NOT EXISTS Sessions (
  Token TEXT PRIMARY KEY,
  UserId TEXT NOT NULL,
  CreatedAt INTEGER NOT NULL, -- epoch seconds
  ExpiresAt INTEGER NULL      -- epoch seconds or NULL for no-expiry
);
CREATE INDEX IF NOT EXISTS IX_Sessions_UserId ON Sessions(UserId);