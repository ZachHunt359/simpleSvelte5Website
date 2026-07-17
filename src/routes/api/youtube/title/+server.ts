import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/youtube/title?id={videoId}
 * 
 * Fetches the title of a YouTube video using:
 * 1. YouTube Data API v3 (if YOUTUBE_API_KEY is set in environment)
 * 2. YouTube oEmbed API (fallback, no API key required)
 * 
 * Returns: { title: string } or { error: string }
 */
export const GET: RequestHandler = async ({ url }) => {
  const videoId = url.searchParams.get('id');
  
  if (!videoId) {
    return json({ error: 'Missing video ID' }, { status: 400 });
  }

  // Try YouTube Data API first if API key is available
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=snippet&key=${apiKey}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0 && data.items[0].snippet?.title) {
          return json({ title: data.items[0].snippet.title });
        }
      }
    } catch (e) {
      console.warn('[YouTube API] Data API failed, falling back to oEmbed:', e);
      // Fall through to oEmbed
    }
  }

  // Fallback to oEmbed (no API key required, but less reliable)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      if (data.title) {
        return json({ title: data.title });
      }
    }
  } catch (e) {
    console.error('[YouTube API] oEmbed fetch failed:', e);
  }

  // If all methods fail, return error
  return json({ error: 'Failed to fetch video title' }, { status: 500 });
};
