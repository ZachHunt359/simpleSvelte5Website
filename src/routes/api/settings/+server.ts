import type { RequestHandler } from '@sveltejs/kit';
import { get } from '$lib/db';

// GET /api/settings - Public endpoint to get image serving mode
export const GET: RequestHandler = async () => {
  try {
    const imageServingMode = await get('SELECT SettingValue FROM SiteSettings WHERE SettingKey = ?', ['imageServingMode']);
    
    return new Response(JSON.stringify({
      imageServingMode: imageServingMode?.SettingValue || 'auto'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('[api/settings GET] Error:', error);
    // Return default on error
    return new Response(JSON.stringify({ imageServingMode: 'auto' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
};
