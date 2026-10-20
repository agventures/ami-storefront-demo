import type { SVGProps } from 'react'

// Two flags, drawn small: they sit beside a currency at 20×14, where a star
// is a dot. Inline so the selector costs no image request.

type FlagProps = SVGProps<SVGSVGElement>

const frame = { viewBox: '0 0 20 14', width: 20, height: 14, 'aria-hidden': true } as const

/** United States: thirteen stripes and the canton, its stars as dots. */
export function FlagUS(props: FlagProps) {
  const stripes = Array.from({ length: 13 }, (_, i) => i)
  const stars: [number, number][] = []
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) stars.push([1.2 + col * 1.75 + (row % 2) * 0.85, 1.1 + row * 1.6])
  return (
    <svg {...frame} {...props}>
      {stripes.map((i) => (
        <rect key={i} x="0" y={(i * 14) / 13} width="20" height={14 / 13 + 0.02} fill={i % 2 ? '#fff' : '#b22234'} />
      ))}
      <rect x="0" y="0" width="8.6" height={(7 * 14) / 13} fill="#3c3b6e" />
      {stars.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.38" fill="#fff" />
      ))}
    </svg>
  )
}

/** Venezuela: yellow, blue and red, eight stars in an arc on the blue. */
export function FlagVE(props: FlagProps) {
  const stars = Array.from({ length: 8 }, (_, i) => {
    const angle = Math.PI * (0.93 - (i * 0.86) / 7)
    return [10 + 3.6 * Math.cos(angle), 9.3 - 3.6 * Math.sin(angle)] as const
  })
  return (
    <svg {...frame} {...props}>
      <rect width="20" height="4.67" fill="#ffcc00" />
      <rect y="4.67" width="20" height="4.67" fill="#00247d" />
      <rect y="9.33" width="20" height="4.67" fill="#cf142b" />
      {stars.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#fff" />
      ))}
    </svg>
  )
}
