'use client'

import Link from 'next/link'
import { countUnits } from '@/lib/cart'
import { useCart } from './cart-store'
import { BagIcon } from './icons'

export function CartLink() {
  const { lines, hydrated } = useCart()
  const units = hydrated ? countUnits(lines) : 0
  const label = units === 0 ? 'Carrito vacío' : units === 1 ? 'Carrito, 1 producto' : `Carrito, ${units} productos`

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative inline-flex size-11 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-line transition-colors hover:bg-brand-soft"
    >
      <BagIcon width={22} height={22} />
      {units > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] leading-5 font-bold text-white tabular-nums"
        >
          {units > 99 ? '99+' : units}
        </span>
      )}
    </Link>
  )
}
