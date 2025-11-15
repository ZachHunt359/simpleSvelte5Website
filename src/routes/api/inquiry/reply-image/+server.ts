import type { RequestHandler } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logError } from '$lib/logger';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }), { status: 400 });
    }

    // Validate file size (max 25MB - Gmail attachment limit)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 25MB.' }), { status: 400 });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `reply-${timestamp}.${ext}`;
    
    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'static', 'inquiry-images');
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filepath = join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Return URL relative to static folder
    const url = `/inquiry-images/${filename}`;
    
    return new Response(JSON.stringify({ success: true, url }), { status: 200 });
  } catch (err: any) {
    const stack = err && err.stack ? err.stack : String(err);
    logError('[api/inquiry/reply-image] POST error', { stack });
    return new Response(JSON.stringify({ error: 'Server error', __fallbackError: 'Image upload failed (see server logs)' }), { status: 500 });
  }
};
