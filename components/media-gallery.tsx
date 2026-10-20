'use client'

import { useState } from 'react'
import type { Media } from '@/lib/types'

export function MediaGallery({ media, fallback, name }: { media: Media[]; fallback: string | null; name: string }) {
  const items = media.filter((m) => m.url)
  const [index, setIndex] = useState(0)
  // Only a picture the customer picked fades in; the first one is simply
  // there when the page is.
  const [picked, setPicked] = useState(false)
  const current = items[index]

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-shade">
        {current?.kind === 'video' ? (
          <video
            key={current.id}
            src={current.url ?? undefined}
            poster={current.poster_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="size-full bg-black object-contain"
            aria-label={`Video de ${name}`}
          />
        ) : current?.url || fallback ? (
          <img
            key={current?.id ?? 'fallback'}
            src={current?.url ?? fallback ?? undefined}
            alt={name}
            className={`size-full object-cover ${picked ? 'animate-fade-in' : ''}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted">Sin foto</div>
        )}
      </div>

      {items.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Fotos y videos">
          {items.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIndex(i)
                  setPicked(true)
                }}
                aria-label={`${item.kind === 'video' ? 'Video' : 'Foto'} ${i + 1} de ${items.length}`}
                aria-current={i === index}
                className={`relative block h-20 w-16 overflow-hidden rounded-lg bg-shade ring-1 transition-opacity duration-150 ${i === index ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={item.thumb_url ?? item.poster_url ?? item.url ?? ''} alt="" className="size-full object-cover" />
                {item.kind === 'video' && (
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    ▶
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
