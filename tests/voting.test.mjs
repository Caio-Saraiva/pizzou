import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allocateFlavors, seededShuffle, fraction, packPizzas} from '../src/voting.js';
const ids=['a','b','c'];
test('IRV transfers an eliminated preference instead of selecting the plurality leader',()=>{
  const ballots=[...Array.from({length:4},()=>['a','b','c']),...Array.from({length:3},()=>['b','c','a']),...Array.from({length:2},()=>['c','b','a'])];
  const result=allocateFlavors(ballots,ids,1,1);
  assert.deepEqual(result.allocations,[{id:'b',units:1}]);
  assert.equal(result.rounds[0].type,'eliminate'); assert.equal(result.rounds[0].id,'c');
});
test('a split group is represented proportionally rather than repeating one winner',()=>{
  const ballots=[['a','b','c'],['a','b','c'],['a','c','b'],['b','a','c']];
  const result=allocateFlavors(ballots,ids,2,2);
  assert.deepEqual(result.allocations,[{id:'a',units:3},{id:'b',units:1}]);
  assert.deepEqual(result.pizzas,[{count:1,portions:[{id:'a',units:2}]},{count:1,portions:[{id:'a',units:1},{id:'b',units:1}]}]);
});
test('all combinations conserve the pizza total with valid whole/half/third/quarter portions',()=>{
  for(let people=1;people<=50;people++) for(const parts of [1,2,3,4]) for(const pizzas of [1,2,7,88]) {
    const ballots=Array.from({length:people},(_,i)=>seededShuffle(ids,i+people));
    const result=allocateFlavors(ballots,ids,pizzas,parts,people);
    assert.equal(result.allocations.reduce((s,x)=>s+x.units,0),pizzas*parts);
    assert.equal(result.pizzas.reduce((s,x)=>s+x.count,0),pizzas);
    assert.ok(result.pizzas.every(x=>x.portions.reduce((s,p)=>s+p.units,0)===parts));
    assert.ok(result.allocations.every(x=>ids.includes(x.id)&&Number.isInteger(x.units)&&x.units>0));
  }
});
test('seeded tie resolution is reproducible and independent of candidate entry order',()=>{
  const ballots=[['a','b','c'],['b','c','a'],['c','a','b']];
  const a=allocateFlavors(ballots,ids,1,1,42);
  const b=allocateFlavors(ballots,[...ids].reverse(),1,1,42);
  // Tie order is sampled from canonical identifiers, independent of display order.
  assert.deepEqual(allocateFlavors(ballots,ids,1,1,42),a);
  assert.deepEqual(b.allocations,a.allocations);
  assert.equal(a.allocations.reduce((s,x)=>s+x.units,0),1);
});
test('rejects incomplete, duplicate or foreign ballots',()=>{
  for(const ballots of [[],[['a','a','c']],[['a','b']],[['a','b','x']]]) assert.throws(()=>allocateFlavors(ballots,ids,1,2));
  assert.throws(()=>allocateFlavors([ids],ids,1,5));
  assert.throws(()=>allocateFlavors([ids],ids,0,1));
  assert.equal(fraction(2,4),'1/2'); assert.equal(fraction(3,4),'3/4'); assert.equal(fraction(4,4),'');
});
test('maximum-sized elections conserve every portion without discarding preferences',()=>{
  const candidates=Array.from({length:12},(_,i)=>`flavor-${i}`);
  const ballots=Array.from({length:50},(_,i)=>seededShuffle(candidates,700+i));
  const plan=allocateFlavors(ballots,candidates,88,4,2718);
  assert.equal(plan.allocations.reduce((s,x)=>s+x.units,0),352);
  assert.equal(plan.pizzas.reduce((s,x)=>s+x.count,0),88);
  assert.ok(plan.rounds.length<400);
});

test('thirds preserve 1/3 and 2/3 in mixed pizzas', () => {
  const plan = allocateFlavors([['a', 'b'], ['a', 'b'], ['b', 'a']], ['a', 'b'], 1, 3);
  assert.deepEqual(plan.pizzas, [{count: 1, portions: [{id: 'a', units: 2}, {id: 'b', units: 1}]}]);
  assert.equal(fraction(1, 3), '1/3');
  assert.equal(fraction(2, 3), '2/3');
});
test('whole and fractional pizzas of the same flavor remain next to each other', () => {
  const allocations = [{id: 'a', units: 3}, {id: 'b', units: 2}, {id: 'c', units: 1}];
  const groups = packPizzas(allocations, 2);
  assert.deepEqual(groups.map(g => g.portions.map(p => p.id)), [['a'], ['a', 'c'], ['b']]);
  for (const allocation of allocations) {
    assert.equal(groups.reduce((sum, g) => sum + g.count * (g.portions.find(p => p.id === allocation.id)?.units || 0), 0), allocation.units);
  }
});
test('highest custom appetite supports flavor voting for the full order', () => {
  const plan = allocateFlavors(Array.from({length:50}, () => ids), ids, 1238, 3);
  assert.equal(plan.pizzas.reduce((sum, g) => sum + g.count, 0), 1238);
});
