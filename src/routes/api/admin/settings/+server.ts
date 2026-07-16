import type { RequestHandler } from '@sveltejs/kit';
import { get, run } from '$lib/db';
import { isAdmin } from '$lib/auth/helpers';
import { logInfo } from '$lib/logger';

// GET /api/admin/settings - Get all site settings
export const GET: RequestHandler = async ({ cookies }) => {
  try {
    if (!(await isAdmin(cookies))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const imageServingMode = await get('SELECT SettingValue FROM SiteSettings WHERE SettingKey = ?', ['imageServingMode']);
    
    return new Response(JSON.stringify({
      imageServingMode: imageServingMode?.SettingValue || 'auto'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[admin/settings GET] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { status: 500 });
  }
};

// POST /api/admin/settings - Update site settings
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    if (!(await isAdmin(cookies))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { imageServingMode } = await request.json();
    
    // Validate the value
    const validModes = ['auto', 'desktop-only', 'mobile-only'];
    if (!validModes.includes(imageServingMode)) {
      return new Response(JSON.stringify({ error: 'Invalid image serving mode' }), { status: 400 });
    }

    const epoch = Math.floor(Date.now() / 1000);
    await run(
      'INSERT INTO SiteSettings (SettingKey, SettingValue, UpdatedAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE SettingValue = ?, UpdatedAt = ?',
      ['imageServingMode', imageServingMode, epoch, imageServingMode, epoch]
    );

    await logInfo('[admin/settings] Updated imageServingMode', { mode: imageServingMode });

    return new Response(JSON.stringify({ success: true, imageServingMode }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[admin/settings POST] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update settings' }), { status: 500 });
  }
};
