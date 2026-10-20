'use client'

import { useRouter } from 'next/navigation'
import { type ComponentType, type KeyboardEvent, type SVGProps, useEffect, useId, useRef, useState, useTransition } from 'react'
import { CURRENCY_COOKIE, type Currency } from '@/lib/currency'
import type { Exchange } from '@/lib/types'
import { FlagUS, FlagVE } from './flags'
import { CheckIcon, ChevronDownIcon } from './icons'

type Option = { value: Currency; country: string; label: string; Flag: ComponentType<SVGProps<SVGSVGElement>> }

const OPTIONS: Option[] = [
  { value: 'USD', country: 'US', label: 'Dólar · USD ($)', Flag: FlagUS },
  { value: 'VES', country: 'VE', label: 'Bolívar · VES (Bs)', Flag: FlagVE },
]

/** Which of Ami's two texts every price shows: a listbox with each
 *  currency's flag. The choice is a cookie, so the server pages render it
 *  on the next request; the rate is in the list's footer, as Ami wrote it.
 *  Keyboard: the arrows move, Enter or Space picks, Escape closes. */
export function CurrencySelect({ currency, exchange }: { currency: Currency; exchange: Exchange }) {
  const id = useId()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => OPTIONS.findIndex((o) => o.value === currency))
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = OPTIONS.find((o) => o.value === currency) ?? OPTIONS[0]

  // A click anywhere else closes it.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  useEffect(() => {
    if (open) list.current?.focus()
  }, [open])

  function show() {
    setActive(OPTIONS.findIndex((o) => o.value === currency))
    setOpen(true)
  }

  function choose(next: Currency) {
    setOpen(false)
    button.current?.focus()
    if (next === currency) return
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  function onButtonKey(e: KeyboardEvent) {
    // Open, with focus left on the button (a click can keep it there): the
    // list's keys still work.
    if (open) return onListKey(e)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      show()
    }
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, OPTIONS.length - 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(OPTIONS.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') choose(OPTIONS[active].value)
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
      if (e.key === 'Escape') button.current?.focus()
      return
    } else return
    e.preventDefault()
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`Moneda: ${current.label}`}
        aria-busy={pending}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className={`flex h-9 items-center gap-2 rounded-full border bg-white/70 pr-2.5 pl-3 text-xs font-medium transition-[border-color,opacity] duration-150 aria-busy:opacity-60 ${open ? 'border-ink' : 'border-line hover:border-ink/40'}`}
      >
        <current.Flag className="shrink-0 rounded-[2px] ring-1 ring-black/10" />
        <span>
          {current.country}
          <span className="hidden sm:inline"> · {current.value} ({current.value === 'USD' ? '$' : 'Bs'})</span>
        </span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`text-muted transition-transform duration-200 ease-(--ease-out-soft) ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        // Grows out of the button's corner. A transition, not a keyframe, so
        // closing while it is still opening turns back from where it is;
        // leaving is quicker than arriving.
        className={`absolute top-[calc(100%+0.5rem)] right-0 z-40 w-64 origin-top-right rounded-2xl border border-line bg-paper p-1.5 shadow-xl shadow-black/10 transition-[opacity,transform] ${open ? 'translate-y-0 scale-100 opacity-100 duration-200 ease-(--ease-out-soft)' : 'pointer-events-none -translate-y-1 scale-[0.96] opacity-0 duration-[140ms] ease-(--ease-in-soft)'}`}
      >
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label="Moneda"
          aria-activedescendant={open ? `${id}-${OPTIONS[active].value}` : undefined}
          onKeyDown={onListKey}
          className="space-y-1 outline-none"
        >
          {OPTIONS.map((option, i) => {
            const selected = option.value === currency
            return (
              <li
                key={option.value}
                id={`${id}-${option.value}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(option.value)}
                // No transition on the highlight: it follows the arrow keys,
                // and a fade would trail behind them.
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] ${i === active ? 'bg-shade' : 'bg-white/60'}`}
              >
                <option.Flag width={24} height={17} className="shrink-0 rounded-[2px] ring-1 ring-black/10" />
                <span className="flex-1">{option.label}</span>
                {selected ? <CheckIcon width={16} height={16} className="text-ink" /> : null}
              </li>
            )
          })}
        </ul>
        <p className="px-3 pt-2 pb-1 text-[11px] text-muted">Tasa del día: {exchange.rate_text}</p>
      </div>
    </div>
  )
}
