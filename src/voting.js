// Preferential voting for repeated flavor portions. This is a pizza-specific
// proportional adaptation, not the statutory Australian Senate counting rule.
export function seededShuffle(values, seed) {
  const out = [...values]; let x = seed >>> 0;
  const random = () => { x += 0x6D2B79F5; let z = x; z = Math.imul(z ^ z >>> 15, z | 1); z ^= z + Math.imul(z ^ z >>> 7, z | 61); return ((z ^ z >>> 14) >>> 0) / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
export function allocateFlavors(ballots, ids, pizzaCount, parts, seed = 1, ballotWeights = ballots.map(() => 1)) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 12 || new Set(ids).size !== ids.length || !ids.every(id => typeof id === 'string') ||
      !Array.isArray(ballots) || ballots.length < 1 || ballots.length > 50 || !Number.isSafeInteger(pizzaCount) || !Number.isSafeInteger(pizzaCount * parts) || pizzaCount < 1 || ![1, 2, 3, 4].includes(parts) ||
      !ballots.every(b => Array.isArray(b) && b.length === ids.length && new Set(b).size === ids.length && b.every(id => ids.includes(id)))) throw Error('Invalid election');
  if (!Array.isArray(ballotWeights) || ballotWeights.length !== ballots.length || !ballotWeights.every(w => Number.isFinite(w) && w > 0) || !Number.isFinite(ballotWeights.reduce((sum, w) => sum + w, 0))) throw Error('Invalid ballot weights');
  const totalWeight = ballotWeights.reduce((sum, w) => sum + w, 0);
  const units = pizzaCount * parts, quota = totalWeight / units, epsilon = totalWeight * 1e-10;
  const quotaTolerance = quota * 1e-10;
  const priority = seededShuffle([...ids].sort(), seed), active = new Set(ids), weights = [...ballotWeights];
  const counts = Object.fromEntries(ids.map(id => [id, 0])), history = [], rounds = [];
  let left = units;
  const tieCompare = (a, b) => {
    for (let i = history.length - 1; i >= 0; i--) {
      const difference = history[i][b] - history[i][a];
      if (Math.abs(difference) > epsilon) return difference;
    }
    return priority.indexOf(a) - priority.indexOf(b);
  };
  while (left > 0) {
    const support = Object.fromEntries([...active].map(id => [id, 0]));
    const choices = ballots.map((ranking, i) => { const id = ranking.find(id => active.has(id)); support[id] += weights[i]; return id; });
    const sorted = [...active].sort((a, b) => Math.abs(support[b] - support[a]) > epsilon ? support[b] - support[a] : tieCompare(a, b));
    const best = sorted[0];
    // A single seat follows instant-runoff majority voting.
    if (units === 1 && (support[best] > totalWeight / 2 || active.size === 1)) {
      counts[best] = 1; rounds.push({ type: 'elect', id: best, units: 1, support: {...support} }); break;
    }
    if (units > 1 && (support[best] + quotaTolerance >= quota || active.size === 1)) {
      const number = active.size === 1 ? left : Math.min(left, Math.floor((support[best] + quotaTolerance) / quota));
      counts[best] += number; left -= number;
      const retain = support[best] > epsilon ? Math.max(0, (support[best] - number * quota) / support[best]) : 0;
      weights.forEach((_, i) => { if (choices[i] === best) weights[i] *= retain; });
      rounds.push({type: 'elect', id: best, units: number, support: {...support}});
    } else {
      const loser = sorted.at(-1);
      active.delete(loser);
      rounds.push({type: 'eliminate', id: loser, support: {...support}});
    }
    history.push(support);
  }
  const allocations = ids.filter(id => counts[id] > 0).map(id => ({id, units: counts[id]})).sort((a, b) => b.units - a.units || priority.indexOf(a.id) - priority.indexOf(b.id));
  return { parts, pizzaCount, ballotWeights: [...ballotWeights], totalWeight, quota: units === 1 ? null : quota, allocations, rounds, tieOrder: priority, pizzas: packPizzas(allocations, parts) };
}
export function packPizzas(allocations, parts) {
  const groups = [], loose = [];
  for (const {id, units} of allocations) {
    const whole = Math.floor(units / parts);
    if (whole) groups.push({count: whole, portions: [{id, units: parts}]});
    loose.push(...Array(units % parts).fill(id));
  }
  for (let i = 0; i < loose.length; i += parts) {
    const counts = new Map();
    loose.slice(i, i + parts).forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
    groups.push({count: 1, portions: [...counts].map(([id, units]) => ({id, units}))});
  }
  // Keep a flavor's whole pizzas next to the mixed pizza containing its remainder.
  const pending = [...groups], ordered = [];
  while (pending.length) {
    let current = pending.shift();
    ordered.push(current);
    while (true) {
      const next = pending.findIndex(g => g.portions.some(p => current.portions.some(q => q.id === p.id)));
      if (next < 0) break;
      current = pending.splice(next, 1)[0];
      ordered.push(current);
    }
  }
  return ordered;
}
export function fraction(units, parts) {
  if (units === parts) return '';
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const d = gcd(units, parts);
  return `${units / d}/${parts / d}`;
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// First reserve whole pizzas by dietary demand, then count preferences inside
// each flavor pool. Votes follow the first choice, independently of identity;
// an otherwise unsupported mandatory veggie pizza uses everyone’s veggie ranking.
export function allocateDietaryFlavors(ballots, flavors, pizzaCount, parts, seed, weights, dietary, slices) {
  const ids = flavors.map(f => f.id);
  const baseline = allocateFlavors(ballots, ids, pizzaCount, parts, seed, weights);
  if (!Array.isArray(dietary) || dietary.length !== ballots.length || !dietary.every(v => typeof v === 'boolean') ||
      !Number.isSafeInteger(slices) || slices < 1 || weights.reduce((sum, w) => sum + w, 0) > pizzaCount * slices) throw Error('Invalid dietary demand');
  const veg = flavors.filter(f => f.veggie).map(f => f.id), other = ids.filter(id => !veg.includes(id));
  if (!veg.length) {
    if (dietary.some(Boolean)) throw Error('Missing veggie flavors');
    return baseline;
  }
  const prefersVeg = ballots.map(ranking => veg.includes(ranking[0]));
  const vegDemand = weights.reduce((sum, w, i) => sum + (dietary[i] || prefersVeg[i] ? w : 0), 0);
  const vegCount = other.length && !prefersVeg.every(Boolean) ? Math.min(pizzaCount, Math.max(1, Math.ceil(vegDemand / slices))) : pizzaCount;
  const allocations = [], rounds = [], pizzas = [], tieOrder = [];
  for (const [pool, count, isVeg] of [[veg, vegCount, true], [other, pizzaCount - vegCount, false]]) {
    if (!count) continue;
    let voters = ballots.map((_, i) => i).filter(i => prefersVeg[i] === isVeg);
    // A rounded-up shared order can consist entirely of veggie pizzas.
    if (count === pizzaCount || !voters.length) voters = ballots.map((_, i) => i);
    const plan = allocateFlavors(voters.map(i => ballots[i].filter(id => pool.includes(id))), pool, count, parts, seed, voters.map(i => weights[i]));
    allocations.push(...plan.allocations); rounds.push(...plan.rounds); pizzas.push(...plan.pizzas); tieOrder.push(...plan.tieOrder);
  }
  return {...baseline, allocations, rounds, pizzas, tieOrder, quota: null, veggiePizzaCount: vegCount,
    dietary: [...dietary], veggieDemand: weights.reduce((sum, w, i) => sum + (dietary[i] ? w : 0), 0)};
}
