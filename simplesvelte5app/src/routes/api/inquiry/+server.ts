import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const INQUIRY_FILE = path.resolve('static/inquiries.json');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { message, email, id, userId } = await request.json();

        // Update email for an existing inquiry
        if (id && email) {
            let inquiries: any[] = [];
            try {
                const data = await fs.readFile(INQUIRY_FILE, 'utf-8');
                inquiries = JSON.parse(data);
            } catch (e) {}
            const idx = inquiries.findIndex((entry) => entry.id === id && entry.userId === userId);
            if (idx !== -1) {
                inquiries[idx].email = email;
                await fs.writeFile(INQUIRY_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });
        }

        // Create a new inquiry
        if (!message || !userId) {
            return new Response(JSON.stringify({ error: 'Message and userId required' }), { status: 400 });
        }

        const entry = {
            id: crypto.randomUUID(),
            userId,
            message,
            email: email || null,
            reply: null,
            seen: false,
            timestamp: new Date().toISOString()
        };

        let inquiries: any[] = [];
        try {
            const data = await fs.readFile(INQUIRY_FILE, 'utf-8');
            inquiries = JSON.parse(data);
        } catch (e) {}

        inquiries.push(entry);

        await fs.writeFile(INQUIRY_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');

        return new Response(JSON.stringify({ success: true, id: entry.id }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
};