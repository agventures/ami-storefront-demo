'use client'

import { useEffect, useState } from 'react'
import { type CartInput, quoteCart } from '@/app/actions'
import type { Quote } from '@/lib/types'

type Result = { key: string | null; quote: Quote | null; error: string | null }

/**
 * Asks Ami to price the cart whenever it changes, after a short pause.
 * `fresh` is false while a newer answer is on its way: never let the
 * customer pay against a total that is no longer the cart's.
 */
export function useQuote(input: CartInput | null, { delay = 400, nonce = 0 } = {}) {
  const key = input && Array.isArray(input.lines) && input.lines.length ? JSON.stringify([input, nonce]) : null
  const [result, setResult] = useState<Result>({ key: null, quote: null, error: null })

  useEffect(() => {
    if (!key) return
    let live = true
    const [payload] = JSON.parse(key) as [CartInput, number]
    const timer = setTimeout(() => {
      quoteCart(payload)
        .then((r) => {
          if (!live) return
          setResult((prev) =>
            r.ok ? { key, quote: r.quote, error: null } : { key, quote: prev.quote, error: r.message },
          )
        })
        .catch(() => {
          if (live) setResult((prev) => ({ key, quote: prev.quote, error: 'No pudimos calcular el total. Revisa tu conexión.' }))
        })
    }, delay)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [key, delay])

  const current = key !== null && result.key === key
  return {
    // The last answer, possibly for an older cart: shown dimmed while loading.
    quote: key ? result.quote : null,
    error: current ? result.error : null,
    loading: key !== null && !current,
    fresh: current && !result.error && result.quote !== null,
  }
}
