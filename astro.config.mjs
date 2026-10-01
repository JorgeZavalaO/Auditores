import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import { resolveSite } from './config/site.mjs';

const deployment = resolveSite({ ...loadEnv(process.env.NODE_ENV || 'production', process.cwd(), ''), ...process.env });

export default defineConfig({
  site: deployment.origin,
  output: 'static',
  integrations: deployment.indexable ? [sitemap()] : [],
  trailingSlash: 'always',
});
