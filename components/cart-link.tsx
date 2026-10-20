'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { countUnits } from '@/lib/cart'
import { useCart } from './cart-store'
import { BagIcon } from './icons'

export function CartLink() {
  const { lines, hydrated } = useCart()
  const units = hydrated ? countUnits(lines) : 0
  const label = units === 0 ? 'Carrito vacío' : units === 1 ? 'Carrito, 1 producto' : `Carrito, ${units} productos`

  // The count bumps when something goes in — the answer to «did it add?»,
  // where the eye goes next. Not when the page first reads the cart: that is
  // the count it already had.
  const seen = useRef<number | null>(null)
  const [bumps, setBumps] = useState(0)
  useEffect(() => {
    if (!hydrated) return
    if (seen.current !== null && units > seen.current) setBumps((n) => n + 1)
    seen.current = units
  }, [hydrated, units])

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="pressable inline-flex h-9 items-center gap-2 rounded-full bg-ink pr-3.5 pl-3 text-xs font-medium text-paper transition-[background-color,scale] hover:bg-ink/85"
    >
      <BagIcon width={16} height={16} />
      <span className="hidden sm:inline">Carrito</span>
      <span key={bumps} aria-hidden="true" className={`inline-block tabular-nums ${bumps ? 'animate-bump' : ''}`}>
        {units > 99 ? '99+' : units}
      </span>
    </Link>
  )
}
