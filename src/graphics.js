export const icon = (name, cls = '') => {
  const paths = {
    leaf: '<path d="M20 3C8 2 3 7 5 14c2 7 13 7 15-11Z"/><path d="M4 21 15 10"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
    grip: '<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    share: '<path d="M12 16V3m-4 4 4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    heart: '<path d="M20 5c-3-3-6-1-8 1C10 4 7 2 4 5s-1 7 8 14c9-7 11-11 8-14Z"/>',
    slice: '<path d="M4 5q8-5 16 0l-8 16L4 5Z"/><path d="M5 8q7-4 14 0"/><circle cx="10" cy="11" r="1"/><circle cx="13" cy="15" r="1"/>'
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.slice}</svg>`;
};
export function face(level) {
  return `<svg viewBox="0 0 56 56" class="face" aria-hidden="true"><circle cx="28" cy="28" r="25" fill="currentColor"/><g fill="none" stroke="#352819" stroke-width="2.4" stroke-linecap="round">${level === 2 ? '<path d="m16 22 4-3 4 3m8 0 4-3 4 3"/>' : '<path d="M20 21v3m16-3v3"/>'}${level === 0 ? '<path d="M23 34h10"/>' : level === 1 ? '<path d="M20 32q8 10 16 0"/>' : '<path d="M19 31h18q-1 13-9 13T19 31Z" fill="#352819"/><path d="M24 39q4-4 8 0" stroke="#ee795f"/>'}</g>${level === 2 ? '<ellipse cx="13" cy="30" rx="4" ry="2" fill="#e76d3e" opacity=".5"/><ellipse cx="43" cy="30" rx="4" ry="2" fill="#e76d3e" opacity=".5"/>' : ''}</svg>`;
}
export function pizza(slices = 8, cls = '') {
  const lines = Array.from({ length: slices }, (_, i) => {
    const a = (i * Math.PI * 2 / slices) - Math.PI / 2;
    return `<path d="M60 60L${60 + Math.cos(a) * 43} ${60 + Math.sin(a) * 43}"/>`;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="pizza-art ${cls}" aria-hidden="true"><circle cx="60" cy="63" r="53" fill="#b36424" opacity=".13"/><circle cx="60" cy="60" r="53" fill="#d79946"/><circle cx="60" cy="60" r="48" fill="#f2bc62"/><circle cx="60" cy="60" r="43" fill="#ed7440"/><circle cx="60" cy="60" r="40" fill="#ffcf63"/><g fill="#d6492d"><circle cx="44" cy="37" r="8"/><circle cx="78" cy="39" r="7"/><circle cx="83" cy="70" r="8"/><circle cx="54" cy="83" r="8"/><circle cx="33" cy="63" r="7"/><circle cx="60" cy="57" r="6"/></g><g fill="#637342"><path d="M60 26q13-4 7 8-7 1-7-8M39 78q-11 2-7-9 8 0 7 9M72 84q9-7 11 4-7 7-11-4M76 56q-10 5-10-6 9-5 10 6"/></g><g stroke="#b7742a" stroke-width="1.4" opacity=".65">${lines}</g><g fill="#fff0af"><circle cx="44" cy="49" r="2.3"/><circle cx="67" cy="75" r="2"/><circle cx="87" cy="52" r="2"/><circle cx="49" cy="68" r="2.3"/></g></svg>`;
}
