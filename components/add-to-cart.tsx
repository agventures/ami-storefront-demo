'use client'

import Link from 'next/link'
import { type FormEvent, useId, useState } from 'react'
import type { OptionGroup, Product } from '@/lib/types'
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

export function AddToCart({ product }: { product: Product }) {
  const formId = useId()
  const hasVariants = product.variants.length > 0
  const [variantId, setVariantId] = useState<string | null>(() => (hasVariants ? initialVariant(product) : null))
  const [chosen, setChosen] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)
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
    if (ok) {
      setQuantity(1)
      setNote('')
    }
  }

  return (
    <form onSubmit={add} className="space-y-6" aria-describedby={`${formId}-status`}>
      {hasVariants && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{product.kind === 'subscription' ? 'Plan' : 'Presentación'}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {product.variants.map((v) => (
              <label
                key={v.variant_id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors has-checked:border-brand has-checked:bg-brand-soft has-disabled:cursor-not-allowed has-disabled:opacity-50 border-line bg-white`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`${formId}-variant`}
                    value={v.variant_id}
                    checked={variantId === v.variant_id}
                    disabled={v.sold_out}
                    onChange={() => {
                      setVariantId(v.variant_id)
                      setAdded(false)
                    }}
                    className="size-4 accent-(--color-brand)"
                  />
                  <span className="font-medium">{v.name}</span>
                </span>
                <span className="text-right text-muted">{v.sold_out ? 'Agotado' : v.price_text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {product.option_groups.map((group) => {
        const picked = chosen[group.id] ?? []
        const radio = group.min_select === 1 && group.max_select === 1
        const atMax = group.max_select != null && group.max_select > 1 && picked.length >= group.max_select
        return (
          <fieldset key={group.id}>
            <legend className="mb-2 flex w-full items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{group.name}</span>
              <span className={`text-xs ${groupIsValid(group, picked) ? 'text-muted' : 'font-medium text-brand-ink'}`}>
                {groupHint(group)}
              </span>
            </legend>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
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
                        className="size-4 accent-(--color-brand)"
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
          placeholder="Ej.: con el nombre «Sofía» en el globo"
          className="field resize-none"
        />
      </div>

      <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-full bg-white/90 p-1.5 shadow-lg ring-1 ring-line backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0">
        <QuantityStepper value={quantity} onChange={setQuantity} label="Cantidad" />
        <button type="submit" disabled={Boolean(blocker)} className="btn-primary flex-1">
          {product.sold_out ? 'Agotado' : 'Agregar'}
        </button>
      </div>

      <div id={`${formId}-status`} aria-live="polite" className="min-h-6 text-sm">
        {added ? (
          <p className="flex flex-wrap items-center gap-2 font-medium text-emerald-700">
            <CheckIcon width={18} height={18} /> Agregado al carrito.
            <Link href="/cart" className="text-brand-ink underline underline-offset-2">
              Ver carrito
            </Link>
          </p>
        ) : full ? (
          <p className="text-red-700">Tu carrito ya tiene el máximo de productos distintos.</p>
        ) : blocker && !product.sold_out ? (
          <p className="text-muted">{blocker}</p>
        ) : null}
      </div>
    </form>
  )
}
