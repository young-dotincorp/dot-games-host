import type { TactileShape } from '../engine/tactileGen';

export type Lang = 'ko' | 'en';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Behavior = 'drift' | 'small' | 'school' | 'large' | 'lurk';
export type Category =
  | 'reef' | 'pelagic' | 'shark' | 'ray' | 'cephalopod'
  | 'mammal' | 'jelly' | 'crustacean' | 'eel' | 'other';
/** Tactile reading difficulty: 1 easy · 2 medium · 3 hard. */
export type TactileLevel = 1 | 2 | 3;

/** Per-language educational + accessibility copy for one species. */
export interface SpeciesText {
  name: string;
  /** Plain-language order/family (분류). */
  classification: string;
  /** Habitat (서식지). */
  habitat: string;
  /** In-game region where it is found (발견 지역). */
  region: string;
  /** Body shape, short noun phrase (몸통 형태). */
  bodyShape: string;
  /** 3 bullet features (특징). */
  features: string[];
  /** One-sentence ecology note (생태 설명). */
  ecology: string;
  /** How the tactile silhouette feels (촉각 형태 설명). */
  tactile: string;
  /** Tail shape (꼬리 모양). */
  tailShape: string;
  /** Fin position (지느러미 위치). */
  finPos: string;
  /** Prey (먹이). */
  prey: string;
  /** Predator (천적). */
  predator: string;
  /** Rich screen-reader description of the tactile graphic (스크린리더용 설명). */
  sr: string;
}

export interface Species {
  key: string;
  /** Scientific binomial / representative taxon (학명). */
  scientific: string;
  category: Category;
  /** Loose food-chain tier, drives spawn weighting. */
  tier: number;
  sizeCm: number;
  /** 0 harmless · 1 caution · 2 toxic · 3 predator. */
  danger: 0 | 1 | 2 | 3;
  rarity: Rarity;
  tactileLevel: TactileLevel;
  /** Glow tint hue (0–360). */
  hue: number;
  /** Sprite width / height; resolved from art or generated silhouette. */
  aspect: number;
  speed: number;
  behavior: Behavior;
  /** Descriptor used to generate the 60×40 tactile pattern from code. */
  shape: TactileShape;
  ko: SpeciesText;
  en: SpeciesText;
}

/** A species before its sprite aspect ratio is resolved. */
export type RawSpecies = Omit<Species, 'aspect'>;

export function text(s: Species, lang: Lang): SpeciesText {
  return s[lang];
}

/** Map a real-world size in cm to a bounded tactile/sprite scale factor. */
export function sizeScale(sizeCm: number): number {
  const v = 0.6 + Math.log10(sizeCm + 1) * 0.3;
  return Math.max(0.7, Math.min(1.34, v));
}
