import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/pricing',
    '/features',
    '/security',
    '/contact',
    '/legal/terms',
    '/legal/privacy',
  ];

  return routes.map((route) => ({
    url: `https://payflow.in${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}