import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
    const file = path.resolve('static/panels.json');
    try {
        const data = fs.readFileSync(file, 'utf-8');
        return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Could not read panels.json' }), { status: 500 });
    }
}