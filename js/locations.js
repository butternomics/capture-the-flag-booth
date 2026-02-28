/* ========================================
   Location Configurations
   16 neighborhoods × country pairings
   ======================================== */

export const LOCATIONS = {
  'jackson-street-bridge': {
    name: 'Jackson Street Bridge',
    country: 'Spain',
    flag: '\u{1F1EA}\u{1F1F8}',
    tier: 1,
    tagline: 'Where the skyline meets the world',
  },
  'ponce-city-market': {
    name: 'Ponce City Market',
    country: 'Morocco',
    flag: '\u{1F1F2}\u{1F1E6}',
    tier: 1,
    tagline: 'Market vibes, global flavor',
  },
  'krog-street-market': {
    name: 'Krog Street Market',
    country: 'South Africa',
    flag: '\u{1F1FF}\u{1F1E6}',
    tier: 1,
    tagline: 'Culture on every corner',
  },
  'pittsburgh-yards': {
    name: 'Pittsburgh Yards',
    country: 'Cabo Verde',
    flag: '\u{1F1E8}\u{1F1FB}',
    tier: 1,
    tagline: 'Building tomorrow today',
  },
  'piedmont-park': {
    name: 'Piedmont Park',
    country: 'Saudi Arabia',
    flag: '\u{1F1F8}\u{1F1E6}',
    tier: 1,
    tagline: 'Atlanta\'s green heart',
  },
  'buckhead-village': {
    name: 'Buckhead Village',
    country: 'Haiti',
    flag: '\u{1F1ED}\u{1F1F9}',
    tier: 1,
    tagline: 'Luxury meets legacy',
  },
  'west-end': {
    name: 'West End',
    country: 'Uzbekistan',
    flag: '\u{1F1FA}\u{1F1FF}',
    tier: 1,
    tagline: 'The heartbeat of the Westside',
  },
  'little-five-points': {
    name: 'Little Five Points',
    country: 'Rotating',
    flag: '\u{1F30D}',
    tier: 2,
    tagline: 'Atlanta\'s creative soul',
  },
  'east-atlanta-village': {
    name: 'East Atlanta Village',
    country: 'Rotating',
    flag: '\u{1F30D}',
    tier: 2,
    tagline: 'Village vibes, world stage',
  },
  'sweet-auburn': {
    name: 'Sweet Auburn',
    country: 'Heritage',
    flag: '\u{1F3DB}\u{FE0F}',
    tier: 2,
    tagline: 'Where history walks',
  },
  'auc-clark-atlanta': {
    name: 'AUC / Clark Atlanta',
    country: 'Heritage',
    flag: '\u{1F3DB}\u{FE0F}',
    tier: 2,
    tagline: 'Legacy of excellence',
  },
  'castleberry-hill': {
    name: 'Castleberry Hill',
    country: 'TBD',
    flag: '\u{1F3A8}',
    tier: 2,
    tagline: 'Art district energy',
  },
  'centennial-olympic-park': {
    name: 'Centennial Olympic Park',
    country: 'Fan Festival',
    flag: '\u{26BD}',
    tier: 3,
    tagline: 'The world plays here',
  },
  'pemberton-place': {
    name: 'Pemberton Place',
    country: 'Fan Festival',
    flag: '\u{26BD}',
    tier: 3,
    tagline: 'Where Atlanta welcomes the world',
  },
  'hartsfield-jackson-airport': {
    name: 'Hartsfield-Jackson Airport',
    country: 'Arrivals',
    flag: '\u{2708}\u{FE0F}',
    tier: 3,
    tagline: 'Welcome to Atlanta',
  },
  'oca-mural-network': {
    name: 'OCA Mural Network',
    country: 'Bonus',
    flag: '\u{2B50}',
    tier: 3,
    tagline: 'Art without walls',
  },
};

/** Get location config by slug, returns null if invalid */
export function getLocation(slug) {
  return LOCATIONS[slug] || null;
}

/** Get location slug from URL params */
export function getLocationFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('loc') || null;
}

/** Total number of locations */
export const TOTAL_LOCATIONS = Object.keys(LOCATIONS).length;
