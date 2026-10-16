// Dates for the customer. Money is never formatted here: Ami sends it written.

const dateTime = new Intl.DateTimeFormat('es-VE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Caracas',
})

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateTime.format(date)
}

/** Splits Markdown into plain blocks: paragraphs and bullet lists, no HTML. */
export type TextBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] }

const stripInline = (line: string) =>
  line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/^#{1,6}\s+/, '')
    .trim()

export function markdownBlocks(markdown: string): TextBlock[] {
  const blocks: TextBlock[] = []
  for (const chunk of markdown.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) continue
    if (lines.every((l) => /^([-*+]|\d+[.)])\s+/.test(l))) {
      blocks.push({ kind: 'list', items: lines.map((l) => stripInline(l.replace(/^([-*+]|\d+[.)])\s+/, ''))) })
    } else {
      blocks.push({ kind: 'paragraph', text: lines.map(stripInline).join(' ') })
    }
  }
  return blocks
}
