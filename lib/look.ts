// The site's own words and pictures: the campaign the home page wears. This
// is the one file that is about the shop rather than about Ami — everything
// else on the page (name, products, prices, hours, delivery) comes from the
// API. Replace these with your shop's; the pictures live in public/campaign.

export type Story = {
  /** Small label above the title. */
  eyebrow: string
  title: string
  image: string
  alt: string
  /** The category it opens, by name; the collection when none matches. */
  category: string
}

export const LOOK = {
  hero: {
    eyebrow: 'Temporada seca',
    title: 'Ropa para el calor de la ciudad',
    body: 'Lino, algodón y cuero en cortes que duran más de una temporada.',
    cta: 'Ver la colección',
    image: '/campaign/hero.webp',
    alt: 'Dos personas caminan por un patio de concreto con plantas, vestidas de lino y punto',
  },
  stories: [
    {
      eyebrow: 'Lino',
      title: 'Camisas para la tarde',
      image: '/campaign/lino.webp',
      alt: 'Una persona con guayabera de lino salvia apoyada en una pared encalada',
      category: 'Camisas',
    },
    {
      eyebrow: 'Capas',
      title: 'Para cuando refresca',
      image: '/campaign/noche.webp',
      alt: 'Una persona con gabardina corta grafito en una azotea al anochecer',
      category: 'Chaquetas',
    },
  ] satisfies Story[],
  workshop: {
    eyebrow: 'Taller',
    title: 'Pocas piezas, bien hechas',
    body:
      'Cortamos en tandas pequeñas y cosemos cada prenda en Caracas. Si algo no te queda, lo cambias dentro de 30 días.',
    image: '/campaign/taller.webp',
    alt: 'Lino doblado, una muestra de pana, botones y cinta métrica sobre una mesa de taller',
  },
}
