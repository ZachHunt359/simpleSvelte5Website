#!/usr/bin/env node
// Lightweight inspector script that works regardless of TypeScript build.
import { URL } from 'url';

async function main() {
	const id = 3;
	const dbUrl = process.env.DATABASE_URL;
	if (dbUrl) {
		// Use mysql2/promise
		const mysql = await import('mysql2/promise');
		const u = new URL(dbUrl);
		const database = u.pathname ? u.pathname.replace(/^\//, '') : undefined;
		if (!database) {
			console.error('DATABASE_URL does not include a database name');
			process.exit(1);
		}
		const conn = await mysql.createConnection({ uri: dbUrl });
		try {
			const [rows] = await conn.execute('SELECT Id, Email, SeenByUser, Reply, ReplyTimestamp FROM Inquiries WHERE Id = ?', [id]);
			console.log(rows[0] ?? null);
		} finally {
			await conn.end();
		}
	} else {
		// Use better-sqlite3 against data/db.db
		const Database = await import('better-sqlite3');
		const path = await import('path');
		const dbPath = path.resolve(process.cwd(), 'data', 'db.db');
		const db = new Database.default(dbPath);
		try {
			const row = db.prepare('SELECT Id, Email, SeenByUser, Reply, ReplyTimestamp FROM Inquiries WHERE Id = ?').get(id);
			console.log(row ?? null);
		} finally {
			db.close();
		}
	}
}

main().catch((e) => { console.error('inspect-inquiry-3 error:', e && e.message ? e.message : e); process.exit(1); });
