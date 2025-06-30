import type { RequestHandler } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer'; // Uncomment and configure for real email sending

const INQUIRY_FILE = path.resolve('static/inquiries.json');

// Configure your SMTP transport (use real credentials in production)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'your@email.com',
        pass: process.env.SMTP_PASS || 'yourpassword'
    }
});

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { id, email, message, reply } = await request.json();
        if (!id || !email || !message || !reply) {
            return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
        }

        // Send the email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Comic Replies" <no-reply@yourdomain.com>',
            to: email,
            subject: 'Reply to your inquiry',
            text: `Your question:\n${message}\n\nOur reply:\n${reply}`
        });

        // Remove the inquiry from the file
        let inquiries: any[] = [];
        try {
            const data = await fs.readFile(INQUIRY_FILE, 'utf-8');
            inquiries = JSON.parse(data);
        } catch (e) {}
        const filtered = inquiries.filter((inq) => inq.id !== id);
        await fs.writeFile(INQUIRY_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
};