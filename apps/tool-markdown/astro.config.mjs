import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://markdownmaster.site',
  output: 'static',
  build: {
    inlineStylesheets: 'always'
  }
});
