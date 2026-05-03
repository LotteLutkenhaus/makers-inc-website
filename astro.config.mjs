// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.makersinc.nl',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  image: {
    domains: ['images.ctfassets.net', 'images.contentful.com'],
    format: 'webp',
    quality: 80,
  },
});