import { describe, it, expect } from 'vitest';
import { formatPublishDate } from '../publish-utils';

describe('formatPublishDate', () => {
  it('returns null for null input', () => {
    expect(formatPublishDate(null)).toBeNull();
  });

  it('formats ISO date without tz fallback to locale string', () => {
    const out = formatPublishDate('2025-11-01T12:00:00.000Z');
    expect(typeof out).toBe('string');
    expect(out).not.toBeNull();
  });

  it('includes timezone when publishTZ is provided', () => {
    const out = formatPublishDate('2025-11-01T12:00:00.000Z', 'America/New_York');
    expect(typeof out).toBe('string');
    expect(out).toContain('America/New_York');
  });
});
