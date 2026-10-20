import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-medium tracking-tight">No encontramos esta página</h1>
      <p className="text-muted">Puede que el producto ya no esté publicado.</p>
      <Link href="/" className="btn-primary">
        Volver a la tienda
      </Link>
    </div>
  )
}
