#!/usr/bin/env node
// Apply SiteSettings migration to MariaDB (local development)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from .env (local development with MariaDB)
import dotenv from 'dotenv';
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL || 'mariadb://paranoid_admin:Paranoid_d8_Admin_pwd@localhost:3306/paranoid_DB';

const migrationPath = path.resolve(__dirname, '..', 'data', 'migrate_add_site_settings_mariadb.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

async function main() {
  let connection;
  try {
    console.log('Connecting to MariaDB (local)...');
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('Applying SiteSettings migration...');
    
    // Remove comment lines and split into statements
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Executing ${statements.length} statements...`);
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 80) + '...');
        await connection.query(statement);
      }
    }
    
    console.log('✓ Migration applied successfully');
    
    // Verify the table was created
    const [rows] = await connection.query('SELECT * FROM SiteSettings');
    console.log('\nCurrent settings:');
    console.table(rows);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
