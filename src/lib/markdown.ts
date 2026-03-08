import { Marked } from 'marked';

const marked = new Marked({
  renderer: {
    link({ href, title, text }) {
      const titleAttr = title ? ` title="${title}"` : '';
      // Add rel="nofollow sponsored" to Bol.com affiliate links
      // TODO: Add other affiliates
      if (href && href.includes('partner.bol.com')) {
        return `<a href="${href}"${titleAttr} rel="nofollow sponsored">${text}</a>`;
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`;
    },
  },
});

export function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}