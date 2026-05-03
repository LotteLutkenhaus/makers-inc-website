/**
 * Transforms a raw Contentful asset URL into an optimised delivery URL.
 *
 * Handles both CDN hostnames:
 *   - images.ctfassets.net  (current)
 *   - images.contentful.com (legacy, used in older blog posts)
 *
 * Always returns an absolute https:// URL.
 * Appends Contentful Images API parameters for format, size, and quality.
 * Never appends params to non-Contentful URLs (leave them untouched).
 * Never appends params to video URLs (mp4, webm, mov).
 *
 * Preset reference:
 *   'hero'      → w=1200, fm=webp, q=85                (full-width hero images)
 *   'thumbnail' → w=750, h=375, fm=webp, q=80, fit=fill (blog listing cards)
 *   'og'        → w=1200, h=630, fm=webp, q=85, fit=fill (Open Graph / social)
 *   'body'      → w=800, fm=webp, q=80                  (inline body images)
 *   'body-wide' → w=1200, fm=webp, q=80                 (wide body images)
 *   'logo'      → w=250, fm=webp, q=90                  (nav/footer logo, 2× retina at 125px display width)
 */

const CONTENTFUL_IMAGE_HOSTS = new Set(['images.ctfassets.net', 'images.contentful.com']);

export type ImagePreset = 'hero' | 'thumbnail' | 'og' | 'body' | 'body-wide' | 'logo';

const PRESETS: Record<ImagePreset, Record<string, string>> = {
  'hero':       { w: '1200', fm: 'webp', q: '85' },
  'thumbnail':  { w: '750', h: '375', fm: 'webp', q: '80', fit: 'fill' },
  'og':         { w: '1200', h: '630', fm: 'webp', q: '85', fit: 'fill' },
  'body':       { w: '800', fm: 'webp', q: '80' },
  'body-wide':  { w: '1200', fm: 'webp', q: '80' },
  'logo':       { w: '250', fm: 'webp', q: '90' },
};

export function isVideoUrl(url: string): boolean {
  const bare = url.split('?')[0];
  return /\.(mp4|webm|mov)$/i.test(bare) || bare.includes('videos.ctfassets.net');
}

export function contentfulImageUrl(raw: string, preset: ImagePreset): string {
  if (!raw) return raw;
  const href = raw.startsWith('//') ? `https:${raw}` : raw;

  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return href;
  }

  if (!CONTENTFUL_IMAGE_HOSTS.has(parsed.hostname)) return href;
  if (isVideoUrl(href)) return href;

  const params = new URLSearchParams(parsed.search);
  for (const [key, value] of Object.entries(PRESETS[preset])) {
    params.set(key, value);
  }

  return `https://${parsed.hostname}${parsed.pathname}?${params.toString()}`;
}
