import { MAX_PORTION } from './calculator.js';
import { face, icon } from './graphics.js';

export function portionBounds(portions, i) {
  return { min: i === 0 ? 1 : portions[i - 1] + 1, max: i === 2 ? MAX_PORTION : portions[i + 1] - 1 };
}

export function baselineEditor(portions, l) {
  return `<section class="panel baseline-panel" aria-labelledby="baseline-heading"><div class="section-heading"><h2 id="baseline-heading">${l.baseline.label}</h2></div><p class="section-hint">${l.baseline.hint}</p><div class="baseline-list">${portions.map((n, i) => {
    const {min, max} = portionBounds(portions, i);
    return `<div class="baseline-row hunger-${i}"><span class="baseline-face" aria-hidden="true">${face(i)}</span><div class="baseline-copy"><strong id="baseline-${i}">${l.hunger[i]}</strong><span>${l.baseline.unit}</span></div><div class="baseline-control" role="group" aria-labelledby="baseline-${i}"><button class="step-button" data-action="baseline" data-index="${i}" data-value="-1" aria-label="${l.baseline.less}: ${l.hunger[i]}" ${n <= min ? 'disabled' : ''}>${icon('minus')}</button><output aria-live="polite" aria-label="${l.hunger[i]}">${n}</output><button class="step-button" data-action="baseline" data-index="${i}" data-value="1" aria-label="${l.baseline.more}: ${l.hunger[i]}" ${n >= max ? 'disabled' : ''}>${icon('plus')}</button></div></div>`;
  }).join('')}</div><p class="baseline-rule">${l.baseline.rule}</p></section>`;
}
