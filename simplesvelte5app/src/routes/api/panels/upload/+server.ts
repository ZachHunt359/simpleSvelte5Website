import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

const PANELS_DIR = path.resolve('static/panels');

// Dummy admin check: replace with your real logic!
async function isAdmin(cookies: import('@sveltejs/kit').Cookies) {
    // Example: check for a cookie named 'auth_token'
    const token = cookies.get('auth_token');
    if (!token) return false;
    // Example: decode and check if user is admin
    // For demo, treat user with email 'a@b.com' as admin
    // Replace with your real user/session lookup!
    if (token.startsWith('seed-user-id:')) return true;
    return false;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    // --- Admin authentication check ---
    if (!(await isAdmin(cookies))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
        return new Response(JSON.stringify({ error: 'No files uploaded' }), { status: 400 });
    }

    try {
        for (const file of files) {
            // @ts-ignore
            const relPath = file.name; // This will be webkitRelativePath if present
            const destPath = path.join(PANELS_DIR, relPath);
            const destDir = path.dirname(destPath);
            if (!existsSync(destDir)) {
                mkdirSync(destDir, { recursive: true });
            }
            // @ts-ignore
            const arrayBuffer = await file.arrayBuffer();
            await fs.writeFile(destPath, Buffer.from(arrayBuffer));
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
    }
};