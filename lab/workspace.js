/* =====================================================================
   6. ИНТЕРФЕЙС
   ===================================================================== */
const APP = (() => {
  const $ = s => document.querySelector(s);
  const state = { src: 'rgr', type: 'graph', base: 'graph', mode: 'db', v: 2, custom: {}, trainer: false };
  // разделы, которые раскрывают ответ: в режиме тренажёра размыты, открываются щелчком
  const SPOIL = ['sum', 'res', 'all', 'verts', 'opt', 'check', 'end1', 'cs', 'sys', 'dplot', 'solve'];
  const TYPES = ['graph', 'simplex', 'artificial', 'dual', 'dsx', 'ilp', 'transp', 'netw', 'game'];
  const isZ = () => state.src === 'zyk';
  const typesFor = () => isZ() ? ['canon', 'graph', 'artificial', 'simplex', 'dsimplex', 'dual', 'duality', 'optcheck', 'gomory', 'transp'] : TYPES;
  const SRC = () => isZ() ? DB_ZYK : DB;
  const structOf = () => isZ() ? DB_ZYK.types[state.type] : DB.types[state.type === 'dual' ? state.base : state.type];
  const ckey = () => isZ() ? 'z-' + state.type : state.type === 'dual' ? state.base : state.type;
  const sub = k => String(k).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
  const noTr = () => NEWKINDS.has(state.type) || (isZ() && state.type === 'dsimplex');

  /* Запись базы → задача с точными дробями. */
  const toProblem = (t, v) => ({ n: t.n, sense: t.sense, c: v.c.map(Q.of), rows: v.rows.map(r => ({ a: r.a.map(Q.of), s: r.s, b: Q.of(r.b) })) });
  /* Запись сборника ПЗ: своя размерность, направление, свободный член и (в 2.6) условия на переменные. */
  const toProblemZ = v => {
    const pr = { n: v.n, sense: v.sense, c: v.c.map(Q.of), rows: v.rows.map(r => ({ a: r.a.map(Q.of), s: r.s, b: Q.of(r.b) })) };
    if (v.c0) pr.c0 = Q.of(v.c0);
    if (v.bounds) pr.bounds = v.bounds.map(B => ({ j: B.j, s: B.s, b: Q.of(B.b) }));
    return pr;
  };

  /* ---------- форма собственных коэффициентов ---------- */
  function formHTML() {
    const t = structOf(), key = state.type === 'dual' ? state.base : state.type;
    const cur = state.custom[key] || t.variants.find(v => v.v === state.v) || t.variants[0];
    const val = x => String(x).replace('-', '−').replace('.', ',');
    let h = `<div class="form" id="cform"><div class="kbd">Структура как в задании ${t.id}: ${t.n} переменные, ${t.m} ограничения, ${t.sense}${t.fixedSigns ? `, все ограничения «${t.signs[0] === '<=' ? '≤' : '≥'}»` : ', знаки «≤» или «≥»'}, x ≥ 0. Можно вводить целые, десятичные (через запятую или точку) и дроби вида 3/7.</div>`;
    h += `<div class="frow"><span class="flab"><i>f</i> =</span>${[...Array(t.n)].map((_, j) => `<input class="num" data-r="c" data-j="${j}" value="${val(cur.c[j])}" aria-label="c${j + 1}"><span class="xl"><i>x</i>${sub(j + 1)}${j < t.n - 1 ? ' +' : ''}</span>`).join('')}<span class="flab">→ ${t.sense}</span></div>`;
    cur.rows.forEach((r, i) => {
      h += `<div class="frow"><span class="flab">(${i + 1})</span>${[...Array(t.n)].map((_, j) => `<input class="num" data-r="${i}" data-j="${j}" value="${val(r.a[j])}" aria-label="a${i + 1}${j + 1}"><span class="xl"><i>x</i>${sub(j + 1)}${j < t.n - 1 ? ' +' : ''}</span>`).join('')}`;
      h += t.fixedSigns ? `<span class="flab">${t.signs[0] === '<=' ? '≤' : '≥'}</span>` : `<select data-r="${i}" data-s="1"><option value="<="${r.s === '<=' ? ' selected' : ''}>≤</option><option value=">="${r.s === '>=' ? ' selected' : ''}>≥</option></select>`;
      h += `<input class="num" data-r="${i}" data-b="1" value="${val(r.b)}" aria-label="b${i + 1}"></div>`;
    });
    h += `<div class="btnrow"><button class="btn primary" id="fsolve">Решить</button><select id="ffill">${t.variants.map(v => `<option value="${v.v}"${v.v === state.v ? ' selected' : ''}>коэффициенты варианта ${v.v}</option>`).join('')}</select><button class="btn" id="fload">Подставить</button><button class="btn" id="fclear">Очистить</button></div><div id="ferr"></div></div>`;
    return h;
  }
  function readForm() {
    const t = structOf(), errs = [], root = $('#cform');
    root.querySelectorAll('.err').forEach(e => e.classList.remove('err'));
    const get = (el, what) => {
      const s = el.value.trim();
      if (!s) { el.classList.add('err'); errs.push(`${what}: поле не заполнено`); return null; }
      try {
        const q = Q.parse(s);
        if (q.n.toString().replace('-', '').length > 12 || q.d.toString().length > 12) { el.classList.add('err'); errs.push(`${what}: слишком длинное число (до 12 цифр в числителе и знаменателе)`); return null; }
        return q;
      } catch (e) { el.classList.add('err'); errs.push(`${what}: «${s}» — ${e.message}`); return null; }
    };
    const c = [...Array(t.n)].map((_, j) => get(root.querySelector(`[data-r="c"][data-j="${j}"]`), `Целевая функция, коэффициент при x${sub(j + 1)}`));
    const rows = [...Array(t.m)].map((_, i) => ({
      a: [...Array(t.n)].map((_, j) => get(root.querySelector(`[data-r="${i}"][data-j="${j}"]`), `Ограничение (${i + 1}), коэффициент при x${sub(j + 1)}`)),
      s: t.fixedSigns ? t.signs[0] : root.querySelector(`select[data-r="${i}"]`).value,
      b: get(root.querySelector(`[data-r="${i}"][data-b]`), `Ограничение (${i + 1}), правая часть`)
    }));
    if (!errs.length) {
      if (c.every(v => v.isZero())) errs.push('Все коэффициенты целевой функции равны нулю — задача не имеет смысла (f ≡ 0).');
      rows.forEach((r, i) => { if (r.a.every(v => v.isZero())) errs.push(`Ограничение (${i + 1}): все коэффициенты при x равны нулю — это не ограничение на x.`); });
      const key = state.type === 'dual' ? state.base : state.type;
      if (key === 'simplex') rows.forEach((r, i) => { if (r.b.s < 0) errs.push(`Ограничение (${i + 1}): правая часть ${r.b.toText()} &lt; 0. В задании 2 стартовая таблица строится из остатков и должна быть допустимой (все b ≥ 0); задачу с отрицательной правой частью решают методом искусственного базиса (задание 3).`); });
    }
    $('#ferr').innerHTML = errs.length ? `<div class="note bad"><b>Проверьте ввод:</b><ul>${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>` : '';
    if (errs.length) return null;
    return { n: t.n, sense: t.sense, c, rows };
  }
  /* ---------- форма для задач сборника ПЗ: любая размерность, «≤ / ≥ / =», свободный член, знаки переменных (2.6) ---------- */
  const qt = q => q.toText();
  function rawFromVariantZ(v) {
    const dual = state.type === 'dual', P = ALGZ.normalize(toProblemZ(v));
    const rows = (dual ? P.rows : toProblemZ(v).rows).map(r => ({ a: r.a.map(qt), s: r.s, b: qt(r.b) }));
    return { n: v.n, sense: v.sense, c0: v.c0 ? String(v.c0) : '0', c: v.c.map(String), rows, signs: dual ? P.signs.slice() : null };
  }
  function rawFromDom() {
    const root = $('#cform'), cur = state.custom[ckey()];
    const val = sel => { const e = root.querySelector(sel); return e ? e.value : '0'; };
    return { n: cur.n, sense: val('#zs'), c0: val('[data-r="c0"]'), c: cur.c.map((_, j) => val(`[data-r="c"][data-j="${j}"]`)),
      rows: cur.rows.map((r, i) => ({ a: r.a.map((_, j) => val(`[data-r="${i}"][data-j="${j}"]`)), s: val(`select[data-r="${i}"][data-s]`), b: val(`[data-r="${i}"][data-b]`) })),
      signs: cur.signs ? cur.signs.map((_, j) => val(`select[data-sg="${j}"]`)) : null };
  }
  function formZ() {
    const t = structOf(), key = ckey(), dual = state.type === 'dual';
    if (!state.custom[key]) state.custom[key] = rawFromVariantZ(t.variants.find(v => v.v === state.v) || t.variants[0]);
    const cur = state.custom[key], n = cur.n, m = cur.rows.length;
    const val = x => String(x).replace('-', '−').replace('.', ',');
    const opt = (a, b, sel) => [...Array(b - a + 1)].map((_, i) => `<option${a + i === sel ? ' selected' : ''}>${a + i}</option>`).join('');
    let h = `<div class="form" id="cform"><div class="kbd">Структура задачи задаётся свободно: число переменных и ограничений, max или min, знак каждого ограничения «≤», «≥» или «=»${dual ? ', условие на знак каждой переменной (другие границы, например x ≥ 10, вводятся как обычные ограничения)' : ', все x ≥ 0'}. Числа — целые, десятичные или дроби вида 3/7.${state.type === 'dsimplex' ? ' Метод — двойственный симплекс: подойдут любые знаки ограничений; если стартовая таблица не двойственно допустима, решение покажет искусственное ограничение M.' : ''}</div>`;
    h += `<div class="frow"><label>Переменных <select id="zn">${opt(1, 8, n)}</select></label> <label>Ограничений <select id="zm">${opt(1, 10, m)}</select></label> <label>Цель <select id="zs"><option value="max"${cur.sense === 'max' ? ' selected' : ''}>max</option><option value="min"${cur.sense === 'min' ? ' selected' : ''}>min</option></select></label></div>`;
    h += `<div class="frow"><span class="flab"><i>L</i> =</span><input class="num" data-r="c0" value="${val(cur.c0)}" aria-label="свободный член"><span class="xl">+</span>${cur.c.map((c, j) => `<input class="num" data-r="c" data-j="${j}" value="${val(c)}" aria-label="c${j + 1}"><span class="xl"><i>x</i>${sub(j + 1)}${j < n - 1 ? ' +' : ''}</span>`).join('')}</div>`;
    cur.rows.forEach((r, i) => {
      h += `<div class="frow"><span class="flab">(${i + 1})</span>${r.a.map((a, j) => `<input class="num" data-r="${i}" data-j="${j}" value="${val(a)}" aria-label="a${i + 1}${j + 1}"><span class="xl"><i>x</i>${sub(j + 1)}${j < n - 1 ? ' +' : ''}</span>`).join('')}`;
      h += `<select data-r="${i}" data-s="1">${['<=', '>=', '='].map(s => `<option value="${s}"${r.s === s ? ' selected' : ''}>${s === '<=' ? '≤' : s === '>=' ? '≥' : '='}</option>`).join('')}</select><input class="num" data-r="${i}" data-b="1" value="${val(r.b)}" aria-label="b${i + 1}"></div>`;
    });
    if (dual) h += `<div class="frow"><span class="flab">знаки:</span>${cur.signs.map((s, j) => `<label class="xl"><i>x</i>${sub(j + 1)} <select data-sg="${j}">${[['>=', '≥ 0'], ['<=', '≤ 0'], ['free', 'любого знака']].map(o => `<option value="${o[0]}"${s === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>`).join(' ')}</div>`;
    h += `<div class="btnrow"><button class="btn primary" id="fsolve">Решить</button><select id="ffill">${t.variants.map(v => `<option value="${v.v}"${v.v === state.v ? ' selected' : ''}>условие задачи ${v.v}</option>`).join('')}</select><button class="btn" id="fload">Подставить</button><button class="btn" id="fclear">Очистить</button></div><div id="ferr"></div></div>`;
    return h;
  }
  function resizeZ() {
    const cur = rawFromDom(), n = +$('#zn').value, m = +$('#zm').value, pad = (a, k) => [...a.slice(0, k), ...Array(Math.max(0, k - a.length)).fill('0')];
    cur.n = n; cur.c = pad(cur.c, n);
    cur.rows = [...cur.rows.slice(0, m), ...[...Array(Math.max(0, m - cur.rows.length))].map(() => ({ a: [], s: '<=', b: '0' }))].map(r => ({ ...r, a: pad(r.a, n) }));
    if (cur.signs) cur.signs = [...cur.signs.slice(0, n), ...Array(Math.max(0, n - cur.signs.length)).fill('>=')];
    state.custom[ckey()] = cur; state.lastCustom = null; render();
  }
  function readFormZ() {
    const errs = [], root = $('#cform');
    root.querySelectorAll('.err').forEach(e => e.classList.remove('err'));
    const raw = rawFromDom(); state.custom[ckey()] = raw;
    const get = (el, what) => {
      const s = el.value.trim();
      if (!s) { el.classList.add('err'); errs.push(`${what}: поле не заполнено`); return null; }
      try {
        const q = Q.parse(s);
        if (q.n.toString().replace('-', '').length > 12 || q.d.toString().length > 12) { el.classList.add('err'); errs.push(`${what}: слишком длинное число (до 12 цифр в числителе и знаменателе)`); return null; }
        return q;
      } catch (e) { el.classList.add('err'); errs.push(`${what}: «${s}» — ${e.message}`); return null; }
    };
    const n = raw.n;
    const c0 = get(root.querySelector('[data-r="c0"]'), 'Свободный член цели');
    const c = [...Array(n)].map((_, j) => get(root.querySelector(`[data-r="c"][data-j="${j}"]`), `Цель, коэффициент при x${sub(j + 1)}`));
    const rows = raw.rows.map((r, i) => ({
      a: [...Array(n)].map((_, j) => get(root.querySelector(`[data-r="${i}"][data-j="${j}"]`), `Ограничение (${i + 1}), коэффициент при x${sub(j + 1)}`)),
      s: r.s, b: get(root.querySelector(`[data-r="${i}"][data-b]`), `Ограничение (${i + 1}), правая часть`)
    }));
    if (!errs.length) {
      if (c.every(v => v.isZero())) errs.push('Все коэффициенты цели при переменных равны нулю — задача не имеет смысла.');
      rows.forEach((r, i) => { if (r.a.every(v => v.isZero())) errs.push(`Ограничение (${i + 1}): все коэффициенты при x равны нулю — это не ограничение на x.`); });
      if (state.type === 'graph' && n < 2) errs.push('Для графического метода нужны хотя бы две переменные.');
    }
    $('#ferr').innerHTML = errs.length ? `<div class="note bad"><b>Проверьте ввод:</b><ul>${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>` : '';
    if (errs.length) return null;
    const pr = { n, sense: raw.sense, c, rows };
    if (!c0.isZero()) pr.c0 = c0;
    if (raw.signs) pr.bounds = raw.signs.map((s, j) => s === 'free' ? null : { j, s, b: Q.of(0) }).filter(Boolean);
    return pr;
  }
  const fromProblem = pr => ({ c: pr.c.map(q => q.toText()), rows: pr.rows.map(r => ({ a: r.a.map(q => q.toText()), s: r.s, b: r.b.toText() })) });

  /* ---------- главная отрисовка ---------- */
  /* ---------- Новые темы: варианты, формы собственных данных, решение ---------- */
  const NEWKINDS = new Set(['dsx', 'ilp', 'transp', 'netw', 'game', 'canon', 'duality', 'optcheck', 'gomory']);
  const NEWFORM = new Set(['transp', 'netw', 'game', 'canon']);            // собственные формы (остальные используют форму сборника ПЗ)
  const useZForm = () => isZ() || state.type === 'dsx' || state.type === 'ilp';
  const vlabel = v => v.label || `${isZ() ? 'задача' : 'вариант'} ${v.v}`;
  /* Длинные списки вариантов разбиваются на группы: по страницам источника, по блокам или по десяткам. */
  function variantOptions(vs) {
    const grp = new Map();
    vs.forEach((v, k) => { const g = v.group || (vs.length > 12 ? `${Math.floor(k / 10) * 10 + 1}–${Math.min(vs.length, Math.floor(k / 10) * 10 + 10)}` : ''); if (!grp.has(g)) grp.set(g, []); grp.get(g).push(v); });
    const opt = v => `<option value="${v.v}"${v.v === state.v ? ' selected' : ''}>${vlabel(v)}${v.page ? ` (с. ${v.page})` : ''}${v.warn ? ' ⚠' : ''}</option>`;
    return [...grp.entries()].map(([g, list]) => g && grp.size > 1 ? `<optgroup label="${g}">${list.map(opt).join('')}</optgroup>` : list.map(opt).join('')).join('');
  }
  const numSel = (id, a, b, sel) => `<select id="${id}">${[...Array(b - a + 1)].map((_, i) => `<option${a + i === sel ? ' selected' : ''}>${a + i}</option>`).join('')}</select>`;
  const vstr = x => String(x).replace('-', '−').replace('.', ',');

  function rawFromVariantNew(kind, v) {
    if (kind === 'transp') return { m: v.a.length, n: v.b.length, a: v.a.map(String), b: v.b.map(String), c: v.c.map(r => r.map(String)) };
    if (kind === 'game') return { m: v.C.length, n: v.C[0].length, C: v.C.map(r => r.map(String)) };
    if (kind === 'netw') return { text: v.arcs.map(a => a.join(', ')).join('\n') };
    const lo = [...Array(v.n)].map(() => ''), hi = [...Array(v.n)].map(() => '');
    (v.bounds || []).forEach(B => { const s = String(B.b); if (B.s === '>=') { if (lo[B.j] === '' || Q.parse(s).gt(Q.parse(lo[B.j]))) lo[B.j] = s; } else if (hi[B.j] === '' || Q.parse(s).lt(Q.parse(hi[B.j]))) hi[B.j] = s; });
    return { n: v.n, sense: v.sense, c0: v.c0 !== undefined ? String(v.c0) : '0', c: v.c.map(String), rows: v.rows.map(r => ({ a: r.a.map(String), s: r.s, b: String(r.b) })), lo, hi };
  }
  function formNew() {
    const t = structOf(), kind = state.type, key = ckey();
    if (!state.custom[key]) state.custom[key] = rawFromVariantNew(kind, t.variants.find(v => v.v === state.v) || t.variants[0]);
    const cur = state.custom[key];
    const inp = (k, i, j, val, w) => `<input class="num" data-k="${k}" data-i="${i}" data-j="${j}" value="${vstr(val)}" aria-label="${k}${i + 1}${j + 1}"${w ? ` style="width:${w}px"` : ''}>`;
    const fill = `<div class="btnrow"><button class="btn primary" id="fsolve">Решить</button><select id="ffill">${t.variants.map(v => `<option value="${v.v}"${v.v === state.v ? ' selected' : ''}>${v.label ? v.label : 'условие ' + v.v}</option>`).join('')}</select><button class="btn" id="fload">Подставить</button><button class="btn" id="fclear">Очистить</button></div><div id="ferr"></div>`;
    const sizeSel = (id, n, a, b) => `<select id="${id}">${[...Array(b - a + 1)].map((_, i) => `<option${a + i === n ? ' selected' : ''}>${a + i}</option>`).join('')}</select>`;
    let h = '';
    if (kind === 'transp') {
      h = `<div class="form" id="cform"><div class="kbd">Транспортная задача: Σⱼ xᵢⱼ ≤ aᵢ, Σᵢ xᵢⱼ ≥ bⱼ. Введите тарифы cᵢⱼ (любые числа), запасы a и спрос b (неотрицательные). Если запасов больше спроса, добавляется фиктивный потребитель; если меньше — задача несовместна, об этом сообщается.</div><div class="frow"><label>Поставщиков ${sizeSel('kn_m', cur.m, 2, 8)}</label> <label>Потребителей ${sizeSel('kn_n', cur.n, 2, 8)}</label></div>`;
      for (let i = 0; i < cur.m; i++) h += `<div class="frow"><span class="flab">A${sub(i + 1)}</span>${cur.c[i].map((c, j) => inp('c', i, j, c, 52)).join('')}<span class="flab">≤</span>${inp('a', i, 0, cur.a[i], 56)}</div>`;
      h += `<div class="frow"><span class="flab">b</span>${cur.b.map((b, j) => inp('b', 0, j, b, 52)).join('')}</div>${fill}</div>`;
    } else if (kind === 'game') {
      h = `<div class="form" id="cform"><div class="kbd">Матричная игра: cᵢⱼ — выигрыш первого игрока (первый выбирает строку, второй — столбец). Числа — целые, десятичные или дроби.</div><div class="frow"><label>Стратегий игрока 1 (строк) ${sizeSel('kn_m', cur.m, 2, 8)}</label> <label>Стратегий игрока 2 (столбцов) ${sizeSel('kn_n', cur.n, 2, 8)}</label></div>`;
      for (let i = 0; i < cur.m; i++) h += `<div class="frow"><span class="flab">A${sub(i + 1)}</span>${cur.C[i].map((c, j) => inp('C', i, j, c, 56)).join('')}</div>`;
      h += fill + '</div>';
    } else if (kind === 'netw') {
      h = `<div class="form" id="cform"><div class="kbd">Работы списком, по одной в строке: «начало, конец, длительность» (например, 3, 6, 10). Номера событий — натуральные числа, длительность ≥ 0, в графе не должно быть циклов.</div><textarea id="narcs" class="num" rows="10" style="width:100%;max-width:340px;font-family:monospace">${cur.text}</textarea>${fill}</div>`;
    } else {
      const n = cur.n, m = cur.rows.length;
      h = `<div class="form" id="cform"><div class="kbd">Задача ЛП общего вида: любое число переменных и ограничений, знаки «≤», «≥», «=», для каждой переменной — нижняя и/или верхняя граница (пусто — границы нет; без обеих границ переменная свободная). Числа — целые, десятичные или дроби.</div><div class="frow"><label>Переменных ${sizeSel('kn_n', n, 1, 8)}</label> <label>Ограничений ${sizeSel('kn_m', m, 1, 8)}</label> <label>Цель <select id="kn_s"><option value="max"${cur.sense === 'max' ? ' selected' : ''}>max</option><option value="min"${cur.sense === 'min' ? ' selected' : ''}>min</option></select></label></div>`;
      h += `<div class="frow"><span class="flab"><i>L</i> =</span><input class="num" data-k="c0" value="${vstr(cur.c0)}" aria-label="свободный член"><span class="xl">+</span>${cur.c.map((c, j) => inp('c', 0, j, c) + `<span class="xl"><i>x</i>${sub(j + 1)}${j < n - 1 ? ' +' : ''}</span>`).join('')}</div>`;
      cur.rows.forEach((r, i) => { h += `<div class="frow"><span class="flab">(${i + 1})</span>${r.a.map((a, j) => inp('a', i, j, a) + `<span class="xl"><i>x</i>${sub(j + 1)}${j < n - 1 ? ' +' : ''}</span>`).join('')}<select data-k="s" data-i="${i}">${['<=', '>=', '='].map(s => `<option value="${s}"${r.s === s ? ' selected' : ''}>${s === '<=' ? '≤' : s === '>=' ? '≥' : '='}</option>`).join('')}</select>${inp('rb', i, 0, r.b)}</div>`; });
      h += `<div class="frow"><span class="flab">границы:</span>${[...Array(n).keys()].map(j => `<span class="xl">${inp('lo', 0, j, cur.lo[j], 48)} ≤ <i>x</i>${sub(j + 1)} ≤ ${inp('hi', 0, j, cur.hi[j], 48)}</span>`).join(' ')}</div>${fill}</div>`;
    }
    return h;
  }
  function rawFromDomNew() {
    const kind = state.type, root = $('#cform'), cur = state.custom[ckey()], g = (k, i, j) => { const e = root.querySelector(`[data-k="${k}"][data-i="${i}"][data-j="${j}"]`); return e ? e.value : ''; };
    const rg = n => [...Array(n).keys()];
    if (kind === 'transp') return { m: cur.m, n: cur.n, a: rg(cur.m).map(i => g('a', i, 0)), b: rg(cur.n).map(j => g('b', 0, j)), c: rg(cur.m).map(i => rg(cur.n).map(j => g('c', i, j))) };
    if (kind === 'game') return { m: cur.m, n: cur.n, C: rg(cur.m).map(i => rg(cur.n).map(j => g('C', i, j))) };
    if (kind === 'netw') return { text: $('#narcs').value };
    const n = cur.n, m = cur.rows.length;
    return { n, sense: $('#kn_s').value, c0: (root.querySelector('[data-k="c0"]') || {}).value || '0', c: rg(n).map(j => g('c', 0, j)),
      rows: rg(m).map(i => ({ a: rg(n).map(j => g('a', i, j)), s: root.querySelector(`select[data-k="s"][data-i="${i}"]`).value, b: g('rb', i, 0) })), lo: rg(n).map(j => g('lo', 0, j)), hi: rg(n).map(j => g('hi', 0, j)) };
  }
  function resizeNew() {
    const kind = state.type, cur = rawFromDomNew(), pad = (a, k, f) => [...a.slice(0, k), ...Array(Math.max(0, k - a.length)).fill(f)];
    if (kind === 'transp' || kind === 'game') {
      const m = +$('#kn_m').value, n = +$('#kn_n').value; cur.m = m; cur.n = n;
      if (kind === 'transp') { cur.a = pad(cur.a, m, '0'); cur.b = pad(cur.b, n, '0'); cur.c = pad(cur.c, m, null).map(r => pad(r || [], n, '0')); }
      else cur.C = pad(cur.C, m, null).map(r => pad(r || [], n, '0'));
    } else if (kind === 'canon') {
      const n = +$('#kn_n').value, m = +$('#kn_m').value;
      cur.n = n; cur.c = pad(cur.c, n, '0'); cur.lo = pad(cur.lo, n, ''); cur.hi = pad(cur.hi, n, '');
      cur.rows = pad(cur.rows, m, null).map(r => r || { a: [], s: '<=', b: '0' }).map(r => ({ ...r, a: pad(r.a, n, '0') }));
    }
    state.custom[ckey()] = cur; state.lastCustom = null; render();
  }
  const parseNum = (s, what, errs, o = {}) => {
    s = String(s).trim(); if (!s) { errs.push(`${what}: поле не заполнено`); return null; }
    try { const q = Q.parse(s); if (q.n.toString().replace('-', '').length > 12 || q.d.toString().length > 12) { errs.push(`${what}: слишком длинное число (до 12 цифр)`); return null; } if (o.nonneg && q.s < 0) { errs.push(`${what}: число должно быть неотрицательным`); return null; } return q; }
    catch (e) { errs.push(`${what}: «${s}» — ${e.message}`); return null; }
  };
  function readNew() {
    const kind = state.type, raw = rawFromDomNew(), errs = []; state.custom[ckey()] = raw;
    $('#cform').querySelectorAll('.err').forEach(e => e.classList.remove('err'));
    let out = null;
    if (kind === 'transp') {
      const a = raw.a.map((s, i) => parseNum(s, `Запас A${sub(i + 1)}`, errs, { nonneg: true })), b = raw.b.map((s, j) => parseNum(s, `Спрос B${sub(j + 1)}`, errs, { nonneg: true })), c = raw.c.map((r, i) => r.map((s, j) => parseNum(s, `Тариф c${sub(i + 1)}${sub(j + 1)}`, errs)));
      if (!errs.length) { if (a.every(v => v.isZero())) errs.push('Все запасы равны нулю.'); if (b.every(v => v.isZero())) errs.push('Весь спрос равен нулю.'); }
      if (!errs.length) out = { a, b, c };
    } else if (kind === 'game') {
      const C = raw.C.map((r, i) => r.map((s, j) => parseNum(s, `Выигрыш c${sub(i + 1)}${sub(j + 1)}`, errs)));
      if (!errs.length) out = { C };
    } else if (kind === 'netw') {
      const lines = raw.text.split('\n').map(s => s.trim()).filter(Boolean), arcs = [];
      if (!lines.length) errs.push('Список работ пуст: введите хотя бы одну работу «начало, конец, длительность».');
      lines.forEach((ln, k) => {
        const m = ln.replace(/[()]/g, '').split(/[,;\s]+/).filter(Boolean);
        if (m.length !== 3) { errs.push(`Строка ${k + 1} («${ln}»): нужно три числа — начало, конец, длительность`); return; }
        if (!/^\d+$/.test(m[0]) || !/^\d+$/.test(m[1]) || +m[0] < 1 || +m[1] < 1) { errs.push(`Строка ${k + 1}: номера событий должны быть натуральными числами`); return; }
        if (m[0] === m[1]) { errs.push(`Строка ${k + 1}: работа не может начинаться и заканчиваться в одном событии`); return; }
        const d = parseNum(m[2], `Строка ${k + 1}, длительность`, errs, { nonneg: true }); if (d) arcs.push([+m[0], +m[1], d]);
      });
      if (!errs.length) { const r = ALGN.solve(arcs); if (r.status === 'cycle') errs.push(`В графе есть цикл (события ${r.stuck.join(', ')}): события нельзя упорядочить.`); else out = { arcs }; }
    } else {
      const n = raw.n, c = raw.c.map((s, j) => parseNum(s, `Цель, коэффициент при x${sub(j + 1)}`, errs)), c0 = parseNum(raw.c0, 'Свободный член цели', errs);
      const rows = raw.rows.map((r, i) => ({ a: r.a.map((s, j) => parseNum(s, `Ограничение (${i + 1}), коэффициент при x${sub(j + 1)}`, errs)), s: r.s, b: parseNum(r.b, `Ограничение (${i + 1}), правая часть`, errs) }));
      const bounds = [];
      raw.lo.forEach((s, j) => { if (String(s).trim()) { const q = parseNum(s, `Нижняя граница x${sub(j + 1)}`, errs); if (q) bounds.push({ j, s: '>=', b: q }); } });
      raw.hi.forEach((s, j) => { if (String(s).trim()) { const q = parseNum(s, `Верхняя граница x${sub(j + 1)}`, errs); if (q) bounds.push({ j, s: '<=', b: q }); } });
      if (!errs.length) { if (c.every(v => v.isZero())) errs.push('Все коэффициенты цели равны нулю.'); rows.forEach((r, i) => { if (r.a.every(v => v.isZero())) errs.push(`Ограничение (${i + 1}): все коэффициенты при x равны нулю.`); }); }
      if (!errs.length) out = { n, sense: raw.sense, c, c0: c0.isZero() ? undefined : c0, rows, bounds };
    }
    $('#ferr').innerHTML = errs.length ? `<div class="note bad"><b>Проверьте ввод:</b><ul>${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>` : '';
    return errs.length ? null : out;
  }
  /* x̄ для проверки оптимальности: дополнительная строка ввода к форме сборника */
  const xbarRow = n => { const t = structOf(), v = t.variants.find(x => x.v === state.v) || t.variants[0], cur = state.xbar || v.xbar || []; return `<div class="frow" id="xbrow"><span class="flab">x̄ =</span>${[...Array(n).keys()].map(j => `<input class="num" data-xb="${j}" value="${vstr(cur[j] !== undefined ? cur[j] : '0')}" aria-label="x̄${j + 1}"><span class="xl"><i>x</i>${sub(j + 1)}${j < n - 1 ? ';' : ''}</span>`).join('')}</div>`; };
  function customForm() {
    if (NEWFORM.has(state.type)) return formNew();
    if (!useZForm()) return formHTML();
    let h = formZ();
    if (state.type === 'optcheck') { const cur = state.custom[ckey()]; h = h.replace('<div class="btnrow">', xbarRow(cur ? cur.n : 3) + '<div class="btnrow">'); }
    return h;
  }
  function solveNew(t) {
    const kind = state.type; let v, meta;
    const secName = t.title.split('. ')[0];
    if (state.mode === 'db') {
      v = t.variants.find(x => x.v === state.v);
      meta = { title: isZ() ? `${v.label || 'Задача ' + v.v} сборника ПЗ (${secName.toLowerCase()}, с. ${v.page || t.pages})` : `${v.label || 'Вариант ' + v.v} из методички (${secName.toLowerCase()}${v.page ? ', с. ' + v.page : ''})`, note: v.note, zyk: isZ(), answer: v.answer, answerZ: v.answer };
    } else {
      const lc = state.lastCustom && state.lastCustom.key === ckey() ? state.lastCustom.pr : null;
      if (!lc) return '<div class="card"><p>Введите данные и нажмите «Решить».</p></div>';
      meta = { title: 'Собственные коэффициенты', zyk: isZ(), answerZ: null };
      v = NEWFORM.has(kind) ? lc : { n: lc.n, sense: lc.sense, c: lc.c, c0: lc.c0, rows: lc.rows, xbar: lc.xbar };
    }
    try {
      if (kind === 'dsx') {
        const pr = state.mode === 'db' ? toProblem(t, v) : { n: v.n, sense: v.sense, c: v.c, rows: v.rows };
        if (state.mode === 'db') meta.answerZ = null;
        return VIEWS.dsimplex(pr, meta).join('');
      }
      if (kind === 'ilp') return VIEWS2.run('gomory', v, meta).join('');
      return VIEWS2.run(kind, v, meta, { init: state.tinit || (v && v.init) || 'nw' }).join('');
    } catch (e) { console.error(e); return `<div class="card note bad">Ошибка вычислений: ${e.message}</div>`; }
  }

  /* Поле панели: подпись + исходный select (его заменяет общий dropdown, см. dropdown.js). */
  const field = (id, label, opts, cls = '') => `<div class="cfield${cls}"><span class="clab" id="lbl-${id}">${label}</span><select id="${id}" data-dd>${opts}</select></div>`;
  const optList = (list, cur) => list.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('');
  function controls() {
    const T = SRC().types, z = isZ(), custom = state.mode === 'custom';
    const srcOpts = optList([['rgr', 'Методичка РГР · Девятерикова, Борисовский'], ['zyk', 'Сборник для практических занятий · Зыкина']], state.src);
    const typeOpts = typesFor().map(k => `<option value="${k}"${state.type === k ? ' selected' : ''}>${z ? 'Раздел' : 'Задание'} ${T[k].id} · ${T[k].short}</option>`).join('');
    const varOpts = (NEWKINDS.has(state.type) ? variantOptions(structOf().variants)
      : structOf().variants.map(v => `<option value="${v.v}"${v.v === state.v ? ' selected' : ''}>${z ? 'задача' : 'вариант'} ${v.v}${v.page ? ` (с. ${v.page})` : ''}${v.note && (z || state.type !== 'dual') ? ' ⚠' : ''}</option>`).join(''))
      .replace(/ selected/g, custom ? '' : ' selected') + `<option value="custom"${custom ? ' selected' : ''}>Свой вариант</option>`;
    let h = `<div class="ctl card"><div class="cgrid">`;
    h += field('csrc', 'Источник', srcOpts, ' wide src') + field('taskType', 'Тема', typeOpts, ' wide');
    if (state.type === 'dual' && !z) h += field('cbase', 'Прямая задача', DB.types.dual.bases.map(b => `<option value="${b.type}"${b.type === state.base ? ' selected' : ''}>${b.label}</option>`).join(''));
    h += field('cvar', z ? 'Задание' : 'Вариант', varOpts);
    if (state.type === 'transp') { const vv = structOf().variants.find(x => x.v === state.v) || {}; const ti = state.tinit || vv.init || 'nw'; h += field('tinit', 'Начальный план', optList([['nw', 'северо-западный угол'], ['mc', 'минимальная стоимость']], ti)); }
    h += (typeof LEARN !== 'undefined' && LEARN.modeField ? LEARN.modeField() : '') + '</div>';
    h += `<div class="kbd cnote">${T[state.type].title}. ${T[state.type].task}${z ? ` Страницы сборника: ${T[state.type].pages}.` : ''}</div>`;
    const note = typeof LEARN !== 'undefined' && LEARN.modeNote ? LEARN.modeNote() : '';
    if (note) h += `<div class="kbd" id="modenote">${note}</div>`;
    if (custom) h += customForm();
    return h + '</div>';
  }
  function solve() {
    LEARN.begin();
    VIEWS.stopAllDemos(); R.hooks.length = 0; R.offAll(); R.TR.on = false;
    const t = structOf(), key = ckey();
    if (NEWKINDS.has(state.type)) return solveNew(t);
    let pr, meta;
    if (state.mode === 'db' && isZ()) {
      const v = t.variants.find(x => x.v === state.v);
      pr = toProblemZ(v);
      meta = { title: `Задача ${v.v} сборника ПЗ (${t.title.split('. ')[0].toLowerCase()}, с. ${v.page || t.pages})`, zyk: true, answerZ: v.answer, note: v.note };
    } else if (state.mode === 'db') {
      const v = t.variants.find(x => x.v === state.v);
      pr = toProblem(t, v);
      meta = { title: `Вариант ${v.v} из методички (${t.title.split('.')[0]})`, answer: state.type === 'dual' ? null : v.answer, note: state.type === 'dual' ? '' : v.note };
    } else {
      pr = state.lastCustom && state.lastCustom.key === key ? state.lastCustom.pr : null;
      if (!pr) return '<div class="card"><p>Введите коэффициенты и нажмите «Решить».</p></div>';
      meta = { title: 'Собственные коэффициенты' };
      if (isZ()) { meta.zyk = true; meta.answerZ = null; }
    }
    let secs;
    try {
      if (isZ()) {
        if (state.type === 'graph') secs = VIEWS.graphZ(pr, meta);
        else if (state.type === 'simplex') secs = VIEWS.artificial(pr, meta, { artificialAll: false, zyk: true });
        else if (state.type === 'artificial') secs = VIEWS.artificial(pr, meta, { artificialAll: true, zyk: true });
        else if (state.type === 'dsimplex') secs = VIEWS.dsimplex(pr, meta);
        else secs = VIEWS.dualZ(pr, meta);
      }
      else if (state.type === 'graph') secs = VIEWS.graph(pr, meta);
      else if (state.type === 'simplex') secs = VIEWS.simplex(pr, meta);
      else if (state.type === 'artificial') secs = VIEWS.artificial(pr, meta);
      else secs = VIEWS.dual(pr, meta, state.base, () => { state.type = state.base; if (state.mode === 'custom') state.custom[state.base] = fromProblem(pr); render(); });
    } catch (e) { return `<div class="card note bad">Ошибка вычислений: ${e.message}</div>`; }
    if (state.trainer && !noTr()) secs = [secs[0], VIEWS.trainerFlow(state.type, pr, meta)];
    return secs.join('');
  }
  function render() {
    const vs = structOf().variants; if (!vs.some(v => v.v === state.v)) state.v = vs[0].v;
    $('#controls').innerHTML = controls();
    const body = solve();
    $('#solution').innerHTML = body;
    // навигация по разделам
    const secs = [...document.querySelectorAll('#solution section.sol')];
    $('#secnav').innerHTML = `<div class="kbd navh">Разделы решения</div>` + secs.map(s => `<a href="#${s.id}">${s.dataset.title}</a>`).join('');
    R.hooks.forEach(f => f());
    document.body.classList.toggle('trainer', state.trainer && !noTr());
    SPOIL.forEach(id => { const s = document.getElementById(id); if (!s) return; s.classList.add('spoiler'); s.addEventListener('click', () => s.classList.add('peek'), { once: true }); });
    // переходы по ссылкам итоговой карточки и меню разделов: плавная прокрутка и подсветка раздела
    document.querySelectorAll('#solution a[data-jump], #secnav a').forEach(a => a.onclick = e => {
      const t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
    });
    bind();
    LEARN.mount(state, structOf());
    DD.enhance($('#controls'));
    if (state.mode === 'db' && !Handbook.inLesson) { const q = new URLSearchParams({ s: state.src, t: state.type, v: state.v }); if (state.type === 'dual' && state.src === 'rgr') q.set('b', state.base); try { history.replaceState(null, '', '#' + q); } catch (_) { /* file:// в некоторых браузерах */ } }
  }
  function bind() {
    const typeSelect = $('#taskType');
    if (typeSelect) typeSelect.onchange = () => { state.type = typeSelect.value; state.tinit = null; state.xbar = null; if (state.mode === 'custom') state.lastCustom = null; render(); };
    const cs = $('#csrc');
    if (cs) cs.onchange = () => { if (state.src === cs.value) return; state.vs = state.vs || {}; state.vs[state.src] = state.v; state.src = cs.value; if (state.vs[state.src]) state.v = state.vs[state.src]; if (!typesFor().includes(state.type)) state.type = 'graph'; state.lastCustom = null; render(); };
    ['#zn', '#zm', '#zs'].forEach(s => { const e = $(s); if (e && s !== '#zs') e.onchange = resizeZ; });
    ['#kn_m', '#kn_n'].forEach(s => { const e = $(s); if (e) e.onchange = resizeNew; });
    const ti = $('#tinit'); if (ti) ti.onchange = () => { state.tinit = ti.value; render(); };
    const cb = $('#cbase'); if (cb) cb.onchange = () => { state.base = cb.value; state.lastCustom = null; render(); };
    const cv = $('#cvar'); if (cv) cv.onchange = () => { state.lastCustom = null; state.tinit = null; state.xbar = null; if (cv.value === 'custom') state.mode = 'custom'; else { state.mode = 'db'; state.v = +cv.value; } render(); };
    const fs = $('#fsolve');
    if (fs) {
      fs.onclick = () => {
        const pr = NEWFORM.has(state.type) ? readNew() : useZForm() ? readFormZ() : readForm(); if (!pr) return;
        if (state.type === 'optcheck') {
          const errs = [], xb = [...document.querySelectorAll('#xbrow [data-xb]')].map((e, j) => parseNum(e.value, `Вектор x̄, координата x${sub(j + 1)}`, errs));
          state.xbar = [...document.querySelectorAll('#xbrow [data-xb]')].map(e => e.value);
          if (errs.length) { $('#ferr').innerHTML = `<div class="note bad"><b>Проверьте ввод:</b><ul>${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>`; return; }
          pr.xbar = xb;
        }
        const key = ckey(); if (!isZ() && !useZForm() && !NEWFORM.has(state.type)) state.custom[key] = fromProblem(pr); state.lastCustom = { key, pr }; render(); $('#solution').scrollIntoView({ behavior: 'smooth' });
      };
      $('#fload').onclick = () => { const key = ckey(); state.custom[key] = null; state.xbar = null; state.v = +$('#ffill').value; state.lastCustom = null; render(); };
      $('#fclear').onclick = () => { document.querySelectorAll('#cform input.num').forEach(i => { i.value = ''; }); $('#ferr').innerHTML = ''; };
    }
  }
  function init() {
    document.addEventListener('trainer-off', () => { state.trainer = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    // открыть вариант по ссылке
    const q = new URLSearchParams(location.hash.slice(1));
    if (['rgr', 'zyk'].includes(q.get('s'))) state.src = q.get('s');
    if (typesFor().includes(q.get('t'))) state.type = q.get('t');
    if (q.get('v')) state.v = +q.get('v');
    if (['graph', 'simplex'].includes(q.get('b'))) state.base = q.get('b');
    render();
  }
  return { init, state, render };
})();
document.addEventListener('DOMContentLoaded', () => Handbook.start());

