import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/site';

// 검색에는 랜딩·데모·공개 마을만. 대시보드(/app)와 임베드(/embed, 남의 사이트 iframe용)는 뺀다
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/app', '/embed/', '/design-system'] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
