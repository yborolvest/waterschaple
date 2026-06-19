import type { APIRoute } from 'astro';
import { absoluteUrl, SITEMAP_PATHS } from '../lib/seo';

export const GET: APIRoute = () => {
  const today = new Date().toISOString().slice(0, 10);

  const urls = SITEMAP_PATHS.map((path) => {
    const priority = path === '/' ? '1.0' : path === '/privacy' ? '0.3' : '0.8';
    const changefreq = path === '/privacy' ? 'monthly' : 'daily';

    return `  <url>
    <loc>${absoluteUrl(path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
