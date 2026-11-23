export const SIZES = [
  { id: 'small', slices: 4 },
  { id: 'medium', slices: 8 },
  { id: 'large', slices: 12 },
];
export const PORTIONS = [3, 5, 7];

export const MAX_PORTION = 99;
export function validPortions(portions) {
  return Array.isArray(portions) && portions.length === 3 && portions.every((n, i) =>
    Number.isInteger(n) && n >= 1 && n <= MAX_PORTION && (i === 0 || n > portions[i - 1]));
}

// One size per order; always round up to feed the entire group.
export function calculate(people, sizeId, portions = PORTIONS) {
  const size = SIZES.find(size => size.id === sizeId);
  if (!validPortions(portions) || !size || !Array.isArray(people) || people.length < 1 || people.length > 50 ||
      !people.every(hunger => Number.isInteger(hunger) && hunger >= 0 && hunger < PORTIONS.length)) {
    throw new Error('Invalid order');
  }
  const demand = people.reduce((sum, hunger) => sum + portions[hunger], 0);
  const count = Math.ceil(demand / size.slices);
  const total = count * size.slices;
  return { demand, total, extra: total - demand, count, items: [{ ...size, count }] };
}
