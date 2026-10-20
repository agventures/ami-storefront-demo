'use client'

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-medium tracking-tight">Algo salió mal</h1>
      <p className="text-muted">No pudimos cargar esta parte de la tienda. Intenta de nuevo en un momento.</p>
      <button type="button" onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </div>
  )
}
