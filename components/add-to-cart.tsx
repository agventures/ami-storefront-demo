'use client'

import Link from 'next/link'
import { type FormEvent, useId, useState } from 'react'
import { type Currency, priceIn } from '@/lib/currency'
import type { OptionGroup, Product, Variant } from '@/lib/types'
import { cartActions } from './cart-store'
import { CheckIcon } from './icons'
import { QuantityStepper } from './quantity-stepper'

/** What a group asks for, in words: «Elige 1», «Opcional · hasta 3»… */
function groupHint(group: OptionGroup) {
  const { min_select: min, max_select: max } = group
  if (min <= 0) return max ? `Opcional · hasta ${max}` : 'Opcional'
  if (max === min) return `Elige ${min}`
  if (max == null) return `Elige al menos ${min}`
  return `Elige de ${min} a ${max}`
}

const groupIsValid = (group: OptionGroup, chosen: string[]) =>
  chosen.length >= group.min_select && (group.max_select == null || chosen.length <= group.max_select)

function initialVariant(product: Product) {
  const available = product.variants.filter((v) => !v.sold_out)
  return available.find((v) => v.variant_id === product.variant_id)?.variant_id ?? available[0]?.variant_id ?? null
}

export function AddToCart({ product, currency }: { product: Product; currency: Currency }) {
  const formId = useId()
  const hasVariants = product.variants.length > 0
  const [variantId, setVariantId] = useState<string | null>(() => (hasVariants ? initialVariant(product) : null))
  const [chosen, setChosen] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)
  const [addedAt, setAddedAt] = useState(0)
  const [full, setFull] = useState(false)

  const variant = product.variants.find((v) => v.variant_id === variantId) ?? null
  const invalidGroup = product.option_groups.find((g) => !groupIsValid(g, chosen[g.id] ?? []))

  const blocker = product.sold_out
    ? 'Agotado'
    : hasVariants && (!variant || variant.sold_out)
      ? `Elige ${product.kind === 'subscription' ? 'un plan' : 'una presentación'}`
      : invalidGroup
        ? `${groupHint(invalidGroup)} en «${invalidGroup.name}»`
        : null

  function toggle(group: OptionGroup, optionId: string, checked: boolean) {
    setAdded(false)
    setChosen((prev) => {
      const current = prev[group.id] ?? []
      let next: string[]
      if (!checked) next = current.filter((id) => id !== optionId)
      else if (group.max_select === 1) next = [optionId]
      else if (group.max_select != null && current.length >= group.max_select) next = current
      else next = [...current, optionId]
      return { ...prev, [group.id]: next }
    })
  }

  function add(event: FormEvent) {
    event.preventDefault()
    if (blocker) return
    const ok = cartActions.add({
      product_id: product.id,
      // Only products with presentations take a variant_id (`variant_required`).
      variant_id: hasVariants ? variantId : null,
      options: product.option_groups.flatMap((g) => chosen[g.id] ?? []),
      note: note.trim(),
      quantity,
    })
    setFull(!ok)
    setAdded(ok)
    if (ok) setAddedAt(Date.now())
    if (ok) {
      setQuantity(1)
      setNote('')
    }
  }

  return (
    <form onSubmit={add} className="space-y-6" aria-describedby={`${formId}-status`}>
      {hasVariants && (
        <VariantPicker
          product={product}
          name={`${formId}-variant`}
          value={variantId}
          currency={currency}
          onChange={(id) => {
            setVariantId(id)
            setAdded(false)
          }}
        />
      )}

      {product.option_groups.map((group) => {
        const picked = chosen[group.id] ?? []
        const radio = group.min_select === 1 && group.max_select === 1
        const atMax = group.max_select != null && group.max_select > 1 && picked.length >= group.max_select
        return (
          <fieldset key={group.id}>
            <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{group.name}</span>
              <span className={`text-xs ${groupIsValid(group, picked) ? 'text-muted' : 'font-medium text-ink'}`}>
                {groupHint(group)}
              </span>
            </legend>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {group.options.map((option) => {
                const checked = picked.includes(option.id)
                const disabled = option.sold_out || (!checked && atMax)
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type={radio ? 'radio' : 'checkbox'}
                        name={`${formId}-${group.id}`}
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => toggle(group, option.id, e.target.checked)}
                        className="size-4 accent-(--color-ink)"
                      />
                      {option.name}
                    </span>
                    <span className="text-muted">{option.sold_out ? 'Agotado' : option.delta_text}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      <div>
        <label htmlFor={`${formId}-note`} className="label">
          Nota para este producto <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id={`${formId}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Ej.: es para regalo, sin la etiqueta del precio"
          className="field resize-none"
        />
      </div>

      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-full bg-paper/90 p-1.5 shadow-lg ring-1 ring-line backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
        <QuantityStepper value={quantity} onChange={setQuantity} label="Cantidad" />
        <button type="submit" disabled={Boolean(blocker)} className="btn-primary flex-1">
          {product.sold_out ? 'Agotado' : 'Agregar al carrito'}
        </button>
      </div>

      <div id={`${formId}-status`} aria-live="polite" className="min-h-6 text-sm">
        {added ? (
          <p key={addedAt} className="flex animate-fade-in flex-wrap items-center gap-2 font-medium text-emerald-700">
            <CheckIcon width={18} height={18} /> Agregado al carrito.
            <Link href="/cart" className="text-ink underline underline-offset-2">
              Ver carrito
            </Link>
          </p>
        ) : full ? (
          <p className="animate-fade-in text-red-700">Tu carrito ya tiene el máximo de productos distintos.</p>
        ) : blocker && !product.sold_out ? (
          <p className="text-muted">{blocker}</p>
        ) : null}
      </div>
    </form>
  )
}

/** Sizes all at one price read as a row of chips — «S M L XL» — with the
 *  price once, above; anything else (a plan, «1 kg», sizes priced apart)
 *  reads as a list with each one's price beside it. */
function VariantPicker({ product, name, value, currency, onChange }: {
  product: Product
  name: string
  value: string | null
  currency: Currency
  onChange: (variantId: string) => void
}) {
  const sameprice = new Set(product.variants.map((v) => v.price)).size === 1
  const short = (v: Variant) => v.name.replace(/^Talla\s+/i, '')
  const isSizes = sameprice && product.variants.every((v) => short(v).length <= 4)
  const legend = product.kind === 'subscription' ? 'Plan' : isSizes ? 'Talla' : 'Presentación'

  if (isSizes) {
    return (
      <fieldset>
        <legend className="mb-3 flex w-full justify-between text-sm">
          <span className="font-medium">{legend}</span>
          {product.variants.some((v) => v.backorder) ? <span className="text-muted">Algunas por encargo</span> : null}
        </legend>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <label
              key={v.variant_id}
              title={v.sold_out ? 'Agotada' : v.backorder ? 'Por encargo' : undefined}
              className="pressable relative flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-white px-4 text-sm transition-[border-color,scale] has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-disabled:cursor-not-allowed has-disabled:text-muted has-disabled:line-through hover:border-ink/50"
            >
              <input
                type="radio"
                name={name}
                value={v.variant_id}
                checked={value === v.variant_id}
                disabled={v.sold_out}
                onChange={() => onChange(v.variant_id)}
                className="sr-only"
              />
              {short(v)}
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {product.variants.map((v) => (
          <label
            key={v.variant_id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm transition-[border-color] duration-150 has-checked:border-ink has-disabled:cursor-not-allowed has-disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name={name}
                value={v.variant_id}
                checked={value === v.variant_id}
                disabled={v.sold_out}
                onChange={() => onChange(v.variant_id)}
                className="size-4 accent-(--color-ink)"
              />
              <span className="font-medium">{v.name}</span>
            </span>
            <span className="text-right text-muted tabular-nums">
              {v.sold_out ? 'Agotado' : v.backorder ? `${priceIn(v, currency)} · Por encargo` : priceIn(v, currency)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
