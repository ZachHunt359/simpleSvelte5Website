import fs from 'fs/promises';
import path from 'path';
import { redirect } from '@sveltejs/kit';

export async function load() {
    const file = path.resolve('static/inquiries.json');
    let inquiries: any[] = [];
    try {
        const data = await fs.readFile(file, 'utf-8');
        inquiries = JSON.parse(data);
    } catch (e) {}
    return { inquiries };
}

export const actions = {
    logout: async ({ cookies }) => {
        cookies.delete('auth_token', { path: '/' });
        throw redirect(303, '/login');
    }
};