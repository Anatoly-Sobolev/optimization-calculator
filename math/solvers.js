/* =====================================================================
   2. ТОЧНАЯ АРИФМЕТИКА (дроби на BigInt — без ошибок округления)
   ===================================================================== */
class Q {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error('Деление на ноль');
    if (d < 0n) { n = -n; d = -d; }
    const g = Q.gcd(n < 0n ? -n : n, d) || 1n;
    this.n = n / g; this.d = d / g;
  }
  static gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
  static of(v) {
    if (v instanceof Q) return v;
    if (typeof v === 'bigint') return new Q(v);
    if (typeof v === 'number' && Number.isInteger(v)) return new Q(BigInt(v));
    return Q.parse(String(v));
  }
  /* Разбор строки: целое, десятичная дробь (точка или запятая), a/b, смешанная «a+b/c». */
  static parse(src) {
    let s = String(src).trim().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(',', '.');
    if (s === '') throw new Error('пустое значение');
    let m;
    if ((m = s.match(/^([+-]?\d+)\+(\d+)\/(\d+)$/))) {
      const whole = Q.parse(m[1]), fr = Q.parse(m[2] + '/' + m[3]);
      return whole.s < 0 ? whole.sub(fr) : whole.add(fr);
    }
    if (/^[+-]?\d+$/.test(s)) return new Q(BigInt(s));
    if ((m = s.match(/^([+-]?)(\d*)\.(\d+)$/)) || (m = s.match(/^([+-]?)(\d+)\.()$/))) {
      const intp = m[2] || '0', frac = m[3] || '';
      const n = BigInt(intp + frac) * (m[1] === '-' ? -1n : 1n);
      return new Q(n, 10n ** BigInt(frac.length));
    }
    if ((m = s.match(/^([+-]?\d+)\/([+-]?\d+)$/))) {
      if (BigInt(m[2]) === 0n) throw new Error('знаменатель равен нулю');
      return new Q(BigInt(m[1]), BigInt(m[2]));
    }
    throw new Error('не число');
  }
  add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
  div(o) { o = Q.of(o); if (o.n === 0n) throw new Error('Деление на ноль'); return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  abs() { return this.n < 0n ? this.neg() : this; }
  cmp(o) { o = Q.of(o); const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  get s() { return this.n < 0n ? -1 : this.n > 0n ? 1 : 0; }
  isZero() { return this.n === 0n; }
  eq(o) { return this.cmp(o) === 0; }
  lt(o) { return this.cmp(o) < 0; }
  gt(o) { return this.cmp(o) > 0; }
  le(o) { return this.cmp(o) <= 0; }
  ge(o) { return this.cmp(o) >= 0; }
  isInt() { return this.d === 1n; }
  toNumber() { return Number(this.n) / Number(this.d); }
  /* Конечная ли десятичная запись (знаменатель только из 2 и 5). */
  finiteDecimal() { let d = this.d; while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n; return d === 1n; }
  /* Текстовая запись без округления: целое, конечная десятичная или a/b. */
  toText() {
    const sg = this.n < 0n ? '−' : '', n = this.n < 0n ? -this.n : this.n;
    if (this.d === 1n) return sg + n;
    if (this.finiteDecimal()) {
      let p = 0n; while ((10n ** p) % this.d !== 0n) p++;
      const v = (n * (10n ** p / this.d)).toString().padStart(Number(p) + 1, '0');
      return sg + v.slice(0, -Number(p)) + ',' + v.slice(-Number(p));
    }
    return sg + n + '/' + this.d;
  }
}
const Z = () => new Q(0n), ONE = () => new Q(1n);
const qs = arr => arr.map(Q.of);

/* =====================================================================
   3. АЛГОРИТМЫ
   Все функции возвращают «трассу» — данные для построения объяснений.
   ===================================================================== */
const ALG = (() => {
  const clone = st => ({
    rows: st.rows.map(r => ({ b: r.b, a: r.a.slice() })),
    z: { b: st.z.b, a: st.z.a.slice(), label: st.z.label },
    basis: st.basis.slice(), cols: st.cols.slice(), vars: st.vars, phase: st.phase
  });

  /* Преобразование таблицы по ведущему элементу (p — строка, q — столбец). */
  function pivot(st, p, q) {
    const s = clone(st), piv = st.rows[p].a[q];
    const np = { b: st.rows[p].b.div(piv), a: st.rows[p].a.map(v => v.div(piv)) };
    const red = r => { const k = r.a[q]; return { b: r.b.sub(k.mul(np.b)), a: r.a.map((v, j) => v.sub(k.mul(np.a[j]))) }; };
    s.rows = st.rows.map((r, i) => i === p ? np : red(r));
    const zr = red(st.z); s.z = { b: zr.b, a: zr.a, label: st.z.label };
    s.basis[p] = q;
    return s;
  }

  /* Симплекс-метод по правилам методички:
     шаг 1 — оптимальность (в строке цели нет отрицательных),
     шаг 2 — неограниченность (столбец с минусом и без положительных элементов),
     шаг 3 — ведущий столбец (самое отрицательное число), шаг 4 — ведущая строка (min b/a, a>0),
     шаг 5 — пересчёт. При повторе базиса включается правило Бленда (защита от зацикливания). */
  function runSimplex(start, allowed, maxIt = 300) {
    const steps = []; let st = start; const seen = new Set(); let bland = false, blandNote = false;
    for (let it = 0; it <= maxIt; it++) {
      const key = st.basis.join(',');
      if (seen.has(key) && !bland) { bland = true; blandNote = true; }
      seen.add(key);
      const neg = allowed.filter(j => st.z.a[j].s < 0);
      if (!neg.length) { steps.push({ ...st, q: null, p: null, ratios: null }); return { steps, status: 'optimal', last: st, bland: blandNote }; }
      const unbCol = neg.find(j => st.rows.every(r => r.a[j].s <= 0));
      let q;
      if (bland) q = Math.min(...neg);
      else { q = neg[0]; neg.forEach(j => { if (st.z.a[j].lt(st.z.a[q])) q = j; }); }
      const ratios = st.rows.map(r => r.a[q].s > 0 ? r.b.div(r.a[q]) : null);
      let p = null;
      ratios.forEach((r, i) => {
        if (!r) return;
        if (p === null || r.lt(ratios[p]) || (r.eq(ratios[p]) && st.basis[i] < st.basis[p])) p = i;
      });
      if (p === null) {
        steps.push({ ...st, q, p: null, ratios, unbounded: true });
        return { steps, status: 'unbounded', last: st, unbCol: q, bland: blandNote };
      }
      steps.push({ ...st, q, p, ratios, unbHint: unbCol });
      st = pivot(st, p, q);
    }
    return { steps, status: 'cycle', last: st, bland: blandNote };
  }

  /* Общая постановка: { n, c:[Q], sense:'max'|'min', rows:[{a:[Q], s:'<='|'>='|'=', b:Q}] }.
     opts.artificialAll — добавлять искусственную переменную в каждое ограничение (как в задании 3). */
  function twoPhase(pr, opts = {}) {
    const n = pr.n, m = pr.rows.length, notes = [];
    // 1) b ≥ 0: строки с отрицательной правой частью умножаем на −1
    const rows = pr.rows.map((r, i) => {
      if (r.b.s < 0) {
        notes.push({ kind: 'flip', i });
        return { a: r.a.map(v => v.neg()), s: r.s === '<=' ? '>=' : r.s === '>=' ? '<=' : '=', b: r.b.neg(), flipped: true, orig: r };
      }
      return { ...r, flipped: false, orig: r };
    });
    // 2) переменные: x1..xn, дополнительные x(n+1).., искусственные t1..
    const vars = [];
    for (let j = 0; j < n; j++) vars.push({ kind: 'x', k: j + 1 });
    const slackOf = [];
    rows.forEach((r, i) => { if (r.s !== '=') { slackOf[i] = vars.length; vars.push({ kind: 's', k: vars.length + 1, row: i, sign: r.s === '<=' ? 1 : -1 }); } else slackOf[i] = null; });
    const needArt = rows.map(r => opts.artificialAll || r.s !== '<=');
    const artOf = [];
    let tk = 0;
    rows.forEach((r, i) => { if (needArt[i]) { artOf[i] = vars.length; vars.push({ kind: 't', k: ++tk, row: i }); } else artOf[i] = null; });
    const N = vars.length;
    const tRows = rows.map((r, i) => {
      const a = new Array(N).fill(null).map(Z);
      r.a.forEach((v, j) => { a[j] = v; });
      if (slackOf[i] !== null) a[slackOf[i]] = r.s === '<=' ? ONE() : ONE().neg();
      if (artOf[i] !== null) a[artOf[i]] = ONE();
      return { b: r.b, a };
    });
    const basis = rows.map((r, i) => artOf[i] !== null ? artOf[i] : slackOf[i]);
    const isArt = j => vars[j].kind === 't';
    const res = { vars, rows, notes, slackOf, artOf, n, sense: pr.sense, c: pr.c, orig: pr };
    let st;
    // 3) этап 1 — минимум h = Σ t (в таблице строка −h → max)
    if (artOf.some(v => v !== null)) {
      const z = { b: Z(), a: new Array(N).fill(null).map(Z), label: '−h' };
      rows.forEach((r, i) => { if (artOf[i] === null) return; z.b = z.b.sub(tRows[i].b); tRows[i].a.forEach((v, j) => { if (!isArt(j)) z.a[j] = z.a[j].sub(v); }); });
      st = { rows: tRows, z, basis, cols: [...Array(N).keys()], vars, phase: 1 };
      const r1 = runSimplex(st, [...Array(N).keys()]);
      res.phase1 = r1;
      if (r1.status !== 'optimal') { res.status = r1.status === 'cycle' ? 'cycle' : 'error'; return res; }
      st = r1.last;
      res.h = st.z.b.neg();
      if (!st.z.b.isZero()) { res.status = 'infeasible'; return res; }
      // вывод искусственных переменных, оставшихся в базисе с нулевым значением
      res.driveOut = [];
      for (let i = 0; i < st.rows.length; i++) {
        if (!isArt(st.basis[i])) continue;
        const q = st.rows[i].a.findIndex((v, j) => !isArt(j) && !v.isZero());
        if (q >= 0) { const before = st; st = pivot(st, i, q); res.driveOut.push({ kind: 'pivot', before, after: st, p: i, q }); }
        else { res.driveOut.push({ kind: 'drop', before: st, p: i }); st = clone(st); st.rows.splice(i, 1); st.basis.splice(i, 1); i--; }
      }
    } else {
      st = { rows: tRows, z: null, basis, cols: [...Array(N).keys()], vars, phase: 2 };
    }
    // 4) этап 2: удалить столбцы t, записать строку цели и выразить её через небазисные
    const cols2 = [...Array(N).keys()].filter(j => !isArt(j));
    const label = pr.sense === 'max' ? 'f' : '−f';
    const raw = { b: Z(), a: new Array(N).fill(null).map(Z), label };
    pr.c.forEach((v, j) => { raw.a[j] = pr.sense === 'max' ? v.neg() : v; });
    const elim = [];
    let z = { b: raw.b, a: raw.a.slice(), label };
    st.basis.forEach((bj, i) => {
      const k = z.a[bj];
      if (!k.isZero()) { elim.push({ i, bj, k }); z = { b: z.b.sub(k.mul(st.rows[i].b)), a: z.a.map((v, j) => v.sub(k.mul(st.rows[i].a[j]))), label }; }
    });
    const start2 = { ...clone({ ...st, z }), cols: cols2, phase: 2 };
    res.raw = { ...clone({ ...st, z: raw }), cols: cols2, phase: 2 };
    res.elim = elim;
    const r2 = runSimplex(start2, cols2);
    res.phase2 = r2;
    if (r2.status === 'unbounded') { res.status = 'unbounded'; return res; }
    if (r2.status !== 'optimal') { res.status = 'cycle'; return res; }
    const last = r2.last;
    res.status = 'optimal';
    res.x = [...Array(n)].map((_, j) => { const i = last.basis.indexOf(j); return i < 0 ? Z() : last.rows[i].b; });
    res.all = [...Array(N)].map((_, j) => { const i = last.basis.indexOf(j); return i < 0 ? Z() : last.rows[i].b; });
    res.f = pr.sense === 'max' ? last.z.b : last.z.b.neg();
    if (pr.c0) res.f = res.f.add(pr.c0);   // свободный член цели (сборник ПЗ, 2.4 № 29)
    res.alt = cols2.filter(j => last.basis.indexOf(j) < 0 && last.z.a[j].isZero());
    res.degenerate = last.basis.some((bj, i) => last.rows[i].b.isZero());
    res.last = last;
    return res;
  }

  /* Подстановка точки в ограничения: значения левых частей и выполнение. */
  function check(pr, x) {
    return pr.rows.map(r => {
      const lhs = r.a.reduce((s, v, j) => s.add(v.mul(x[j])), Z());
      const ok = r.s === '<=' ? lhs.le(r.b) : r.s === '>=' ? lhs.ge(r.b) : lhs.eq(r.b);
      return { lhs, ok, tight: lhs.eq(r.b) };
    });
  }
  const value = (c, x) => c.reduce((s, v, j) => s.add(v.mul(x[j])), Z());

  /* ---------- Графический метод (две переменные) ---------- */
  function graph(pr) {
    const lines = pr.rows.map((r, i) => ({ a: r.a, b: r.b, s: r.s, i, name: '(' + (i + 1) + ')' }));
    const axes = [{ a: [ONE(), Z()], b: Z(), s: '>=', i: 'x1', name: 'x₁ = 0' }, { a: [Z(), ONE()], b: Z(), s: '>=', i: 'x2', name: 'x₂ = 0' }];
    const all = [...lines, ...axes];
    const feasible = p => p[0].s >= 0 && p[1].s >= 0 && check(pr, p).every(c => c.ok);
    const verts = [];
    for (let u = 0; u < all.length; u++) for (let v = u + 1; v < all.length; v++) {
      const A = all[u], B = all[v];
      const det = A.a[0].mul(B.a[1]).sub(A.a[1].mul(B.a[0]));
      if (det.isZero()) continue;
      const x1 = A.b.mul(B.a[1]).sub(A.a[1].mul(B.b)).div(det), x2 = A.a[0].mul(B.b).sub(A.b.mul(B.a[0])).div(det);
      const p = [x1, x2];
      if (!feasible(p)) continue;
      if (!verts.some(w => w.p[0].eq(x1) && w.p[1].eq(x2))) verts.push({ p, f: pr.c0 ? value(pr.c, p).add(pr.c0) : value(pr.c, p) });
    }
    // какие границы проходят через вершину
    verts.forEach(w => { w.on = all.filter(L => L.a[0].mul(w.p[0]).add(L.a[1].mul(w.p[1])).eq(L.b)).map(L => L.i); });
    // описание прямых: точки пересечения с осями и проверка точки (0;0)
    const lineInfo = lines.map(L => ({
      ...L,
      ix: L.a[0].isZero() ? null : L.b.div(L.a[0]),
      iy: L.a[1].isZero() ? null : L.b.div(L.a[1]),
      origin: L.s === '<=' ? Z().le(L.b) : L.s === '>=' ? Z().ge(L.b) : Z().eq(L.b)
    }));
    const lp = twoPhase(pr);
    const out = { verts, lines: lineInfo, lp, status: lp.status };
    if (lp.status === 'optimal') {
      out.f = lp.f;
      out.opt = verts.filter(w => w.f.eq(lp.f));
      // система для оптимальной вершины: две граничные прямые
      const w = out.opt.find(o => o.p[0].eq(lp.x[0]) && o.p[1].eq(lp.x[1])) || out.opt[0];
      out.optVertex = w;
      out.degenerate = w && w.on.length > 2;
    }
    return out;
  }

  /* ---------- Двойственная задача ---------- */
  function dual(pr) {
    // приведение: задача на max — все неравенства к виду «≤»
    const norm = pr.rows.map((r, i) => r.s === '>=' ? { a: r.a.map(v => v.neg()), s: '<=', b: r.b.neg(), flipped: true, i } : { ...r, flipped: false, i });
    const m = norm.length, n = pr.n;
    const D = { n: m, sense: 'min', c: norm.map(r => r.b), rows: [...Array(n)].map((_, j) => ({ a: norm.map(r => r.a[j]), s: '>=', b: pr.c[j] })) };
    const res = { norm, D, primal: twoPhase(pr) };
    res.dualLP = twoPhase(D);
    if (res.primal.status !== 'optimal') { res.status = 'primal-' + res.primal.status; return res; }
    const x = res.primal.x, f = res.primal.f;
    // УДН
    const slack = norm.map(r => r.b.sub(r.a.reduce((s, v, j) => s.add(v.mul(x[j])), Z())));
    const zeroY = slack.map(s => s.s > 0);
    const eqJ = x.map(v => v.s > 0);
    const U = [...Array(m).keys()].filter(i => !zeroY[i]);
    // система уравнений по столбцам j с x_j > 0, неизвестные — y_i, i ∈ U
    const eqs = [...Array(n).keys()].filter(j => eqJ[j]).map(j => ({ j, a: U.map(i => norm[i].a[j]), b: pr.c[j] }));
    const sol = gauss(eqs.map(e => e.a.slice()), eqs.map(e => e.b), U.length);
    res.cs = { slack, zeroY, eqJ, U, eqs, sol };
    if (sol.status === 'inconsistent') { res.status = 'cs-inconsistent'; return res; }
    const full = (vals) => { const y = new Array(m).fill(null).map(Z); U.forEach((i, k) => { y[i] = vals[k]; }); return y; };
    if (sol.free.length === 0) {
      res.y = full(sol.x0);
      res.unique = true;
    } else {
      // УДН не определяют y однозначно: решаем двойственную на множестве УДН
      const red = { n: U.length, sense: 'min', c: U.map(i => norm[i].b), rows: [] };
      eqs.forEach(e => red.rows.push({ a: e.a, s: '=', b: e.b }));
      [...Array(n).keys()].filter(j => !eqJ[j]).forEach(j => red.rows.push({ a: U.map(i => norm[i].a[j]), s: '>=', b: pr.c[j] }));
      const rlp = twoPhase(red);
      res.reduced = { pr: red, lp: rlp };
      if (rlp.status !== 'optimal') { res.status = 'reduced-' + rlp.status; return res; }
      res.y = full(rlp.x);
      res.unique = false;
      if (sol.free.length === 1) res.family = paramFamily(norm, pr, U, sol, eqJ);
    }
    res.g = value(D.c, res.y);
    res.dcheck = check(D, res.y);
    res.status = 'optimal';
    // для задачи «все ≤» значения y стоят в строке f последней таблицы под дополнительными переменными
    if (pr.rows.every(r => r.s === '<=') && res.primal.last && res.primal.slackOf.every(v => v !== null)) {
      res.fromTable = res.primal.slackOf.map(sj => res.primal.last.z.a[sj]);
    }
    return res;
  }

  /* Метод Гаусса: возвращает частное решение x0 и направления для свободных неизвестных. */
  function gauss(A, b, k) {
    const M = A.map((r, i) => [...r, b[i]]);
    const rows = M.length; const piv = []; let r = 0; const ops = [];
    for (let c = 0; c < k && r < rows; c++) {
      let p = r; while (p < rows && M[p][c].isZero()) p++;
      if (p === rows) continue;
      [M[r], M[p]] = [M[p], M[r]];
      const pv = M[r][c]; M[r] = M[r].map(v => v.div(pv));
      for (let i = 0; i < rows; i++) if (i !== r && !M[i][c].isZero()) { const f = M[i][c]; M[i] = M[i].map((v, j) => v.sub(f.mul(M[r][j]))); }
      piv.push(c); r++;
    }
    for (let i = r; i < rows; i++) if (!M[i][k].isZero()) return { status: 'inconsistent', M };
    const free = [...Array(k).keys()].filter(c => !piv.includes(c));
    const x0 = new Array(k).fill(null).map(Z);
    piv.forEach((c, i) => { x0[c] = M[i][k]; });
    const dirs = free.map(fc => { const d = new Array(k).fill(null).map(Z); d[fc] = ONE(); piv.forEach((c, i) => { d[c] = M[i][fc].neg(); }); return d; });
    return { status: 'ok', x0, free, dirs, piv, M, rank: r };
  }

  /* Одна свободная неизвестная: y = y0 + t·d; границы t и поведение g(t). */
  function paramFamily(norm, pr, U, sol, eqJ) {
    const y0 = sol.x0, d = sol.dirs[0], ft = sol.free[0];
    let lo = null, hi = null; // по t
    const cons = [];
    U.forEach((i, k) => cons.push({ a: d[k], b: y0[k].neg(), what: 'y' + (i + 1) + ' ≥ 0' }));      // y0+td ≥ 0
    pr.c.forEach((cj, j) => {
      if (eqJ[j]) return;
      const a = U.reduce((s, i, k) => s.add(norm[i].a[j].mul(d[k])), Z());
      const base = U.reduce((s, i, k) => s.add(norm[i].a[j].mul(y0[k])), Z());
      cons.push({ a, b: cj.sub(base), what: 'Д' + (j + 1) });                                   // a·t ≥ cj − base
    });
    cons.forEach(c => {
      if (c.a.isZero()) return;
      const t = c.b.div(c.a);
      if (c.a.s > 0) { if (lo === null || t.gt(lo)) lo = t; } else { if (hi === null || t.lt(hi)) hi = t; }
    });
    const g0 = U.reduce((s, i, k) => s.add(norm[i].b.mul(y0[k])), Z());
    const g1 = U.reduce((s, i, k) => s.add(norm[i].b.mul(d[k])), Z());
    return { y0, d, U, ft, lo, hi, g0, g1, constG: g1.isZero() };
  }

  return { twoPhase, runSimplex, pivot, check, value, graph, dual, gauss };
})();

/* ---------- Расширения для задач сборника ПЗ: знаки переменных, общая двойственная, сведение к двум переменным ---------- */
const ALGZ = (() => {
  const { twoPhase, check, value } = ALG;
  const fv = (pr, x) => pr.c0 ? value(pr.c, x).add(pr.c0) : value(pr.c, x);

  /* Условия на переменные (2.6): xⱼ ≥ 0 / xⱼ ≤ 0 — знак переменной; любые другие границы
     (xⱼ ≥ 10, xⱼ ≤ 5, повторное условие на знак) — обычные ограничения. Без условия на знак переменная свободна. */
  function normalize(pr) {
    if (!pr.bounds) return { ...pr, signs: pr.signs || new Array(pr.n).fill('>='), info: [], nMain: pr.rows.length };
    const signs = new Array(pr.n).fill('free'), extra = [], info = [];
    pr.bounds.forEach(B => {
      if (B.b.isZero() && signs[B.j] === 'free') { signs[B.j] = B.s; info.push({ ...B, kind: 'sign' }); return; }
      const a = new Array(pr.n).fill(null).map(Z); a[B.j] = ONE();
      extra.push({ a, s: B.s, b: B.b, fromBound: true });
      info.push({ ...B, kind: 'row', row: pr.rows.length + extra.length - 1 });
    });
    return { n: pr.n, sense: pr.sense, c: pr.c, c0: pr.c0, rows: [...pr.rows, ...extra], signs, info, nMain: pr.rows.length };
  }

  /* Решение задачи с произвольными знаками переменных: xⱼ ≤ 0 → xⱼ = −x′ⱼ, свободная → x′ⱼ − x″ⱼ, затем twoPhase. */
  function solve(pr) {
    const signs = pr.signs || new Array(pr.n).fill('>='), cols = [];
    signs.forEach((s, j) => { if (s === '>=') cols.push({ j, k: 1 }); else if (s === '<=') cols.push({ j, k: -1 }); else { cols.push({ j, k: 1 }); cols.push({ j, k: -1 }); } });
    const sg = (cl, v) => cl.k > 0 ? v : v.neg();
    const std = { n: cols.length, sense: pr.sense, c: cols.map(cl => sg(cl, pr.c[cl.j])), c0: pr.c0, rows: pr.rows.map(r => ({ a: cols.map(cl => sg(cl, r.a[cl.j])), s: r.s, b: r.b })) };
    const lp = twoPhase(std), out = { status: lp.status, lp, std, cols };
    if (lp.status === 'optimal') {
      const x = new Array(pr.n).fill(null).map(Z);
      cols.forEach((cl, k) => { x[cl.j] = x[cl.j].add(sg(cl, lp.x[k])); });
      out.x = x; out.f = fv(pr, x);
    }
    return out;
  }

  /* Двойственная задача по общим правилам.
     max: «≤» → yᵢ ≥ 0, «≥» → yᵢ ≤ 0, «=» → yᵢ любого знака; xⱼ ≥ 0 → «≥ cⱼ», xⱼ ≤ 0 → «≤ cⱼ», свободная → «= cⱼ»; g → min.
     min: «≥» → yᵢ ≥ 0, «≤» → yᵢ ≤ 0, «=» → любого знака; xⱼ ≥ 0 → «≤ cⱼ», xⱼ ≤ 0 → «≥ cⱼ», свободная → «= cⱼ»; g → max. */
  function dualOf(P) {
    const max = P.sense === 'max';
    const ysign = P.rows.map(r => r.s === '=' ? 'free' : ((r.s === '<=') === max ? '>=' : '<='));
    const rows = [...Array(P.n).keys()].map(j => ({ a: P.rows.map(r => r.a[j]), s: P.signs[j] === 'free' ? '=' : ((P.signs[j] === '>=') === max ? '>=' : '<='), b: P.c[j] }));
    return { n: P.rows.length, sense: max ? 'min' : 'max', c: P.rows.map(r => r.b), c0: P.c0, rows, signs: ysign };
  }

  /* Сведение задачи с уравнениями к плоскости (x₁; x₂): базисные переменные выражаются через x₁, x₂,
     условия xⱼ ≥ 0 для них превращаются в неравенства. */
  function reduce2(pr) {
    const n = pr.n, out = { ok: true, basic: [], origin: [], dropped: [], contra: [], objOnly: [] };
    let M = pr.rows.map((r, i) => ({ i, a: r.a.slice(), b: r.b })).filter(r => pr.rows[r.i].s === '=');
    const used = new Set();
    for (let j = 2; j < n; j++) {
      const p = M.findIndex((r, k) => !used.has(k) && !r.a[j].isZero());
      if (p < 0) continue;
      used.add(p);
      const pv = M[p].a[j], P = { i: M[p].i, a: M[p].a.map(v => v.div(pv)), b: M[p].b.div(pv) };
      M = M.map((r, k) => k === p ? P : r.a[j].isZero() ? r : { i: r.i, a: r.a.map((v, t) => v.sub(r.a[j].mul(P.a[t]))), b: r.b.sub(r.a[j].mul(P.b)) });
      out.basic.push({ j, k: p });
    }
    out.basic = out.basic.map(B => ({ j: B.j, from: M[B.k].i, b: M[B.k].b, a: [M[B.k].a[0], M[B.k].a[1]], row: M[B.k] }));
    const isB = j => out.basic.some(B => B.j === j);
    const nonb = [...Array(n).keys()].filter(j => j >= 2 && !isB(j));
    const subst = (a, b) => {
      let A = [a[0], a[1]], bb = b;
      out.basic.forEach(B => { const k = a[B.j]; if (k.isZero()) return; A = [A[0].sub(k.mul(B.a[0])), A[1].sub(k.mul(B.a[1]))]; bb = bb.sub(k.mul(B.b)); });
      return { a: A, b: bb };
    };
    // небазисная переменная (кроме x₁, x₂) в ограничениях — на плоскость не сводится
    const inCons = j => M.some(r => !r.a[j].isZero()) || pr.rows.some(r => r.s !== '=' && !r.a[j].isZero());
    const bad = nonb.filter(inCons);
    if (bad.length) { out.ok = false; out.reason = `переменные ${bad.map(j => 'x' + (j + 1)).join(', ')} остаются свободными — после исключения больше двух независимых переменных`; return out; }
    out.objOnly = nonb.filter(j => !pr.c[j].isZero());
    const rows = [];
    const push = (a, s, b, origin) => {
      if (a[0].isZero() && a[1].isZero()) {
        const ok = s === '<=' ? Z().le(b) : s === '>=' ? Z().ge(b) : b.isZero();
        (ok ? out.dropped : out.contra).push({ ...origin, s, b });
        return;
      }
      rows.push({ a, s, b }); out.origin.push(origin);
    };
    pr.rows.forEach((r, i) => { if (r.s === '=') return; const S = subst(r.a, r.b); push(S.a, r.s, S.b, { kind: 'row', i }); });
    out.basic.forEach(B => push([B.a[0], B.a[1]], '<=', B.b, { kind: 'basic', j: B.j }));
    M.forEach((r, k) => { if (used.has(k)) return; push([r.a[0], r.a[1]], '=', r.b, { kind: 'eq', i: r.i }); });
    const C = subst(pr.c, Z());
    out.pr2 = { n: 2, sense: pr.sense, c: C.a, c0: (pr.c0 || Z()).sub(C.b), rows };
    if (out.pr2.c0.isZero()) delete out.pr2.c0;
    out.lift = x2 => { const x = new Array(n).fill(null).map(Z); x[0] = x2[0]; x[1] = x2[1]; out.basic.forEach(B => { x[B.j] = B.b.sub(B.a[0].mul(x2[0])).sub(B.a[1].mul(x2[1])); }); return x; };
    return out;
  }

  return { normalize, solve, dualOf, reduce2, fv };
})();

/* =====================================================================
   3б. ДВОЙСТВЕННЫЙ СИМПЛЕКС-МЕТОД (сборник ПЗ, раздел 2.5)
   Таблицы те же, что в симплекс-методе проекта: строки x_Б + Σ a·x = b, строка цели хранит d_j
   (для задачи min g; для max берётся g = −f). Признак «оптимально» в обычном симплексе — все d_j ≥ 0;
   в двойственном методе это двойственная допустимость, которую сохраняют, пока не исчезнут b < 0.
   Правую часть и значение цели храним как a + m·M: M — «большое» число искусственного ограничения.
   ===================================================================== */
class QM {
  constructor(a, m) { this.a = a instanceof Q ? a : Q.of(a); this.m = m === undefined ? new Q(0n) : (m instanceof Q ? m : Q.of(m)); }
  static of(v) { return v instanceof QM ? v : new QM(Q.of(v)); }
  get s() { return this.m.s !== 0 ? this.m.s : this.a.s; }
  hasM() { return !this.m.isZero(); }
  isZero() { return this.m.isZero() && this.a.isZero(); }
  neg() { return new QM(this.a.neg(), this.m.neg()); }
  add(o) { o = QM.of(o); return new QM(this.a.add(o.a), this.m.add(o.m)); }
  sub(o) { o = QM.of(o); return new QM(this.a.sub(o.a), this.m.sub(o.m)); }
  scale(k) { return new QM(this.a.mul(k), this.m.mul(k)); }
  div(k) { return new QM(this.a.div(k), this.m.div(k)); }
  cmp(o) { return this.sub(o).s; }
  eq(o) { return this.cmp(o) === 0; }
  lt(o) { return this.cmp(o) < 0; }
  gt(o) { return this.cmp(o) > 0; }
  at(M0) { return this.a.add(this.m.mul(M0)); }
  toText() {
    if (!this.hasM()) return this.a.toText();
    const mt = this.m.eq(ONE()) ? 'M' : this.m.eq(ONE().neg()) ? '−M' : this.m.toText() + 'M';
    return this.a.isZero() ? mt : mt + (this.a.s < 0 ? ' − ' : ' + ') + this.a.abs().toText();
  }
}

const ALGD = (() => {
  const { check, value } = ALG;
  const idx = n => [...Array(n).keys()];
  const MAXIT = 400;

  function clone(st) {
    return { rows: st.rows.map(r => ({ b: r.b, a: r.a.slice() })), z: { b: st.z.b, a: st.z.a.slice(), label: st.z.label },
      basis: st.basis.slice(), cols: st.cols.slice(), vars: st.vars.slice(), phase: st.phase };
  }
  /* Поворот по ведущему элементу (p, q): ведущую строку делим на элемент, из остальных вычитаем её × их число в столбце q. */
  function pivot(st, p, q) {
    const s = clone(st), piv = st.rows[p].a[q];
    const np = { b: st.rows[p].b.div(piv), a: st.rows[p].a.map(v => v.div(piv)) };
    const red = r => { const k = r.a[q]; return { b: r.b.sub(np.b.scale(k)), a: r.a.map((v, j) => v.sub(k.mul(np.a[j]))) }; };
    s.rows = st.rows.map((r, i) => i === p ? np : red(r));
    const zr = red(st.z); s.z = { b: zr.b, a: zr.a, label: st.z.label };
    s.basis[p] = q;
    return s;
  }

  /* Цикл двойственного симплекса от таблицы st: добавляет шаги в steps.
     Возвращает { st, status: 'optimal' | 'infeasible' | 'cycle', bland }.
     end = true — в конце дописывается шаг-итог (kind 'end'); иначе итоговая таблица в steps не дублируется. */
  function runLoop(st, steps, end) {
    const seen = new Set(); let bland = false;
    for (let it = 0; it <= MAXIT; it++) {
      if (it === MAXIT) { if (end) steps.push({ ...st, kind: 'end', p: null, q: null, terminal: 'cycle' }); return { st, status: 'cycle', bland }; }
      const key = st.basis.join(',');
      if (seen.has(key) && !bland) bland = true;
      seen.add(key);
      const inf = st.rows.map((r, i) => r.b.s < 0 ? i : -1).filter(i => i >= 0);
      if (!inf.length) { if (end) steps.push({ ...st, kind: 'end', p: null, q: null, terminal: 'optimal' }); return { st, status: 'optimal', bland }; }
      let p = inf[0];
      inf.forEach(i => {
        if (bland) { if (st.basis[i] < st.basis[p]) p = i; }
        else if (st.rows[i].b.lt(st.rows[p].b) || (st.rows[i].b.eq(st.rows[p].b) && st.basis[i] < st.basis[p])) p = i;
      });
      const tieRows = inf.filter(i => i !== p && st.rows[i].b.eq(st.rows[p].b));
      const negs = st.cols.filter(j => st.rows[p].a[j].s < 0);
      if (!negs.length) { if (end) steps.push({ ...st, kind: 'end', p, q: null, inf, terminal: 'infeasible' }); return { st, status: 'infeasible', bland, row: p, inf }; }
      const ratios = []; st.cols.forEach(j => { ratios[j] = st.rows[p].a[j].s < 0 ? st.z.a[j].div(st.rows[p].a[j].neg()) : null; });
      let q = negs[0];
      negs.forEach(j => { if (ratios[j].lt(ratios[q])) q = j; });
      const tieCols = negs.filter(j => j !== q && ratios[j].eq(ratios[q]));
      steps.push({ ...st, kind: 'D', p, q, ratios, inf, negs, tieRows, tieCols, bland });
      st = pivot(st, p, q);
    }
  }

  /* Рабочая форма: min g, равенства в строках, стартовый базис, строка d.
     «≤» → +остаток; «≥» → ×(−1) и +остаток; «=» → базисной делаем переменную, входящую только в эту строку
     (если такой нет — равенство заменяем парой «≤» и «≥»). Базис из равенств выбираем так, чтобы все d ≥ 0. */
  function prepare(pr) {
    const n = pr.n, max = pr.sense === 'max';
    const cc = pr.c.map(v => max ? v.neg() : v);
    const single = pr.rows.map((r, i) => r.s !== '=' ? null : idx(n)
      .filter(j => !r.a[j].isZero() && pr.rows.every((q, k) => k === i || q.a[j].isZero()))
      .sort((x, y) => (cc[x].isZero() ? 0 : 1) - (cc[y].isZero() ? 0 : 1) || x - y));
    const eqRows = idx(pr.rows.length).filter(i => single[i] && single[i].length);
    const feasible = pick => {
      const bs = new Set(pick.values());
      return idx(n).every(k => { if (bs.has(k)) return true; let d = cc[k]; pick.forEach((j, i) => { d = d.sub(cc[j].mul(pr.rows[i].a[k].div(pr.rows[i].a[j]))); }); return d.s >= 0; });
    };
    let pick = null, tries = 0;
    const dfs = (k, cur) => {
      if (k === eqRows.length) { tries++; if (feasible(cur)) { pick = new Map(cur); return true; } return false; }
      for (const j of single[eqRows[k]]) { cur.set(eqRows[k], j); if (dfs(k + 1, cur)) return true; if (tries > 3000) break; }
      cur.delete(eqRows[k]); return false;
    };
    if (!dfs(0, new Map())) pick = new Map(eqRows.map(i => [i, single[i][0]]));

    const work = [];
    pr.rows.forEach((r, i) => {
      if (r.s === '<=') work.push({ src: i, kind: 'le', mult: ONE(), slack: true });
      else if (r.s === '>=') work.push({ src: i, kind: 'ge', mult: ONE().neg(), slack: true });
      else if (pick.has(i)) { const j = pick.get(i); work.push({ src: i, kind: 'eq', mult: ONE().div(r.a[j]), slack: false, basic: j, cands: single[i] }); }
      else { work.push({ src: i, kind: 'eq-le', mult: ONE(), slack: true, part: 0 }); work.push({ src: i, kind: 'eq-ge', mult: ONE().neg(), slack: true, part: 1 }); }
    });
    const vars = idx(n).map(j => ({ kind: 'x', k: j + 1 }));
    work.forEach((w, t) => { if (w.slack) { w.slackVar = vars.length; vars.push({ kind: 's', k: vars.length + 1, row: t, sign: 1 }); } });
    const N = vars.length;
    const rows = work.map(w => {
      const r = pr.rows[w.src], a = idx(N).map(Z);
      r.a.forEach((v, j) => { a[j] = v.mul(w.mult); });
      if (w.slack) a[w.slackVar] = ONE();
      return { b: new QM(r.b.mul(w.mult)), a };
    });
    const basis = work.map(w => w.slack ? w.slackVar : w.basic);
    const label = max ? 'f' : '−f';
    let z = { b: new QM(Z()), a: idx(N).map(j => j < n ? cc[j] : Z()), label };
    const raw = { b: z.b, a: z.a.slice(), label };
    const elim = [];
    basis.forEach((bj, i) => {
      const k = z.a[bj];
      if (!k.isZero()) { elim.push({ i, bj, k, before: z }); z = { b: z.b.sub(rows[i].b.scale(k)), a: z.a.map((v, j) => v.sub(k.mul(rows[i].a[j]))), label }; }
    });
    const base = { rows, z, basis, cols: idx(N), vars, phase: 'D' };
    return { n, max, cc, c0: pr.c0 || null, work, vars, base, raw, elim, single, pick, split: work.filter(w => w.kind === 'eq-le').map(w => w.src) };
  }

  /* Значение таблицы при M = M0 (для чтения ответа). */
  const atM = (st, M0) => ({ ...st, rows: st.rows.map(r => ({ b: r.b.at(M0), a: r.a })), z: { ...st.z, b: st.z.b.at(M0) } });

  function solve(pr) {
    const prep = prepare(pr), base = prep.base, n = pr.n;
    const res = { prep, base, steps: [], status: null, bound: null, last: null };
    res.negD = base.cols.filter(j => base.z.a[j].s < 0);
    res.dualFeasible = !res.negD.length;
    let st = base;
    if (!res.dualFeasible) {
      // искусственное ограничение Σ(небазисных) + s = M возвращает двойственную допустимость
      const nonb = base.cols.filter(j => base.basis.indexOf(j) < 0), sv = base.vars.length;
      const vars = base.vars.concat([{ kind: 's', k: sv + 1, row: base.rows.length, sign: 1, bound: true }]);
      const ext = a => a.concat([Z()]);
      const mrow = { b: new QM(Z(), ONE()), a: base.cols.map(j => nonb.includes(j) ? ONE() : Z()).concat([ONE()]) };
      const tb = { rows: base.rows.map(r => ({ b: r.b, a: ext(r.a) })).concat([mrow]), z: { b: base.z.b, a: ext(base.z.a), label: base.z.label },
        basis: base.basis.concat([sv]), cols: base.cols.concat([sv]), vars, phase: 'D' };
      let q = res.negD[0]; res.negD.forEach(j => { if (tb.z.a[j].lt(tb.z.a[q])) q = j; });
      const p = tb.rows.length - 1;
      res.bound = { nonb, slackVar: sv, row: p, q, table: tb };
      res.steps.push({ ...tb, kind: 'M', p, q, ratios: null, cand: res.negD });
      st = pivot(tb, p, q);
    }
    const lp = runLoop(st, res.steps, true);
    res.status = lp.status; res.bland = lp.bland;
    if (!res.status) res.status = 'cycle';
    res.last = res.steps[res.steps.length - 1];
    res.iters = res.steps.filter(s => s.kind !== 'end').length;
    if (res.status === 'optimal') {
      const last = res.last;
      const zM = last.z.b.m;
      if (res.bound && !zM.isZero()) { res.status = 'unbounded'; res.mCoef = zM; return res; }
      // решение не зависит от M в цели; если координаты зависят от M — берём наименьшее целое M0 ≥ 0, при котором все b ≥ 0
      let M0 = Z();
      last.rows.forEach(r => { if (r.b.m.s > 0) { const t = r.b.a.neg().div(r.b.m); const c = new Q(t.n / t.d + (t.n % t.d !== 0n && t.n > 0n ? 1n : 0n)); if (c.gt(M0)) M0 = c; } });
      res.M0 = M0; res.dependsOnM = last.rows.some(r => r.b.hasM());
      const T = atM(last, M0);
      res.table = T;
      const all = last.vars.map(() => Z());
      T.basis.forEach((bj, i) => { all[bj] = T.rows[i].b; });
      res.all = all;
      res.x = all.slice(0, n);
      const g = T.z.b;
      const fl = pr.sense === 'max' ? g : g.neg();
      res.f = pr.c0 ? fl.add(pr.c0) : fl;
      const real = res.bound ? last.cols.filter(j => j !== res.bound.slackVar) : last.cols;
      res.alt = real.filter(j => last.basis.indexOf(j) < 0 && last.z.a[j].isZero());
      res.degenerate = T.rows.some((r, i) => r.b.isZero() && !(res.bound && T.basis[i] === res.bound.slackVar));
      if (res.alt.length) {
        const j = res.alt[0]; let p = null, best = null;
        T.rows.forEach((r, i) => { if (r.a[j].s > 0) { const t = r.b.div(r.a[j]); if (p === null || t.lt(best)) { p = i; best = t; } } });
        if (p === null) res.altInfo = { j, ray: true };
        else {
          const x2 = all.slice();
          T.rows.forEach((r, i) => { x2[T.basis[i]] = r.b.sub(r.a[j].mul(best)); });
          x2[j] = best;
          res.altInfo = { j, p, theta: best, same: best.isZero(), x: x2.slice(0, n) };
        }
      }
    } else if (res.status === 'infeasible') {
      res.row = res.last.p;
    }
    return res;
  }

  return { solve, prepare, pivot, runLoop, atM, check, value };
})();

/* =====================================================================
   3в. НОВЫЕ АЛГОРИТМЫ: транспортная задача, сетевое планирование, матричные игры,
   каноническая форма, метод Гомори, проверка оптимальности и теоремы двойственности.
   Все функции возвращают трассу шагов; арифметика — точные дроби Q.
   ===================================================================== */

/* ---------- Транспортная задача (метод потенциалов) ---------- */
const ALGT = (() => {
  const sum = xs => xs.reduce((s, v) => s.add(v), Z());
  const idx = n => [...Array(n).keys()];

  /* Модель сборника/РГР: Σⱼ xᵢⱼ ≤ aᵢ, Σᵢ xᵢⱼ ≥ bⱼ. Если запасы больше спроса — вводим фиктивного потребителя с нулевыми тарифами.
     mode 'short' — запасов не хватает: вводим фиктивного поставщика (недопоставка), только для справки. */
  function prepare(inp, mode) {
    const a = inp.a.map(Q.of), b = inp.b.map(Q.of), c = inp.c.map(r => r.map(Q.of));
    const P = { m: a.length, n: b.length, a: a.slice(), b: b.slice(), c: c.map(r => r.slice()), m0: a.length, n0: b.length, fict: null, sa: sum(a), sb: sum(b) };
    if (P.sa.lt(P.sb)) {
      if (mode !== 'short') { P.status = 'infeasible'; return P; }
      P.fict = 'row'; P.m++; P.a.push(P.sb.sub(P.sa)); P.c.push(new Array(P.n).fill(null).map(Z));
    } else if (P.sa.gt(P.sb)) { P.fict = 'col'; P.n++; P.b.push(P.sa.sub(P.sb)); P.c.forEach(r => r.push(Z())); }
    P.status = 'ok';
    return P;
  }
  const cost = (P, X) => { let s = Z(); for (let i = 0; i < P.m; i++) for (let j = 0; j < P.n; j++) if (X[i][j]) s = s.add(X[i][j].mul(P.c[i][j])); return s; };
  const emptyX = P => idx(P.m).map(() => new Array(P.n).fill(null));

  /* Северо-западный угол. При одновременном обнулении запаса и спроса вычёркиваем только строку (в базисе остаётся нулевая перевозка). */
  function nw(P) {
    const a = P.a.slice(), b = P.b.slice(), steps = [], cells = [];
    let i = 0, j = 0;
    while (i < P.m && j < P.n) {
      const x = a[i].lt(b[j]) ? a[i] : b[j];
      const st = { i, j, x, a0: a[i], b0: b[j] };
      a[i] = a[i].sub(x); b[j] = b[j].sub(x);
      st.a1 = a[i]; st.b1 = b[j];
      cells.push({ i, j, x });
      if (a[i].isZero() && i < P.m - 1) { st.elim = 'row'; st.both = b[j].isZero(); i++; }
      else if (b[j].isZero()) { st.elim = 'col'; j++; }
      else { st.elim = 'row'; i++; }
      steps.push(st);
    }
    return { steps, cells };
  }

  /* Минимальная стоимость: каждый раз берём самую дешёвую клетку среди невычеркнутых строк и столбцов. */
  function minCost(P) {
    const a = P.a.slice(), b = P.b.slice(), steps = [], cells = [];
    const rows = new Set(idx(P.m)), cols = new Set(idx(P.n));
    while (rows.size && cols.size) {
      let bi = -1, bj = -1; const cand = [];
      rows.forEach(i => cols.forEach(j => { cand.push([i, j]); if (bi < 0 || P.c[i][j].lt(P.c[bi][bj]) || (P.c[i][j].eq(P.c[bi][bj]) && (i < bi || (i === bi && j < bj)))) { bi = i; bj = j; } }));
      const x = a[bi].lt(b[bj]) ? a[bi] : b[bj];
      const st = { i: bi, j: bj, x, a0: a[bi], b0: b[bj], c: P.c[bi][bj], ties: cand.filter(([i, j]) => (i !== bi || j !== bj) && P.c[i][j].eq(P.c[bi][bj])), alive: [[...rows], [...cols]] };
      a[bi] = a[bi].sub(x); b[bj] = b[bj].sub(x); st.a1 = a[bi]; st.b1 = b[bj];
      cells.push({ i: bi, j: bj, x });
      const ra = a[bi].isZero(), cb = b[bj].isZero();
      if (ra && cb) { if (rows.size > 1) { st.elim = 'row'; st.both = true; rows.delete(bi); } else { st.elim = 'col'; st.both = true; cols.delete(bj); } }
      else if (ra) { st.elim = 'row'; rows.delete(bi); } else { st.elim = 'col'; cols.delete(bj); }
      steps.push(st);
    }
    return { steps, cells };
  }

  /* Достройка до m+n−1 базисных клеток нулевыми перевозками (без циклов). */
  function complete(P, cells) {
    const par = idx(P.m + P.n); const find = x => par[x] === x ? x : (par[x] = find(par[x]));
    const out = cells.map(c => ({ ...c })); const added = [];
    out.forEach(c => { par[find(c.i)] = find(P.m + c.j); });
    const all = []; for (let i = 0; i < P.m; i++) for (let j = 0; j < P.n; j++) all.push([i, j]);
    all.sort((p, q) => P.c[p[0]][p[1]].cmp(P.c[q[0]][q[1]]) || p[0] - q[0] || p[1] - q[1]);
    for (const [i, j] of all) {
      if (out.length >= P.m + P.n - 1) break;
      if (out.some(c => c.i === i && c.j === j)) continue;
      if (find(i) !== find(P.m + j)) { par[find(i)] = find(P.m + j); out.push({ i, j, x: Z(), added: true }); added.push([i, j]); }
    }
    return { cells: out, added };
  }

  /* Потенциалы: u₁ = 0, uᵢ + vⱼ = cᵢⱼ в базисных клетках. order — порядок вычисления (для анимации). */
  function potentials(P, cells) {
    const u = new Array(P.m).fill(null), v = new Array(P.n).fill(null), order = [];
    u[0] = Z(); order.push({ kind: 'u', k: 0, val: Z(), start: true });
    let go = true;
    while (go) {
      go = false;
      for (const c of cells) {
        if (u[c.i] !== null && v[c.j] === null) { v[c.j] = P.c[c.i][c.j].sub(u[c.i]); order.push({ kind: 'v', k: c.j, from: [c.i, c.j], val: v[c.j] }); go = true; }
        else if (u[c.i] === null && v[c.j] !== null) { u[c.i] = P.c[c.i][c.j].sub(v[c.j]); order.push({ kind: 'u', k: c.i, from: [c.i, c.j], val: u[c.i] }); go = true; }
      }
    }
    return { u, v, order };
  }

  /* Цикл пересчёта для свободной клетки (ei, ej): путь по базисным клеткам от строки ei к столбцу ej. */
  function cycle(P, cells, ei, ej) {
    const prev = new Map(), q = [`r${ei}`]; prev.set(`r${ei}`, null);
    while (q.length) {
      const nd = q.shift();
      if (nd === `c${ej}`) break;
      const isRow = nd[0] === 'r', k = +nd.slice(1);
      cells.forEach(c => {
        const [from, to] = isRow ? [c.i, `c${c.j}`] : [c.j, `r${c.i}`];
        if (from === k && !prev.has(to)) { prev.set(to, [nd, c]); q.push(to); }
      });
    }
    const path = []; let nd = `c${ej}`;
    while (prev.get(nd)) { const [p, c] = prev.get(nd); path.unshift(c); nd = p; }
    const cyc = [{ i: ei, j: ej, sign: '+' }];
    path.forEach((c, k) => cyc.push({ i: c.i, j: c.j, sign: k % 2 === 0 ? '−' : '+' }));
    return cyc;
  }

  function solve(inp, init = 'nw', mode) {
    const P = prepare(inp, mode), res = { P, init, status: P.status, iters: [] };
    if (P.status !== 'ok') return res;
    const first = init === 'mc' ? minCost(P) : nw(P);
    res.first = first;
    const comp = complete(P, first.cells); res.added = comp.added;
    let cells = comp.cells;
    const toX = cs => { const X = emptyX(P); cs.forEach(c => { X[c.i][c.j] = c.x; }); return X; };
    res.X0 = toX(cells); res.cost0 = cost(P, res.X0);
    for (let it = 0; it < 500; it++) {
      const X = toX(cells), pot = potentials(P, cells);
      const delta = idx(P.m).map(i => idx(P.n).map(j => X[i][j] === null ? P.c[i][j].sub(pot.u[i].add(pot.v[j])) : null));
      let be = null;
      for (let i = 0; i < P.m; i++) for (let j = 0; j < P.n; j++) if (delta[i][j] !== null && delta[i][j].s < 0 && (be === null || delta[i][j].lt(delta[be[0]][be[1]]))) be = [i, j];
      const step = { X, cells: cells.map(c => ({ ...c })), pot, delta, cost: cost(P, X) };
      if (!be) { res.iters.push(step); res.status = 'optimal'; break; }
      const cyc = cycle(P, cells, be[0], be[1]);
      const minus = cyc.filter(c => c.sign === '−');
      const theta = minus.reduce((t, c) => X[c.i][c.j].lt(t) ? X[c.i][c.j] : t, X[minus[0].i][minus[0].j]);
      const cand = minus.filter(c => X[c.i][c.j].eq(theta)).sort((p, q) => p.i - q.i || p.j - q.j);
      const leave = cand[0];
      Object.assign(step, { enter: be, cyc, theta, leave, ties: cand.slice(1), gain: theta.mul(delta[be[0]][be[1]]) });
      res.iters.push(step);
      const nx = cells.filter(c => !(c.i === leave.i && c.j === leave.j)).map(c => {
        const f = cyc.find(z => z.i === c.i && z.j === c.j);
        return f ? { i: c.i, j: c.j, x: f.sign === '+' ? c.x.add(theta) : c.x.sub(theta) } : { ...c };
      });
      nx.push({ i: be[0], j: be[1], x: theta });
      cells = nx;
    }
    if (res.status === 'optimal') {
      const last = res.iters[res.iters.length - 1];
      res.X = last.X; res.cost = last.cost; res.pot = last.pot; res.delta = last.delta;
      res.alt = []; last.delta.forEach((r, i) => r.forEach((d, j) => { if (d !== null && d.isZero()) res.alt.push([i, j]); }));
      res.degenerate = last.cells.some(c => c.x.isZero());
      res.plan = idx(P.m0).map(i => idx(P.n0).map(j => last.X[i][j] ? last.X[i][j] : Z()));
    }
    return res;
  }

  /* Проверка плана по условию: Σⱼ xᵢⱼ ≤ aᵢ, Σᵢ xᵢⱼ ≥ bⱼ, xᵢⱼ ≥ 0. */
  function check(inp, plan) {
    const a = inp.a.map(Q.of), b = inp.b.map(Q.of), c = inp.c.map(r => r.map(Q.of));
    const rows = a.map((ai, i) => { const s = sum(plan[i]); return { s, ok: s.le(ai), tight: s.eq(ai) }; });
    const cols = b.map((bj, j) => { const s = sum(plan.map(r => r[j])); return { s, ok: s.ge(bj), tight: s.eq(bj) }; });
    let C = Z(); plan.forEach((r, i) => r.forEach((x, j) => { C = C.add(x.mul(c[i][j])); }));
    return { rows, cols, C, ok: rows.every(r => r.ok) && cols.every(c => c.ok) && plan.every(r => r.every(x => x.s >= 0)) };
  }
  return { prepare, nw, minCost, complete, potentials, cycle, solve, check, cost };
})();

/* ---------- Сетевое планирование ---------- */
const ALGN = (() => {
  function solve(arcsIn) {
    const arcs = arcsIn.map(([i, j, d]) => ({ i, j, d: Q.of(d) }));
    const ev = [...new Set(arcs.flatMap(a => [a.i, a.j]))].sort((p, q) => p - q);
    const res = { arcs, events: ev, status: 'ok' };
    if (!arcs.length) { res.status = 'empty'; return res; }
    if (arcs.some(a => a.i === a.j)) { res.status = 'loop'; return res; }
    // топологический порядок (алгоритм Кана)
    const indeg = new Map(ev.map(e => [e, 0])); arcs.forEach(a => indeg.set(a.j, indeg.get(a.j) + 1));
    const order = [], queue = ev.filter(e => indeg.get(e) === 0), left = new Map(indeg);
    while (queue.length) {
      queue.sort((p, q) => p - q); const e = queue.shift(); order.push(e);
      arcs.filter(a => a.i === e).forEach(a => { left.set(a.j, left.get(a.j) - 1); if (left.get(a.j) === 0) queue.push(a.j); });
    }
    if (order.length < ev.length) { res.status = 'cycle'; res.stuck = ev.filter(e => !order.includes(e)); return res; }
    res.order = order;
    const tp = new Map(), fwd = [];
    order.forEach(e => {
      const inc = arcs.filter(a => a.j === e);
      if (!inc.length) { tp.set(e, Z()); fwd.push({ e, inc: [], val: Z() }); return; }
      let best = null;
      inc.forEach(a => { const v = tp.get(a.i).add(a.d); if (best === null || v.gt(best)) best = v; });
      tp.set(e, best); fwd.push({ e, inc: inc.map(a => ({ a, v: tp.get(a.i).add(a.d) })), val: best });
    });
    res.fwd = fwd;
    const sinks = ev.filter(e => !arcs.some(a => a.i === e));
    res.sinks = sinks; res.sources = ev.filter(e => !arcs.some(a => a.j === e));
    let T = Z(); ev.forEach(e => { if (tp.get(e).gt(T)) T = tp.get(e); });
    res.T = T;
    const tn = new Map(), bwd = [];
    [...order].reverse().forEach(e => {
      const out = arcs.filter(a => a.i === e);
      if (!out.length) { tn.set(e, T); bwd.push({ e, out: [], val: T }); return; }
      let best = null;
      out.forEach(a => { const v = tn.get(a.j).sub(a.d); if (best === null || v.lt(best)) best = v; });
      tn.set(e, best); bwd.push({ e, out: out.map(a => ({ a, v: tn.get(a.j).sub(a.d) })), val: best });
    });
    res.bwd = bwd;
    res.tp = ev.map(e => tp.get(e)); res.tn = ev.map(e => tn.get(e));
    res.R = ev.map(e => tn.get(e).sub(tp.get(e)));
    res.arcInfo = arcs.map(a => ({ ...a, full: tn.get(a.j).sub(tp.get(a.i)).sub(a.d), free: tp.get(a.j).sub(tp.get(a.i)).sub(a.d), crit: tn.get(a.j).sub(tp.get(a.i)).sub(a.d).isZero() }));
    // критические пути: цепочки критических работ от события с tp=0 до события с tp=T
    const crit = res.arcInfo.filter(a => a.crit);
    const paths = [];
    const walk = (e, path) => {
      const nxt = crit.filter(a => a.i === e);
      if (!nxt.length) { if (tp.get(e).eq(T)) paths.push(path.slice()); return; }
      nxt.forEach(a => { path.push(a); walk(a.j, path); path.pop(); });
    };
    ev.filter(e => tp.get(e).isZero() && tn.get(e).isZero() && !crit.some(a => a.j === e)).forEach(e => walk(e, []));
    res.paths = paths.filter(p => p.length).slice(0, 12);
    res.critEvents = ev.filter(e => tn.get(e).sub(tp.get(e)).isZero());
    return res;
  }
  return { solve };
})();

/* ---------- Матричные игры ---------- */
const ALGG = (() => {
  function solve(Cin) {
    const C = Cin.map(r => r.map(Q.of)), m = C.length, n = C[0].length, res = { C, m, n };
    res.rowMin = C.map(r => r.reduce((a, v) => v.lt(a) ? v : a));
    res.colMax = [...Array(n).keys()].map(j => C.reduce((a, r) => r[j].gt(a) ? r[j] : a, C[0][j]));
    res.lower = res.rowMin.reduce((a, v) => v.gt(a) ? v : a); res.upper = res.colMax.reduce((a, v) => v.lt(a) ? v : a);
    res.saddle = res.lower.eq(res.upper);
    if (res.saddle) {
      res.value = res.lower; res.points = [];
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (C[i][j].eq(res.value) && res.rowMin[i].eq(res.value) && res.colMax[j].eq(res.value)) res.points.push([i, j]);
      const [i0, j0] = res.points[0];
      res.x = [...Array(m).keys()].map(i => i === i0 ? ONE() : Z()); res.y = [...Array(n).keys()].map(j => j === j0 ? ONE() : Z());
      res.status = 'saddle';
      return res;
    }
    // смешанные стратегии: сдвиг k делает все выигрыши ≥ 1; min Σp, Σᵢ P_ij pᵢ ≥ 1; x = p/Σp, u = 1/Σp − k
    const mn = C.reduce((a, r) => r.reduce((b, v) => v.lt(b) ? v : b, a), C[0][0]);
    res.k = mn.ge(ONE()) ? Z() : ONE().sub(mn);
    res.P = C.map(r => r.map(v => v.add(res.k)));
    res.lp = { n: m, sense: 'min', c: [...Array(m).keys()].map(() => ONE()), rows: [...Array(n).keys()].map(j => ({ a: res.P.map(r => r[j]), s: '>=', b: ONE() })) };
    const sol = ALGD.solve(res.lp); res.sol = sol;
    if (sol.status !== 'optimal') { res.status = 'error'; return res; }
    res.sumP = sol.f; res.vprime = ONE().div(sol.f);
    res.x = sol.x.map(p => p.mul(res.vprime));
    const last = sol.last;
    res.yprime = [...Array(n).keys()].map(j => last.z.a[sol.prep.work[j].slackVar]);
    res.y = res.yprime.map(v => v.mul(res.vprime));
    res.value = res.vprime.sub(res.k);
    res.status = 'mixed';
    return res;
  }
  /* Проверка пары стратегий: выигрыш по каждому столбцу ≥ u, по каждой строке ≤ u. */
  function verify(C, x, y, u) {
    const m = C.length, n = C[0].length;
    const colPay = [...Array(n).keys()].map(j => x.reduce((s, xi, i) => s.add(xi.mul(Q.of(C[i][j]))), Z()));
    const rowPay = [...Array(m).keys()].map(i => y.reduce((s, yj, j) => s.add(yj.mul(Q.of(C[i][j]))), Z()));
    const sx = x.reduce((s, v) => s.add(v), Z()), sy = y.reduce((s, v) => s.add(v), Z());
    return { colPay, rowPay, ok: sx.eq(ONE()) && sy.eq(ONE()) && x.every(v => v.s >= 0) && y.every(v => v.s >= 0) && colPay.every(v => v.ge(u)) && rowPay.every(v => v.le(u)) };
  }
  return { solve, verify };
})();

/* ---------- Каноническая форма (раздел 2.1) ---------- */
const ALGK = (() => {
  const idx = n => [...Array(n).keys()];
  const xh = (k, p = '') => `<i>x</i>${p}<sub>${k}</sub>`;
  const yh = k => `<i>y</i><sub>${k}</sub>`;

  /* Условия на переменные: нижняя и верхняя границы. Нет условий — переменная свободна. */
  function analyze(pr) {
    const info = idx(pr.n).map(j => ({ j, lo: null, hi: null }));
    (pr.bounds || []).forEach(B => { const t = info[B.j]; if (B.s === '>=') t.lo = t.lo === null || B.b.gt(t.lo) ? B.b : t.lo; else if (B.s === '<=') t.hi = t.hi === null || B.b.lt(t.hi) ? B.b : t.hi; });
    info.forEach(t => {
      if (t.lo !== null && t.hi !== null) t.kind = t.lo.gt(t.hi) ? 'conflict' : t.lo.eq(t.hi) ? 'fixed' : 'box';
      else if (t.lo !== null) t.kind = t.lo.isZero() ? 'nonneg' : 'ge';
      else if (t.hi !== null) t.kind = 'le';
      else t.kind = 'free';
    });
    return info;
  }

  const clone = S => ({ obj: { sense: S.obj.sense, c0: S.obj.c0, label: S.obj.label, terms: S.obj.terms.map(t => ({ ...t })) },
    rows: S.rows.map(r => ({ terms: r.terms.map(t => ({ ...t })), s: r.s, b: r.b, note: r.note })), conds: S.conds.map(c => ({ ...c })) });
  const merge = terms => { const out = []; terms.forEach(t => { const f = out.find(o => o.v === t.v); if (f) f.c = f.c.add(t.c); else out.push({ ...t }); }); return out.filter(t => !t.c.isZero()); };
  function substitute(terms, id, expr) {
    const out = []; let konst = Z();
    terms.forEach(t => { if (t.v !== id) out.push(t); else { expr.terms.forEach(e => out.push({ c: t.c.mul(e.c), v: e.v })); konst = konst.add(t.c.mul(expr.konst)); } });
    return { terms: merge(out), konst };
  }

  function convert(pr) {
    const n = pr.n, info = analyze(pr), res = { info, steps: [], status: 'ok' };
    const html = {};
    idx(n).forEach(j => { html['x' + (j + 1)] = xh(j + 1); });
    const condText = t => {
      const x = xh(t.j + 1), c = v => v.toText();
      const h = t.kind === 'free' ? `${x} — без ограничений на знак` : t.kind === 'box' || t.kind === 'fixed' ? `${c(t.lo)} ≤ ${x} ≤ ${c(t.hi)}` : t.kind === 'conflict' ? `${x} ≥ ${c(t.lo)} и ${x} ≤ ${c(t.hi)} — противоречие` : t.kind === 'le' ? `${x} ≤ ${c(t.hi)}` : `${x} ≥ ${c(t.lo)}`;
      return { kind: 'orig', src: t.j, html: h };
    };
    const S = { obj: { sense: pr.sense, c0: pr.c0 || Z(), label: 'L', terms: pr.c.map((c, j) => ({ c, v: 'x' + (j + 1) })).filter(t => !t.c.isZero()) },
      rows: pr.rows.map(r => ({ terms: r.a.map((c, j) => ({ c, v: 'x' + (j + 1) })).filter(t => !t.c.isZero()), s: r.s, b: r.b })), conds: info.map(condText) };
    res.html = html; res.state0 = clone(S);
    if (info.some(t => t.kind === 'conflict')) { res.status = 'conflict'; res.conflicts = info.filter(t => t.kind === 'conflict').map(t => t.j); res.steps.push({ kind: 'conflict', state: clone(S) }); return res; }
    // 1. дополнительные переменные: «≤» → +y, «≥» → −y
    let yk = 0; const slackOf = [];
    S.rows.forEach((r, i) => {
      if (r.s === '=') { slackOf[i] = null; return; }
      yk++; const id = 'y' + yk; html[id] = yh(yk); slackOf[i] = id;
      r.terms.push({ c: r.s === '<=' ? ONE() : ONE().neg(), v: id }); r.note = { from: r.s, y: id }; r.s = '=';
      S.conds.push({ kind: 'slack', html: `${html[id]} ≥ 0`, v: id });
    });
    res.steps.push({ kind: 'slack', state: clone(S), slackOf });
    // 2. условия неотрицательности: подстановки по переменным
    const back = idx(n).map(j => ({ konst: Z(), terms: [{ c: ONE(), v: 'x' + (j + 1) }] }));
    let wk = 0;
    for (const t of info) {
      if (t.kind === 'nonneg') continue;
      const j = t.j, id = 'x' + (j + 1), nid = id + 'p';
      let expr, text;
      if (t.kind === 'ge' || t.kind === 'box') { html[nid] = xh(j + 1, '′'); expr = { konst: t.lo, terms: [{ c: ONE(), v: nid }] }; text = `${html[id]} = ${html[nid]} ${t.lo.s < 0 ? '−' : '+'} ${t.lo.abs().toText()}`; }
      else if (t.kind === 'le') { html[nid] = xh(j + 1, '′'); expr = { konst: t.hi, terms: [{ c: ONE().neg(), v: nid }] }; text = `${html[id]} = ${t.hi.toText()} − ${html[nid]}`; }
      else if (t.kind === 'free') { const b2 = id + 'pp'; html[nid] = xh(j + 1, '′'); html[b2] = xh(j + 1, '″'); expr = { konst: Z(), terms: [{ c: ONE(), v: nid }, { c: ONE().neg(), v: b2 }] }; text = `${html[id]} = ${html[nid]} − ${html[b2]}`; }
      else { expr = { konst: t.lo, terms: [] }; text = `${html[id]} = ${t.lo.toText()}`; }
      const before = clone(S);
      const o = substitute(S.obj.terms, id, expr); S.obj.terms = o.terms; S.obj.c0 = S.obj.c0.add(o.konst);
      S.rows.forEach(r => { const q = substitute(r.terms, id, expr); r.terms = q.terms; r.b = r.b.sub(q.konst); });
      S.conds = S.conds.filter(c => c.src !== j);
      expr.terms.forEach(e => S.conds.push({ kind: 'new', html: `${html[e.v]} ≥ 0`, v: e.v }));
      let boxRow = null;
      if (t.kind === 'box') {
        wk++; const wid = 'w' + wk; html[wid] = `<i>w</i><sub>${wk}</sub>`;
        boxRow = { terms: [{ c: ONE(), v: nid }, { c: ONE(), v: wid }], s: '=', b: t.hi.sub(t.lo), note: { box: true, y: wid, from: '<=' } };
        S.rows.push(boxRow); S.conds.push({ kind: 'new', html: `${html[wid]} ≥ 0`, v: wid });
      }
      back.forEach(bk => { const q = substitute(bk.terms, id, expr); bk.terms = q.terms; bk.konst = bk.konst.add(q.konst); });
      res.steps.push({ kind: 'subst', j, vkind: t.kind, text, expr, state: clone(S), before, boxRow: boxRow ? { ...boxRow } : null });
    }
    // 3. цель на минимум
    if (pr.sense === 'max') {
      const before = clone(S);
      S.obj.terms = S.obj.terms.map(tm => ({ c: tm.c.neg(), v: tm.v })); S.obj.c0 = S.obj.c0.neg(); S.obj.sense = 'min'; S.obj.label = 'L′';
      res.steps.push({ kind: 'min', state: clone(S), before });
    } else res.steps.push({ kind: 'min', state: clone(S), before: clone(S), same: true });
    // итог: порядок переменных x…, y…, w…
    const keys = Object.keys(html).filter(k => S.rows.some(r => r.terms.some(t => t.v === k)) || S.obj.terms.some(t => t.v === k) || S.conds.some(c => c.v === k));
    const vorder = []; ['x', 'y', 'w'].forEach(p => keys.filter(k => k[0] === p).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)) || a.length - b.length).forEach(k => vorder.push(k)));
    res.vars = vorder; res.final = S; res.back = back;
    res.canon = { n: vorder.length, sense: 'min', c: vorder.map(v => { const t = S.obj.terms.find(z => z.v === v); return t ? t.c : Z(); }), c0: S.obj.c0.isZero() ? undefined : S.obj.c0,
      rows: S.rows.map(r => ({ a: vorder.map(v => { const t = r.terms.find(z => z.v === v); return t ? t.c : Z(); }), s: '=', b: r.b })) };
    return res;
  }

  /* Решаем исходную и каноническую задачи независимо и сверяем оптимумы; ответ канонической переводим обратно в x. */
  function verify(pr, cv) {
    if (cv.status !== 'ok') return { status: cv.status };
    const P = ALGZ.normalize(pr), o = ALGZ.solve(P), c = ALG.twoPhase(cv.canon);
    const out = { orig: o, canon: c, status: 'ok', sameStatus: o.status === c.status };
    if (o.status === 'optimal' && c.status === 'optimal') {
      const zmap = {}; cv.vars.forEach((v, k) => { zmap[v] = c.x[k]; });
      const x = cv.back.map(bk => bk.terms.reduce((s, t) => s.add(t.c.mul(zmap[t.v] || Z())), bk.konst));
      out.x = x; out.zmap = zmap; out.Lcanon = c.f;
      out.L = pr.sense === 'max' ? c.f.neg() : c.f;
      out.fx = ALGZ.fv(pr, x);
      const inRows = ALG.check(pr, x).every(k => k.ok);
      const inBounds = (pr.bounds || []).every(B => B.s === '>=' ? x[B.j].ge(B.b) : B.s === '<=' ? x[B.j].le(B.b) : x[B.j].eq(B.b));
      out.feasible = inRows && inBounds;
      out.sameValue = out.L.eq(o.f) && out.fx.eq(o.f);
    }
    return out;
  }
  return { analyze, convert, verify };
})();

/* ---------- Метод Гомори ---------- */
const ALGI = (() => {
  const fl = q => { const f = q.n / q.d; return new Q(q.n < 0n && q.n % q.d !== 0n ? f - 1n : f); };
  const frac = q => q.sub(fl(q));
  const lcm = (a, b) => { const g = Q.gcd(a, b); return a / g * b; };

  /* Умножаем строки на НОК знаменателей: тогда добавочные переменные тоже целые. */
  function integerize(pr) {
    const scales = pr.rows.map(r => { let l = 1n; [...r.a, r.b].forEach(v => { l = lcm(l, v.d); }); return new Q(l); });
    const rows = pr.rows.map((r, i) => ({ a: r.a.map(v => v.mul(scales[i])), s: r.s, b: r.b.mul(scales[i]) }));
    return { pr: { ...pr, rows }, scales, changed: scales.some(s => !s.eq(ONE())) };
  }
  const toDual = st => ({ rows: st.rows.map(r => ({ b: new QM(r.b), a: r.a.slice() })), z: { b: new QM(st.z.b), a: st.z.a.slice(), label: st.z.label }, basis: st.basis.slice(), cols: st.cols.slice(), vars: st.vars.slice(), phase: 'D' });

  /* rule: 'max' — строка с наибольшей дробной частью (как в сборнике), 'first' / 'min' — для сравнения. */
  function solve(prIn, rule = 'max', MAXC = 60) {
    const info = integerize(prIn), pr = info.pr;
    const res = { info, pr, steps: [], status: null, cuts: 0 };
    const lp = ALG.twoPhase(pr); res.lp = lp;
    if (lp.status !== 'optimal') { res.status = lp.status; return res; }
    res.lpX = lp.x; res.lpF = lp.f;
    let st = toDual(lp.last);
    for (let round = 0; round <= MAXC; round++) {
      const fr = st.rows.map((r, i) => ({ i, f: frac(r.b.a) })).filter(o => !o.f.isZero());
      if (!fr.length) { res.steps.push({ ...st, kind: 'end', p: null, q: null, terminal: 'optimal' }); res.status = 'optimal'; break; }
      if (round === MAXC) { res.steps.push({ ...st, kind: 'end', p: null, q: null, terminal: 'limit' }); res.status = 'limit'; break; }
      let best = fr[0];
      if (rule === 'first') fr.forEach(o => { if (st.basis[o.i] < st.basis[best.i]) best = o; });
      else if (rule === 'min') fr.forEach(o => { if (o.f.lt(best.f) || (o.f.eq(best.f) && st.basis[o.i] < st.basis[best.i])) best = o; });
      else fr.forEach(o => { if (o.f.gt(best.f) || (o.f.eq(best.f) && st.basis[o.i] < st.basis[best.i])) best = o; });
      const r = st.rows[best.i];
      const parts = st.cols.filter(j => st.basis.indexOf(j) < 0).map(j => ({ j, a: r.a[j], f: frac(r.a[j]) }));
      const cut = { row: best.i, fb: best.f, b: r.b.a, parts, fracRows: fr, id: res.cuts + 1 };
      res.steps.push({ ...st, kind: 'cut', p: best.i, q: null, cut });
      // новая строка: −Σ{a}·x + S = −{b}
      const sv = st.vars.length, vars = st.vars.concat([{ kind: 's', k: sv + 1, row: st.rows.length, sign: 1, cut: cut.id }]);
      const ext = a => { const o = a.slice(); o[sv] = Z(); return o; };
      const na = new Array(sv + 1).fill(null).map(Z); parts.forEach(pt => { na[pt.j] = pt.f.neg(); }); na[sv] = ONE();
      const nt = { rows: st.rows.map(rr => ({ b: rr.b, a: ext(rr.a) })).concat([{ b: new QM(best.f.neg()), a: na }]), z: { b: st.z.b, a: ext(st.z.a), label: st.z.label },
        basis: st.basis.concat([sv]), cols: st.cols.concat([sv]), vars, phase: 'D' };
      res.cuts++;
      const lp2 = ALGD.runLoop(nt, res.steps, true);
      if (lp2.status === 'infeasible') { res.status = 'noint'; break; }
      if (lp2.status === 'cycle') { res.status = 'cycle'; break; }
      st = lp2.st; res.steps.pop();   // убираем шаг-итог: следующая запись начнётся с этой же таблицы
    }
    res.last = res.steps[res.steps.length - 1];
    if (res.status === 'optimal') {
      const T = res.last, n = prIn.n;
      const all = T.vars.map(() => Z()); T.basis.forEach((bj, i) => { all[bj] = T.rows[i].b.a; });
      res.all = all; res.x = all.slice(0, n);
      const g = T.z.b.a, f = pr.sense === 'max' ? g : g.neg();
      res.f = pr.c0 ? f.add(pr.c0) : f;
    }
    return res;
  }

  /* Независимая проверка ветвями и границами (для сверки, если отсечения не сошлись). */
  function bnb(pr, maxNodes = 4000) {
    const n = pr.n, max = pr.sense === 'max'; let best = null, nodes = 0, status = 'noint';
    const rec = extra => {
      if (++nodes > maxNodes) return;
      const p2 = { ...pr, rows: pr.rows.concat(extra) };
      const r = ALG.twoPhase(p2);
      if (r.status === 'unbounded') { status = 'unbounded'; return; }
      if (r.status !== 'optimal') return;
      if (best && (max ? r.f.le(best.f) : r.f.ge(best.f))) return;
      const j = r.x.findIndex(v => !v.isInt());
      if (j < 0) { best = { x: r.x, f: r.f }; return; }
      const mk = (s, b) => { const a = new Array(n).fill(null).map(Z); a[j] = ONE(); return { a, s, b }; };
      const f = fl(r.x[j]);
      rec(extra.concat([mk('<=', f)])); rec(extra.concat([mk('>=', f.add(ONE()))]));
    };
    rec([]);
    return best ? { status: 'optimal', ...best, nodes } : { status, nodes };
  }
  return { solve, integerize, frac, fl, bnb };
})();

/* ---------- Проверка вектора на оптимальность и теоремы двойственности ---------- */
const ALGX = (() => {
  const idx = n => [...Array(n).keys()];

  /* Дополняющая нежёсткость: допустимый x оптимален тогда и только тогда, когда существует допустимый y, удовлетворяющий УДН. */
  function check(pr, xbar) {
    const P = ALGZ.normalize(pr), D = ALGZ.dualOf(P), n = pr.n, m = pr.rows.length;
    const res = { P, D, x: xbar.map(Q.of) };
    res.rowCheck = ALG.check(pr, res.x);
    res.negative = res.x.map((v, j) => v.s < 0 ? j : -1).filter(j => j >= 0);
    res.fx = ALGZ.fv(pr, res.x);
    res.feasible = res.rowCheck.every(r => r.ok) && !res.negative.length;
    if (!res.feasible) { res.status = 'infeasible'; res.optimal = false; return res; }
    res.zeroY = res.rowCheck.map(r => !r.tight);
    res.eqJ = res.x.map(v => v.s > 0);
    const eqs = [];
    idx(m).forEach(i => { if (res.zeroY[i]) { const a = new Array(m).fill(null).map(Z); a[i] = ONE(); eqs.push({ a, b: Z(), kind: 'y', i }); } });
    idx(n).forEach(j => { if (res.eqJ[j]) eqs.push({ a: D.rows[j].a.slice(), b: D.rows[j].b, kind: 'dual', j }); });
    res.eqs = eqs;
    const rows = D.rows.map((r, j) => ({ a: r.a, s: res.eqJ[j] ? '=' : r.s, b: r.b }));
    idx(m).forEach(i => { if (res.zeroY[i]) { const a = new Array(m).fill(null).map(Z); a[i] = ONE(); rows.push({ a, s: '=', b: Z() }); } });
    const feas = ALGZ.solve({ n: m, sense: 'min', c: new Array(m).fill(null).map(Z), rows, signs: D.signs });
    res.cert = feas;
    res.optimal = feas.status === 'optimal';
    res.y = res.optimal ? feas.x : null;
    res.status = res.optimal ? 'optimal' : 'notoptimal';
    res.gauss = eqs.length ? ALG.gauss(eqs.map(e => e.a), eqs.map(e => e.b), m) : null;
    res.unique = !!res.gauss && res.gauss.status === 'ok' && res.gauss.rank === m;
    if (res.optimal) { const g = D.c.reduce((s, c, i) => s.add(c.mul(res.y[i])), Z()); res.g = D.c0 ? g.add(D.c0) : g; }
    return res;
  }

  /* Теоремы двойственности: решаем исходную задачу, строим двойственную, решаем её и проверяем УДН и равенство оптимумов. */
  function duality(pr) {
    const P = ALGZ.normalize(pr), D = ALGZ.dualOf(P);
    const res = { P, D, primal: ALGD.solve(pr) };
    res.dual = ALGZ.solve(D);
    res.statusP = res.primal.status; res.statusD = res.dual.status;
    if (res.statusP === 'optimal') {
      res.x = res.primal.x; res.L = res.primal.f;
      if (res.statusD === 'optimal') {
        res.y = res.dual.x; res.g = res.dual.f;
        res.equal = res.g.eq(res.L);
        const ck = ALG.check(pr, res.x);
        res.csRows = ck.map((c, i) => ({ y: res.y[i], tight: c.tight, ok: res.y[i].isZero() || c.tight }));
        const lhs = D.rows.map(r => r.a.reduce((s, a, i) => s.add(a.mul(res.y[i])), Z()));
        res.csCols = D.rows.map((r, j) => ({ x: res.x[j], tight: lhs[j].eq(r.b), lhs: lhs[j], ok: res.x[j].isZero() || lhs[j].eq(r.b) }));
        res.cs = res.csRows.every(r => r.ok) && res.csCols.every(c => c.ok);
      }
    }
    return res;
  }
  /* Допустимость и значение цели для заданного вектора u двойственной задачи D. */
  function checkDual(D, u) {
    const y = u.map(Q.of);
    if (y.length !== D.n) return { ok: false, len: true };
    const lhs = D.rows.map(r => r.a.reduce((s, a, i) => s.add(a.mul(y[i])), Z()));
    const feas = lhs.every((v, j) => { const r = D.rows[j]; return r.s === '>=' ? v.ge(r.b) : r.s === '<=' ? v.le(r.b) : v.eq(r.b); }) && y.every((v, i) => D.signs[i] === 'free' || (D.signs[i] === '>=' ? v.s >= 0 : v.s <= 0));
    const g = D.c.reduce((s, c, i) => s.add(c.mul(y[i])), Z());
    return { ok: true, feas, g: D.c0 ? g.add(D.c0) : g, lhs };
  }
  return { check, duality, checkDual };
})();



