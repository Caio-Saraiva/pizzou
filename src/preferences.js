import { SIZES, PORTIONS, validPortions } from './calculator.js';
import { languages } from './i18n.js';
export function restorePreferences(saved, theme = 'light') {
  const state = { people: [1, 1, 1, 1], size: 'medium', portions: [...PORTIONS], lang: 'pt-BR', theme };
  if (!saved || typeof saved !== 'object') return state;
  if (Array.isArray(saved.people) && saved.people.length >= 1 && saved.people.length <= 50 && saved.people.every(x => [0, 1, 2].includes(x))) state.people = [...saved.people];
  if (validPortions(saved.portions)) state.portions = [...saved.portions];
  // Migrate the previous multi-size selection to exactly one size.
  const legacySize = Array.isArray(saved.sizes) ? (saved.sizes.includes('medium') ? 'medium' : saved.sizes[0]) : null;
  const size = saved.size ?? legacySize;
  if (SIZES.some(s => s.id === size)) state.size = size;
  if (Object.hasOwn(languages, saved.lang)) state.lang = saved.lang;
  if (['light', 'dark'].includes(saved.theme)) state.theme = saved.theme;
  return state;
}
