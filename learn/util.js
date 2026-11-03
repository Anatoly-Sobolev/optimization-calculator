/* Общие помощники учебного слоя: экранирование, запись чисел и формул, устойчивая перестановка. */
const LU = (() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = q => q == null ? '—' : typeof q.toText === 'function' ? q.toText() : String(q);
  const f = q => esc(txt(q));
  const num = q => q && typeof q.toNumber === 'function' ? q.toNumber() : Number(q);
  const sub = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
  const equation = (r, v = 'x') => `${r.a.map((a, j) => `${f(a)}·${v}<sub>${j + 1}</sub>`).join(' + ')} ${esc(r.s)} ${f(r.b)}`;
  const objective = p => `${p.c.map((c, j) => `${f(c)}·x<sub>${j + 1}</sub>`).join(' + ')} → ${esc(p.sense)}`;
  const vec = x => '(' + x.map(txt).join('; ') + ')';
  const digest = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); };
  /* Стабильный порядок без «подсказки» позицией правильного ответа. */
  const order = (items, seed, key = x => x) => items.map(x => [digest(seed + '|' + key(x)), x]).sort((a, b) => a[0].localeCompare(b[0])).map(p => p[1]);
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
  const ru = x => String(round(x)).replace('.', ',').replace('-', '−');
  const plain = html => String(html).replace(/<[^>]*>/g, '');
  /* Клавиши для «кнопочных» SVG-узлов: Enter и Пробел работают как щелчок. */
  const activate = (el, fn) => { el.addEventListener('click', fn); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } }); };
  return { esc, txt, f, num, sub, equation, objective, vec, digest, order, reduced, round, ru, plain, activate };
})();
