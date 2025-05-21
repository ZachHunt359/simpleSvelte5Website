import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
    const dir = path.resolve('static/panels/desktop'); 
    let files = [];
    try {
        files = fs.readdirSync(dir)
            .filter(file => /\.(png|jpg|jpeg|gif|webm)$/i.test(file))
            .map(file => `/panels/desktop/${file}`);
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Could not read directory' }), { status: 500 });
    }
    return new Response(JSON.stringify(files), { headers: { 'Content-Type': 'application/json' } });
}