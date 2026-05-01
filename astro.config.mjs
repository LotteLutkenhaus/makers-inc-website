// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.makersinc.nl',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  image: {
    // Delegate all image optimisation to Contentful's Images API.
    // <Image> outputs the URL as-is; no build-time downloads or reprocessing.
    service: passthroughImageService(),
    domains: ['images.ctfassets.net', 'images.contentful.com'],
  },
});