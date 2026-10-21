import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPolicy } from '@/lib/ami'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await getPolicy((await params).key)
  return { title: policy?.title ?? 'Política' }
}

// One of the shop's policies, as it wrote it: plain text, a paragraph per
// blank line. The same text Ami quotes to a customer who asks.
export default async function PolicyPage({ params }: Props) {
  const policy = await getPolicy((await params).key)
  if (!policy) notFound()
  const paragraphs = policy.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 pt-10">
      <h1 className="text-3xl font-medium tracking-tight">{policy.title}</h1>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed text-ink/85">
          {paragraph}
        </p>
      ))}
    </article>
  )
}
