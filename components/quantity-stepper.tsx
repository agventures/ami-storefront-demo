'use client'

import { MAX_QUANTITY } from '@/lib/cart'
import { MinusIcon, PlusIcon } from './icons'

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  label,
  size = 'md',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  label: string
  size?: 'sm' | 'md'
}) {
  const button =
    size === 'sm'
      ? 'pressable size-8 rounded-full transition-[background-color,scale] hover:bg-shade disabled:opacity-40 disabled:active:scale-100'
      : 'pressable size-11 rounded-full transition-[background-color,scale] hover:bg-shade disabled:opacity-40 disabled:active:scale-100'
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border border-line bg-white">
      <button
        type="button"
        className={`flex items-center justify-center ${button}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Quitar uno"
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span aria-live="polite" className={`text-center font-semibold tabular-nums ${size === 'sm' ? 'w-7 text-sm' : 'w-9'}`}>
        {value}
      </span>
      <button
        type="button"
        className={`flex items-center justify-center ${button}`}
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label="Agregar uno"
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  )
}
