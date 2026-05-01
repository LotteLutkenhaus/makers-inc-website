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

// Fetches the original pixel dimensions for a Contentful image URL.
// Asset ID is parsed from the URL path: /{spaceId}/{assetId}/{hash}/{filename}
async function getOriginalDimensions(url: string): Promise<{ width: number; height: number } | null> {
  let assetId: string;
  try {
    assetId = new URL(url).pathname.split('/')[2];
  } catch {
    return null;
  }
  if (!assetId) return null;

  if (dimCache.has(assetId)) return dimCache.get(assetId)!;

  try {
    const asset = await getAssetById(assetId);
    const image = (asset?.fields as any)?.file?.details?.image;
    if (!image?.width || !image?.height) return null;
    const dims = { width: image.width as number, height: image.height as number };
    dimCache.set(assetId, dims);
    return dims;
  } catch {
    return null;
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

    async image({ href, text, title }) {
      if (!href) return `<img alt="${escAttr(text ?? '')}">`;

      const src = href.startsWith('//') ? `https:${href}` : href;
      const altAttr = escAttr(text ?? '');
      const titleAttr = title ? ` title="${escAttr(title)}"` : '';

      // Video asset: emit <video> instead of <img>
      if (isVideoUrl(src)) {
        return `<video src="${src}" autoplay loop muted playsinline width="800" style="width:100%;height:auto;" aria-label="${altAttr}"></video>`;
      }

      const optimisedSrc = contentfulImageUrl(src, 'body');

      // For Contentful images, fetch original dimensions so the browser can
      // reserve the right space before the image loads (CLS = 0).
      let dimAttrs = '';
      if (isContentfulImageUrl(src)) {
        const orig = await getOriginalDimensions(src);
        if (orig) {
          // Contentful won't upscale, so the delivered width is min(original, 800).
          const w = Math.min(orig.width, 800);
          const h = Math.round(orig.height * (w / orig.width));
          dimAttrs = ` width="${w}" height="${h}"`;
        }
      }

      return `<img src="${optimisedSrc}" alt="${altAttr}"${titleAttr}${dimAttrs} loading="lazy" decoding="async">`;
    },
  },
});

function preprocessMarkdown(md: string): string {
  // Convert `youtube:URL` (backtick-wrapped) to responsive iframe embeds
  return md.replace(
    /`youtube:(https?:\/\/[^\s`]+)`/g,
    (_, url) => {
      const noCookieUrl = url.replace(/\/\/(www\.)?youtube\.com\//, '//www.youtube-nocookie.com/');
      return `<div class="youtube-embed"><iframe src="${noCookieUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    }
  );
}

export async function renderMarkdown(md: string): Promise<string> {
  return await marked.parse(preprocessMarkdown(md));
}
