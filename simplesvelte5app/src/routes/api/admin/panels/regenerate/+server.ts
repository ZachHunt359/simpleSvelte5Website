import { generatePanelsJson } from '../../../../../../scripts/generate-panels-json.js';
import { isAdmin } from '$lib/auth/helpers';

export const POST = async ({ cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Run generation (sync) and return result
    try {
      generatePanelsJson({ regenThumbnails: false, log: true });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Generation failed', message: String(e?.message ?? e) }), { status: 500 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
