import type { Product } from './types'

// What a search engine reads off a product's page: Schema.org's `Product`
// with its `Offer`, from the catalogue as Ami answers it. `price` is the bare
// figure Schema.org asks for; nothing here adds or converts money.

const AVAILABILITY = {
  in: 'https://schema.org/InStock',
  out: 'https://schema.org/OutOfStock',
  backorder: 'https://schema.org/BackOrder',
}

function availability(item: { sold_out: boolean; backorder?: boolean }) {
  if (item.backorder) return AVAILABILITY.backorder
  return item.sold_out ? AVAILABILITY.out : AVAILABILITY.in
}

export function productJsonLd(product: Product, currency: string, url: string, seller: string) {
  const sku = product.sku ?? product.variants.find((v) => v.sku)?.sku ?? undefined
  const offerFields = { priceCurrency: currency, url, seller: { '@type': 'Organization', name: seller } }
  const priced = product.variants.filter((v) => v.price)
  const offers =
    priced.length > 1
      ? {
          '@type': 'AggregateOffer',
          ...offerFields,
          lowPrice: priced.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b)).price,
          highPrice: priced.reduce((a, b) => (Number(a.price) >= Number(b.price) ? a : b)).price,
          offerCount: priced.length,
          // On the shelf if any size is; else to order if any is «Por encargo»
          // (which the catalogue does not mark sold out); else out of stock.
          availability: priced.some((v) => !v.sold_out && !v.backorder)
            ? AVAILABILITY.in
            : priced.some((v) => v.backorder)
              ? AVAILABILITY.backorder
              : AVAILABILITY.out,
        }
      : product.price
        ? { '@type': 'Offer', ...offerFields, price: product.price, availability: availability(product) }
        : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(product.description ? { description: product.description.slice(0, 5000) } : {}),
    ...(product.image_full_url ? { image: [product.image_full_url] } : {}),
    ...(sku ? { sku } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.category ? { category: product.category } : {}),
    ...(offers ? { offers } : {}),
  }
}

/** A JSON-LD block's contents that cannot close the `<script>` it sits in,
 *  whatever a description says. */
export function jsonLdText(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}
