/**
 * Strips HTML tags from a string to prevent stored XSS.
 * For the MVP all rich-text input is plain text, so stripping
 * tags is sufficient. Upgrade to DOMPurify / sanitize-html if
 * rich-text editing is added later.
 *
 * Returns an empty string for non-string values so it's safe to
 * chain with optional fields.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')      // strip HTML tags
    .replace(/[<>]/g, '')          // strip any remaining angle brackets
    .trim();
}
