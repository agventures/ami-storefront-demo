import type { MetadataRoute } from 'next'
import { getCatalog, getStore } from '@/lib/ami'
import { siteUrl } from '@/lib/site'

// Read when asked, like every page here: the build never needs the API, and
// SITE_URL is the one the server runs with.
export const dynamic = 'force-dynamic'

// Every page a search engine should know: the home, «Citas» when the store
// takes appointments, the policies and each product's page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  return [
    { url: `${base}/` },
    ...(store.modules?.booking ? [{ url: `${base}/appointments` }] : []),
    ...(store.policies ?? []).map((p) => ({ url: `${base}/policies/${encodeURIComponent(p.key)}` })),
    ...catalog.products.map((p) => ({ url: `${base}/product/${encodeURIComponent(p.id)}` })),
  ]
}
