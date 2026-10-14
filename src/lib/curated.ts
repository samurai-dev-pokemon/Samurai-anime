// Hand-picked, well-known, safe-for-work MAL IDs used to seed the home page
// rows before live season/search data is blended in. Keeping this curated
// avoids ecchi/hentai titles ever surfacing on the landing experience.
export const HERO_IDS = [16498, 1535, 40748, 21, 11061, 20958];

export const TRENDING_IDS = [
  44511, 40748, 38524, 21, 16498, 30276, 31964, 1535, 5114, 11061, 20958,
  35760, 36456, 37521, 918, 269,
];

export const ALL_TIME_POPULAR_IDS = [
  20, 1735, 813, 223, 20583, 21, 30276, 6547, 2904, 1575, 4224, 22319, 245,
  20507, 9253, 11757,
];

export const ACTION_IDS = [
  16498, 1535, 5114, 21, 11061, 20958, 40748, 30276, 269, 813, 20583, 918,
];

export const ROMANCE_COMEDY_IDS = [
  37450, 31043, 32182, 37521, 33486, 38000, 35849, 22199, 22535, 33352,
];

export const FANTASY_ISEKAI_IDS = [
  37430, 39535, 40456, 38691, 34572, 40028, 42897, 31240, 37779, 37999,
];

export const CLASSICS_IDS = [
  1, 199, 226, 121, 523, 2001, 2167, 6746, 4181, 2251,
];

export const ALL_CURATED_IDS = Array.from(
  new Set([
    ...HERO_IDS,
    ...TRENDING_IDS,
    ...ALL_TIME_POPULAR_IDS,
    ...ACTION_IDS,
    ...ROMANCE_COMEDY_IDS,
    ...FANTASY_ISEKAI_IDS,
    ...CLASSICS_IDS,
  ]),
);
