import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const nonIndexableRoutes = new Set(['/pricing/', '/feed.xml']);

// https://astro.build/config
export default defineConfig({
  site: 'https://markdownmaster.site',
  integrations: [
    sitemap({
      filter: (page) => !nonIndexableRoutes.has(new URL(page).pathname),
    }),
  ],
  build: {
    inlineStylesheets: 'always',
  },
});
