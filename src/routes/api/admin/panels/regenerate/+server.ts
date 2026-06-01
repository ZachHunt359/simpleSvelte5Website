import { generatePanelsJson } from '../../../../../../scripts/generate-panels-json.js';
import { ensureYouTubeEntries } from '../../../../../../scripts/ensure-youtube-entries.js';
import { isAdmin, getUserFromCookies } from '$lib/auth/helpers';
import { logInfo } from '$lib/logger';
import { PANELS_CONFIG } from '$lib/config/panels.server';

export const POST = async ({ cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Run generation (sync) and return result
    try {
      // Log manual regeneration request (include admin identity when available)
      try {
        const user = await getUserFromCookies(cookies);
        const id = (user && user.email) ? String(user.email).toLowerCase() : 'unknown';
        logInfo('Generating Panels (Manual)', { triggeredBy: id });
      } catch (_) {
        try { logInfo('Generating Panels (Manual)', {}); } catch (_) {}
      }

      // Step 1: Ensure YouTube entries are in _order.json
      console.log('📹 Step 1/2: Ensuring YouTube entries in _order.json...');
      ensureYouTubeEntries();
      
      // Step 2: Generate panels.json with cache-busting timestamps
      console.log('🎨 Step 2/2: Generating panels.json...');
      generatePanelsJson({ regenThumbnails: false, log: true });
      
      console.log('✅ Panel regeneration complete!');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Generation failed', message: String(e?.message ?? e) }), { status: 500 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
