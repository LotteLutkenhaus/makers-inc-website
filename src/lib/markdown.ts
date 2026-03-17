import { Marked } from 'marked';

const marked = new Marked({
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
  },
});

function preprocessMarkdown(md: string): string {
  // Convert `youtube:URL` (backtick-wrapped) to responsive iframe embeds
  return md.replace(
    /`youtube:(https?:\/\/[^\s`]+)`/g,
    (_, url) =>
      `<div class="youtube-embed"><iframe src="${url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
  );
}

export function renderMarkdown(md: string): string {
  return marked.parse(preprocessMarkdown(md)) as string;
}