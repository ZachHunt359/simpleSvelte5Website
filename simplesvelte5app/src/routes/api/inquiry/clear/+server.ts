import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

const INQUIRY_FILE = path.resolve('static/inquiries.json');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { userId, inquiryIds } = await request.json();
        if (!userId || !Array.isArray(inquiryIds)) {
            return new Response(JSON.stringify({ error: 'Missing userId or inquiryIds' }), { status: 400 });
        }

        let inquiries: any[] = [];
        try {
            const data = await fs.readFile(INQUIRY_FILE, 'utf-8');
            inquiries = JSON.parse(data);
        } catch (e) {}

        // Remove only the inquiries for this user and these IDs
        const filtered = inquiries.filter(
            (inq) => !(inq.userId === userId && inquiryIds.includes(inq.id))
        );

        await fs.writeFile(INQUIRY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
};