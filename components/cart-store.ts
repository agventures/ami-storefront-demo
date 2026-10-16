'use client'

import { useSyncExternalStore } from 'react'
import { MAX_LINES, MAX_QUANTITY, sameChoice, toCartLines } from '@/lib/cart'
import type { CartLine } from '@/lib/types'

// The cart lives in this browser's localStorage: the lines the customer chose
// and the discount code they typed. No prices, ever.

const STORAGE_KEY = 'ami-demo-cart-v1'

type CartState = { lines: CartLine[]; code: string }

const EMPTY: CartState = { lines: [], code: '' }

let state: CartState = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function read(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as { lines?: unknown; code?: unknown }
    return {
      lines: toCartLines(parsed.lines),
      code: typeof parsed.code === 'string' ? parsed.code.slice(0, 40) : '',
    }
  } catch {
    return EMPTY
  }
}

function load() {
  if (!loaded && typeof window !== 'undefined') {
    state = read()
    loaded = true
  }
}

function write(next: CartState) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode or a full disk: the cart still works for this tab.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changed the cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    state = read()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot() {
  load()
  return state
}

const getServerSnapshot = () => EMPTY

/** The cart, and whether it has been read from this browser yet. */
export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return { ...cart, hydrated }
}

export const cartActions = {
  add(line: CartLine) {
    load()
    const lines = [...state.lines]
    const same = lines.findIndex((l) => sameChoice(l, line))
    if (same >= 0) {
      lines[same] = { ...lines[same], quantity: Math.min(lines[same].quantity + line.quantity, MAX_QUANTITY) }
    } else if (lines.length < MAX_LINES) {
      lines.push(line)
    } else {
      return false
    }
    write({ ...state, lines })
    return true
  },
  setQuantity(index: number, quantity: number) {
    load()
    const lines = [...state.lines]
    if (!lines[index]) return
    if (quantity < 1) lines.splice(index, 1)
    else lines[index] = { ...lines[index], quantity: Math.min(quantity, MAX_QUANTITY) }
    write({ ...state, lines })
  },
  remove(index: number) {
    load()
    write({ ...state, lines: state.lines.filter((_, i) => i !== index) })
  },
  setCode(code: string) {
    load()
    write({ ...state, code: code.trim().slice(0, 40) })
  },
  clear() {
    write(EMPTY)
  },
}
