// Fish textures. With Vite assetsInlineLimit set very high, these are inlined as
// base64 data URIs into the single-file bundle (no external requests on GitHub Pages).
import shark from './fish/shark.png';
import whale from './fish/whale.png';
import mantaray from './fish/mantaray.png';
import growthfish from './fish/growthfish.png';
import tropical from './fish/tropical.png';
import basicfish from './fish/basicfish.png';
import fastfish from './fish/fastfish.png';
import schoolfish from './fish/schoolfish.png';
import puffer from './fish/puffer.png';
import jellyfish from './fish/jellyfish.png';

export const FISH_TEX: Record<string, string> = {
  shark, whale, mantaray, growthfish, tropical,
  basicfish, fastfish, schoolfish, puffer, jellyfish,
};
