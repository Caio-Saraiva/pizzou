import {face} from './graphics.js';

// Shared identity for the private handoff screen and the active ballot.
export function voterIdentity(order, index, l, hero = false) {
  const level = order.people[index];
  const slices = order.portions[level];
  return `<section class="voter-identity ${hero ? 'voter-hero' : 'voter-compact'} hunger-${level}" aria-label="${l.person} ${index + 1}: ${l.hunger[level]}">
    <span class="voter-face" aria-hidden="true">${face(level)}</span>
    <div class="voter-copy"><p class="voter-person">${l.person} ${String(index + 1).padStart(2, '0')} <span>· ${index + 1}/${order.people.length}</span></p>
    <h2>${l.hunger[level]}</h2>
    <p class="voter-weight"><span>${l.flavor.voteWeight}</span><strong>${slices} ${slices === 1 ? l.slice : l.slices}</strong></p></div>
  </section>`;
}
