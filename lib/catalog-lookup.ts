import type { Catalog, CartLine } from './types'

// Names and pictures for the cart, built on the server from the cached
// catalogue. Deliberately no prices: the cart's money comes from POST /quote.

export type ProductLookup = Record<
  string,
  {
    name: string
    image: string | null
    variants: Record<string, string>
    options: Record<string, string>
    /** The answers the API adds by itself today («Sin costilla», from an
     *  `auto` group) and the presentations each is about. The cart never
     *  holds them — they are not sent — but it should still say them. */
    given: { name: string; variant_ids: string[] | null }[]
  }
>

export function productLookup(catalog: Catalog): ProductLookup {
  const lookup: ProductLookup = {}
  for (const p of catalog.products) {
    const options: Record<string, string> = {}
    for (const group of p.option_groups) for (const o of group.options) options[o.id] = o.name
    lookup[p.id] = {
      name: p.name,
      image: p.image_url ?? p.media.find((m) => m.kind === 'image')?.thumb_url ?? null,
      variants: Object.fromEntries(p.variants.map((v) => [v.variant_id, v.name])),
      options,
      given: p.option_groups
        .filter((g) => g.auto && g.options.length > 0)
        .map((g) => ({ name: g.options[0].name, variant_ids: g.variant_ids ?? null })),
    }
  }
  return lookup
}

/** «Grande · Sin azúcar, Extra chispas · Nota: …» for a line. */
export function lineDetails(line: CartLine, lookup: ProductLookup) {
  const product = lookup[line.product_id]
  const parts: string[] = []
  if (line.variant_id) parts.push(product?.variants[line.variant_id] ?? '')
  // A line with no variant_id is a product sold one way: every group is about it.
  const given = (product?.given ?? [])
    .filter((g) => !line.variant_id || !g.variant_ids?.length || g.variant_ids.includes(line.variant_id))
    .map((g) => g.name)
  const options = [...given, ...line.options.map((id) => product?.options[id]).filter(Boolean)]
  if (options.length) parts.push(options.join(', '))
  return parts.filter(Boolean).join(' · ')
}
