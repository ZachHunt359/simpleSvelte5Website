export function formatPublishDate(publishDateIso: string | null | undefined, publishTZ?: string | null): string | null {
  if (!publishDateIso) return null;
  try {
    const date = new Date(String(publishDateIso));
    if (publishTZ && typeof Intl !== 'undefined' && (Intl as any).DateTimeFormat) {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: publishTZ }).format(date) + ` (${publishTZ})`;
    }
    return date.toLocaleString();
  } catch (e) {
    return String(publishDateIso);
  }
}
