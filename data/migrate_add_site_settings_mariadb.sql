-- Migration: Add SiteSettings table for global configuration (MariaDB version for local development)
-- This stores site-wide settings like image serving mode

CREATE TABLE IF NOT EXISTS SiteSettings (
  SettingKey VARCHAR(255) PRIMARY KEY,
  SettingValue TEXT NOT NULL,
  UpdatedAt INT NOT NULL DEFAULT (UNIX_TIMESTAMP())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default image serving mode: 'auto' (serve appropriate for device)
-- Options: 'auto', 'desktop-only', 'mobile-only'
INSERT INTO SiteSettings (SettingKey, SettingValue) VALUES ('imageServingMode', 'auto')
ON DUPLICATE KEY UPDATE SettingKey = SettingKey;
