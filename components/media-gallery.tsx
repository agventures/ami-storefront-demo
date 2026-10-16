'use client'

import { useState } from 'react'
import type { Media } from '@/lib/types'
import { BalloonIcon } from './icons'

export function MediaGallery({ media, fallback, name }: { media: Media[]; fallback: string | null; name: string }) {
  const items = media.filter((m) => m.url)
  const [index, setIndex] = useState(0)
  const current = items[index]

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-3xl bg-brand-soft ring-1 ring-line">
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
          <img src={current?.url ?? fallback ?? undefined} alt={name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-brand/40">
            <BalloonIcon width={64} height={64} />
          </div>
        )}
      </div>

      {items.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Fotos y videos">
          {items.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${item.kind === 'video' ? 'Video' : 'Foto'} ${i + 1} de ${items.length}`}
                aria-current={i === index}
                className={`relative block size-16 overflow-hidden rounded-xl ring-2 transition ${i === index ? 'ring-brand' : 'ring-transparent opacity-75 hover:opacity-100'}`}
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
