import { Marked } from 'marked';
import { contentfulImageUrl, isVideoUrl } from './contentful-image';
import { getAssetById } from './contentful';

// Build-time cache: Contentful asset ID → original image dimensions.
// Shared across all renderMarkdown calls in a single build so each asset
// is only fetched once regardless of how many posts reference it.
const dimCache = new Map<string, { width: number; height: number }>();

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Fetches the original pixel dimensions for a Contentful image URL and stores
// them in dimCache. Asset ID is parsed from the URL path:
//   /{spaceId}/{assetId}/{hash}/{filename}
async function prefetchDimensions(url: string): Promise<void> {
  let assetId: string;
  try {
    assetId = new URL(url).pathname.split('/')[2];
  } catch {
    return;
  }
  if (!assetId || dimCache.has(assetId)) return;

  try {
    const asset = await getAssetById(assetId);
    const image = (asset?.fields as any)?.file?.details?.image;
    if (image?.width && image?.height) {
      dimCache.set(assetId, { width: image.width as number, height: image.height as number });
    }
  } catch {
    // Dimension fetch failed — image will render without explicit width/height.
  }
}

function getCachedDims(url: string): { width: number; height: number } | undefined {
  try {
    const assetId = new URL(url).pathname.split('/')[2];
    return assetId ? dimCache.get(assetId) : undefined;
  } catch {
    return undefined;
  }
}

const CONTENTFUL_IMAGE_HOSTS = new Set(['images.ctfassets.net', 'images.contentful.com']);

function isContentfulImageUrl(url: string): boolean {
  try {
    return CONTENTFUL_IMAGE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const marked = new Marked({
  async: true,
  breaks: true,

  // walkTokens runs before rendering and supports async, so we pre-fetch all
  // Contentful image dimensions here. By the time renderer.image runs, every
  // dimension is already in dimCache and the renderer can stay synchronous.
  walkTokens: async (token) => {
    if (token.type !== 'image') return;
    const raw: string = (token as any).href ?? '';
    const src = raw.startsWith('//') ? `https:${raw}` : raw;
    if (isContentfulImageUrl(src) && !isVideoUrl(src)) {
      await prefetchDimensions(src);
    }
  },

  renderer: {
    link({ href, title, text }) {
      const titleAttr = title ? ` title="${title}"` : '';
      // Ensure internal links always have a trailing slash
      if (href && href.startsWith('/') && !href.includes('?') && !href.includes('#') && !href.endsWith('/')) {
        href = href + '/';
      }
      // Add rel="nofollow sponsored" to Bol.com affiliate links
      // TODO: Add other affiliates
      if (href && href.includes('partner.bol.com')) {
        return `<a href="${href}"${titleAttr} rel="nofollow sponsored" target="_blank">${text}</a>`;
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },

    image({ href, text, title }) {
      if (!href) return `<img alt="${escAttr(text ?? '')}">`;

      const src = href.startsWith('//') ? `https:${href}` : href;
      const altAttr = escAttr(text ?? '');
      const titleAttr = title ? ` title="${escAttr(title)}"` : '';

      // Video asset: emit <video> instead of <img>
      if (isVideoUrl(src)) {
        return `<video src="${src}" autoplay loop muted playsinline width="800" style="width:100%;height:auto;" aria-label="${altAttr}"></video>`;
      }

      const optimisedSrc = contentfulImageUrl(src, 'body');

      // Dimensions were pre-fetched by walkTokens; read from cache.
      // Contentful won't upscale, so the delivered width is min(original, 800).
      let dimAttrs = '';
      if (isContentfulImageUrl(src)) {
        const orig = getCachedDims(src);
        if (orig) {
          const w = Math.min(orig.width, 800);
          const h = Math.round(orig.height * (w / orig.width));
          dimAttrs = ` width="${w}" height="${h}"`;
        }
      }

      return `<img src="${optimisedSrc}" alt="${altAttr}"${titleAttr}${dimAttrs} loading="lazy" decoding="async">`;
    },
  },
});

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/');
      const idx = parts.findIndex(p => p === 'embed' || p === 'v');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function preprocessMarkdown(md: string): string {
  return md.replace(
    /`youtube:(https?:\/\/[^\s`]+)`/g,
    (_, url) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) return '';
      return `<div class="youtube-embed"><lite-youtube videoid="${videoId}"></lite-youtube></div>`;
    }
  );
}

export async function renderMarkdown(md: string): Promise<string> {
  return await marked.parse(preprocessMarkdown(md));
}
