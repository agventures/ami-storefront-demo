import { markdownBlocks } from '@/lib/format'

/** A product description is Markdown; this shows it as plain text blocks. */
export function Description({ markdown }: { markdown: string }) {
  const blocks = markdownBlocks(markdown ?? '')
  if (!blocks.length) return null
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink/85">
      {blocks.map((block, i) =>
        block.kind === 'list' ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block.text}</p>
        ),
      )}
    </div>
  )
}
