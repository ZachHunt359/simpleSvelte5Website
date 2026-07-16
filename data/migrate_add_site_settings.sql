-- Migration: Add SiteSettings table for global configuration
-- This stores site-wide settings like image serving mode
-- SQLite compatible syntax

CREATE TABLE IF NOT EXISTS SiteSettings (
  SettingKey TEXT PRIMARY KEY,
  SettingValue TEXT NOT NULL,
  UpdatedAt INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Insert default image serving mode: 'auto' (serve appropriate for device)
-- Options: 'auto', 'desktop-only', 'mobile-only'
INSERT INTO SiteSettings (SettingKey, SettingValue, UpdatedAt) 
VALUES ('imageServingMode', 'auto', unixepoch())
ON CONFLICT(SettingKey) DO NOTHING;
