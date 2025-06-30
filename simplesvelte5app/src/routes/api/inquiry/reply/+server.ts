import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

const INQUIRY_FILE = path.resolve('static/inquiries.json');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { id, reply } = await request.json();
        if (!id || !reply) return new Response(JSON.stringify({ error: 'Missing id or reply' }), { status: 400 });

        let inquiries: any[] = [];
        try {
            const data = await fs.readFile(INQUIRY_FILE, 'utf-8');
            inquiries = JSON.parse(data);
        } catch (e) {}

        const idx = inquiries.findIndex((entry) => entry.id === id);
        if (idx === -1) return new Response(JSON.stringify({ error: 'Inquiry not found' }), { status: 404 });

        inquiries[idx].reply = reply;
        inquiries[idx].replyTimestamp = new Date().toISOString();

        await fs.writeFile(INQUIRY_FILE, JSON.stringify(inquiries, null, 2), 'utf-8');

        // TODO: If inquiries[idx].email, send email here

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
};