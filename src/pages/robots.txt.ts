import type { APIRoute } from 'astro';
import { resolveSite } from '../../config/site.mjs';

export const GET: APIRoute = () => {
  const { origin, indexable } = resolveSite({ SITE_URL: import.meta.env.SITE, PUBLIC_LAUNCH_READY: import.meta.env.PUBLIC_LAUNCH_READY });
  const content = indexable
    ? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
