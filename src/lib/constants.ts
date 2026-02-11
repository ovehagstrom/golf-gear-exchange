export const CATEGORIES = [
  { value: 'driver', label: 'Driver' },
  { value: 'fairway_wood', label: 'Fairway Wood' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'iron_set', label: 'Järnset' },
  { value: 'wedge', label: 'Wedge' },
  { value: 'putter', label: 'Putter' },
  { value: 'shaft', label: 'Shaft' },
  { value: 'bag', label: 'Bag' },
  { value: 'accessories', label: 'Tillbehör' },
  { value: 'other', label: 'Övrigt' },
] as const;

export const SHAFT_FLEX = [
  { value: 'ladies', label: 'Ladies (L)' },
  { value: 'senior', label: 'Senior (A)' },
  { value: 'regular', label: 'Regular (R)' },
  { value: 'stiff', label: 'Stiff (S)' },
  { value: 'x_stiff', label: 'X-Stiff (X)' },
] as const;

export const CONDITIONS = [
  { value: 1, label: 'Slitet', description: 'Tydliga slitspår, repor eller skador' },
  { value: 2, label: 'Acceptabelt', description: 'Normalt använd, synligt slitage' },
  { value: 3, label: 'Bra', description: 'Lättare användningsspår' },
  { value: 4, label: 'Mycket bra', description: 'Minimalt slitage' },
  { value: 5, label: 'Nyskick', description: 'Som ny eller aldrig använd' },
] as const;

export const LISTING_STATUS = [
  { value: 'active', label: 'Aktiv' },
  { value: 'reserved', label: 'Reserverad' },
  { value: 'sold', label: 'Såld' },
  { value: 'paused', label: 'Pausad' },
] as const;

export const SELLER_TYPES = [
  { value: 'private', label: 'Privat' },
  { value: 'pro_shop', label: 'Pro Shop' },
] as const;

export const POPULAR_BRANDS = [
  'Titleist',
  'TaylorMade',
  'Callaway',
  'Ping',
  'Cobra',
  'Mizuno',
  'Cleveland',
  'Srixon',
  'Wilson',
  'Bridgestone',
  'Scotty Cameron',
  'Odyssey',
  'Fujikura',
  'Aldila',
  'Graphite Design',
  'Project X',
  'Övrigt',
] as const;

export const SWEDISH_CITIES = [
  'Stockholm',
  'Göteborg',
  'Malmö',
  'Uppsala',
  'Linköping',
  'Örebro',
  'Västerås',
  'Helsingborg',
  'Norrköping',
  'Jönköping',
  'Lund',
  'Umeå',
  'Gävle',
  'Borås',
  'Eskilstuna',
  'Södertälje',
  'Karlstad',
  'Halmstad',
  'Växjö',
  'Sundsvall',
] as const;

export type Category = typeof CATEGORIES[number]['value'];
export type ShaftFlex = typeof SHAFT_FLEX[number]['value'];
export type Condition = typeof CONDITIONS[number]['value'];
export type ListingStatus = typeof LISTING_STATUS[number]['value'];
export type SellerType = typeof SELLER_TYPES[number]['value'];