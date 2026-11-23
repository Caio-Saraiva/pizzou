import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, SIZES } from '../src/calculator.js';
import { restorePreferences } from '../src/preferences.js';

test('four normal appetites get three regular pizzas or two large pizzas', () => {
  const people = [1, 1, 1, 1];
  assert.equal(calculate(people, 'medium').count, 3);
  assert.equal(calculate(people, 'large').count, 2);
  assert.equal(calculate(people, 'small').count, 5);
});
test('mixed appetites are summed before rounding up', () => {
  const result = calculate([0, 1, 2], 'medium');
  assert.equal(result.demand, 15);
  assert.equal(result.count, 2);
  assert.equal(result.extra, 1);
  assert.deepEqual(result.items, [{ id: 'medium', slices: 8, count: 2 }]);
});
test('every group is covered by the fewest pizzas of exactly the chosen size', () => {
  for (const size of SIZES) {
    for (let count = 1; count <= 50; count++) {
      for (const appetite of [0, 1, 2]) {
        const order = calculate(Array(count).fill(appetite), size.id);
        assert.equal(order.items.length, 1);
        assert.equal(order.items[0].id, size.id);
        assert.equal(order.total, order.items[0].count * size.slices);
        assert.ok(order.total >= order.demand);
        assert.ok(order.total - size.slices < order.demand);
        assert.equal(order.extra, order.total - order.demand);
      }
    }
  }
});
test('invalid groups and multiple sizes are rejected', () => {
  for (const people of [[], Array(51).fill(1), [3], [-1], [1.5], ['1'], null]) {
    assert.throws(() => calculate(people, 'medium'));
  }
  assert.throws(() => calculate([1], ['small', 'medium']));
  assert.throws(() => calculate([1], 'unknown'));
});
test('existing multi-size preferences migrate without losing the group or language', () => {
  const state = restorePreferences({people: [0, 2], sizes: ['large', 'medium'], lang: 'fr', theme: 'dark'});
  assert.deepEqual(state, {people: [0, 2], size: 'medium', portions: [3, 5, 7], lang: 'fr', theme: 'dark'});
  assert.equal(restorePreferences({sizes:['large','small']}).size, 'large');
});
test('new preferences remain single-size and corrupt storage falls back safely', () => {
  assert.equal(restorePreferences({size:'small'}).size, 'small');
  const state = restorePreferences({people:[9],size:'unknown',lang:'__proto__',theme:'bad'});
  assert.deepEqual(state, restorePreferences(null));
  const saved = {people:[1]};
  restorePreferences(saved).people.push(2);
  assert.deepEqual(saved.people,[1]);
});

test('custom appetite references drive demand, rounding and persistence', () => {
  const portions = [2, 4, 9];
  const result = calculate([0, 1, 2], 'medium', portions);
  assert.equal(result.demand, 15);
  assert.equal(result.count, 2);
  const restored = restorePreferences({ portions });
  assert.deepEqual(restored.portions, portions);
  restored.portions[0] = 1;
  assert.deepEqual(portions, [2, 4, 9]);
  assert.equal(calculate(Array(50).fill(2), 'small', [97, 98, 99]).count, 1238);
});
test('appetite references must be positive ascending integers', () => {
  for (const portions of [[0, 5, 7], [3, 3, 7], [3, 7, 5], [3, 5, 5], [3, 5, 100], [1.5, 5, 7], [3, 5], null]) {
    assert.throws(() => calculate([1], 'medium', portions));
    assert.deepEqual(restorePreferences({portions}).portions, [3, 5, 7]);
  }
});
