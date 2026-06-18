// Public species API. Combines the raw catalogue (speciesData) with art-based
// silhouettes (tactileGrids) and code-generated silhouettes (tactileGen), and
// resolves each creature's sprite aspect ratio. Importers use this module only.
import { FISH_GRIDS, FISH_ASPECT } from './tactileGrids';
import { generateGrid, generateRows, gridAspect } from '../engine/tactileGen';
import type { Species, RawSpecies, Category } from './speciesTypes';
import { RAW_SPECIES, RAW_PLAYER, PLAYER_KEY } from './speciesData';

export type { Lang, Rarity, Behavior, Category, TactileLevel, Species, SpeciesText } from './speciesTypes';
export { text, sizeScale } from './speciesTypes';
export { PLAYER_KEY };

function resolve(raw: RawSpecies): Species {
  // Hero species keep their hand-tuned art aspect; generated species derive it
  // from their own silhouette bounding box so sprite + tactile shapes agree.
  const aspect = FISH_ASPECT[raw.key] ?? gridAspect(generateGrid(raw.shape));
  return { ...raw, aspect };
}

export const SPECIES: Species[] = RAW_SPECIES.map(resolve);
export const PLAYER_SPECIES: Species = resolve(RAW_PLAYER);
export const ALL_SPECIES: Species[] = [...SPECIES, PLAYER_SPECIES];
export const byKey: Record<string, Species> = Object.fromEntries(ALL_SPECIES.map((s) => [s.key, s]));
export const DISCOVERABLE: Species[] = SPECIES;

// 60×40 tactile pattern rows for every species: bespoke art where it exists,
// otherwise generated from the shape descriptor in code.
export const ALL_GRIDS: Record<string, string[]> = Object.fromEntries(
  ALL_SPECIES.map((s) => [s.key, FISH_GRIDS[s.key] ?? generateRows(s.shape)]),
);

/** Display order for category filters. */
export const CATEGORIES: Category[] = [
  'reef', 'pelagic', 'shark', 'ray', 'cephalopod', 'mammal', 'jelly', 'crustacean', 'eel', 'other',
];
