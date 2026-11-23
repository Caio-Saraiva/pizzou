export const SIZES = [
  { id: 'small', slices: 4 },
  { id: 'medium', slices: 8 },
  { id: 'large', slices: 12 },
];
export const PORTIONS = [3, 5, 7];

export function validPortions(portions) {
  return Array.isArray(portions) && portions.length === 3 && portions.every((n, i) =>
    Number.isSafeInteger(n) && n >= 1 && (i === 0 || n > portions[i - 1]));
}

// Move neighbors only as far as needed to preserve a strictly increasing scale.
export function adjustPortions(portions, index, value) {
  if (!validPortions(portions) || !Number.isInteger(index) || index < 0 || index > 2 ||
      !Number.isSafeInteger(value) || value < index + 1) return [...portions];
  const next = [...portions];
  next[index] = value;
  for (let i = index - 1; i >= 0; i--) next[i] = Math.min(next[i], next[i + 1] - 1);
  for (let i = index + 1; i < 3; i++) next[i] = Math.max(next[i], next[i - 1] + 1);
  return validPortions(next) ? next : [...portions];
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
