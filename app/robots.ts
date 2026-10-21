import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

// Read when asked, like every page here: the build never needs the API, and
// SITE_URL is the one the server runs with.
export const dynamic = 'force-dynamic'

// Everything but one customer's pages: their cart, their checkout, their orders.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/order/', '/my-orders', '/auth/', '/api/'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
