/* Общий выпадающий список. Исходный <select data-dd> остаётся источником данных:
 * он скрыт визуально, а выбор в меню записывается в него и отправляет событие change.
 * DD.enhance(scope) идемпотентна и вызывается после каждой перерисовки интерфейса;
 * глобальные обработчики и единственное открытое меню создаются один раз. */
const DD = (() => {
  'use strict';
  const CHEVRON = '<svg class="dd-chev" viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1 1.5l5 5 5-5"/></svg>';
  const MARGIN = 8, MAX_H = 320;
  let seq = 0, cur = null, typed = '', typedAt = 0;

  const entries = sel => [...sel.querySelectorAll('option, optgroup')].map(el =>
    el.tagName === 'OPTGROUP' ? { group: el.label } : { value: el.value, label: el.textContent, disabled: el.disabled || el.parentElement.disabled });
  const labelOf = sel => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ''; };

  function sync(sel) {
    const w = sel.nextElementSibling; if (!w || !w.classList.contains('dd')) return;
    const b = w.querySelector('.dd-btn');
    b.querySelector('.dd-val').textContent = labelOf(sel); b.title = labelOf(sel);
    b.disabled = sel.disabled;
    if (cur && cur.sel === sel) fill();
  }

  function enhance(scope = document) {
    if (cur && !cur.btn.isConnected) close(false);
    scope.querySelectorAll('select[data-dd]').forEach(sel => {
      if (sel.nextElementSibling && sel.nextElementSibling.classList.contains('dd')) return;
      const id = 'dd' + (++seq), w = document.createElement('div');
      w.className = 'dd';
      w.innerHTML = `<button type="button" class="dd-btn" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-menu"><span class="dd-val"></span>${CHEVRON}</button>`;
      const b = w.firstChild;
      b.dataset.for = sel.id || ''; b.dataset.ddId = id;
      const lab = sel.dataset.ddLabel || (sel.id && document.getElementById('lbl-' + sel.id) ? 'lbl-' + sel.id : '');
      if (lab) b.setAttribute('aria-labelledby', `${lab} ${id}-btn`); else if (sel.getAttribute('aria-label')) b.setAttribute('aria-label', sel.getAttribute('aria-label'));
      sel.classList.add('dd-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
      sel.after(w);
      sel.addEventListener('change', () => sync(sel));
      new MutationObserver(() => sync(sel)).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
      b.addEventListener('click', () => (cur && cur.btn === b ? close(true) : open(sel, b)));
      b.addEventListener('keydown', e => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(sel, b); }
      });
      sync(sel);
    });
  }

  function fill() {
    const { sel, menu } = cur;
    menu.textContent = '';
    cur.items = [];
    entries(sel).forEach((en, i) => {
      if (en.group != null) { const g = document.createElement('div'); g.className = 'dd-grp'; g.setAttribute('role', 'presentation'); g.textContent = en.group; menu.append(g); return; }
      const o = document.createElement('div');
      o.className = 'dd-opt'; o.id = `${cur.id}-o${cur.items.length}`; o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', String(en.value === sel.value)); if (en.disabled) o.setAttribute('aria-disabled', 'true');
      o.textContent = en.label; o.dataset.value = en.value;
      o.addEventListener('click', () => { if (!en.disabled) choose(en.value); });
      menu.append(o); cur.items.push({ el: o, value: en.value, disabled: en.disabled });
    });
    const k = cur.items.findIndex(x => x.value === sel.value);
    activate(cur.active >= 0 && cur.items[cur.active] ? cur.active : (k >= 0 ? k : cur.items.findIndex(x => !x.disabled)), true);
  }

  function activate(i, center) {
    if (!cur || i < 0 || !cur.items[i]) return;
    cur.items.forEach(x => x.el.classList.remove('dd-act'));
    const el = cur.items[i].el; el.classList.add('dd-act'); cur.active = i;
    cur.menu.setAttribute('aria-activedescendant', el.id);
    const m = cur.menu, top = el.offsetTop, bot = top + el.offsetHeight;
    if (center) m.scrollTop = Math.max(0, top - (m.clientHeight - el.offsetHeight) / 2);
    else if (top < m.scrollTop) m.scrollTop = top; else if (bot > m.scrollTop + m.clientHeight) m.scrollTop = bot - m.clientHeight;
  }

  function place() {
    if (!cur) return;
    const { btn, menu } = cur, r = btn.getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
    const w = Math.min(Math.max(r.width, 200), vw - 2 * MARGIN);
    menu.style.width = w + 'px';
    menu.style.left = Math.max(MARGIN, Math.min(r.left, vw - w - MARGIN)) + 'px';
    menu.style.maxHeight = MAX_H + 'px';
    const natural = Math.min(menu.scrollHeight, MAX_H), below = vh - r.bottom - MARGIN - 4, above = r.top - MARGIN - 4;
    const up = below < natural && above > below, room = Math.max(96, Math.min(MAX_H, up ? above : below));
    menu.style.maxHeight = room + 'px';
    const h = Math.min(menu.scrollHeight, room);
    menu.classList.toggle('dd-up', up);
    menu.style.top = Math.max(MARGIN, up ? r.top - h - 4 : r.bottom + 4) + 'px';
  }

  function open(sel, btn) {
    if (cur) close(false);
    if (sel.disabled) return;
    const id = btn.dataset.ddId, menu = document.createElement('div');
    menu.className = 'dd-menu'; menu.id = id + '-menu'; menu.setAttribute('role', 'listbox'); menu.tabIndex = -1;
    menu.setAttribute('aria-labelledby', btn.getAttribute('aria-labelledby') || btn.id);
    cur = { sel, btn, menu, id, items: [], active: -1 };
    fill();
    document.body.append(menu);
    place(); btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
    requestAnimationFrame(() => menu.classList.add('shown'));
    menu.focus({ preventScroll: true });
    menu.addEventListener('keydown', onKey);
    activate(cur.active, true);
  }

  function close(refocus) {
    if (!cur) return;
    const { btn, menu, sel } = cur; cur = null;
    menu.remove(); btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open');
    if (refocus) focusBtn(btn, sel);
  }

  /* После выбора интерфейс может быть перерисован целиком: ищем кнопку по id исходного select. */
  function focusBtn(btn, sel) {
    let t = btn.isConnected ? btn : (sel.id ? document.querySelector(`.dd-btn[data-for="${sel.id}"]`) : null);
    if (t) t.focus({ preventScroll: true });
  }

  function choose(value) {
    const { sel, btn } = cur; close(false);
    if (sel.value !== value) { sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    focusBtn(btn, sel);
  }

  function onKey(e) {
    if (!cur) return;
    const n = cur.items.length, step = d => { let i = cur.active; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!cur.items[i].disabled) return i; } return cur.active; };
    const k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); activate(step(1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); activate(step(-1)); }
    else if (k === 'Home') { e.preventDefault(); activate(cur.items.findIndex(x => !x.disabled)); }
    else if (k === 'End') { e.preventDefault(); let i = n - 1; while (i > 0 && cur.items[i].disabled) i--; activate(i); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); const it = cur.items[cur.active]; if (it && !it.disabled) choose(it.value); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (k === 'Tab') close(true);
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now(); typed = now - typedAt > 700 ? k.toLowerCase() : typed + k.toLowerCase(); typedAt = now;
      const i = cur.items.findIndex(x => !x.disabled && x.el.textContent.toLowerCase().startsWith(typed));
      if (i >= 0) activate(i);
    }
  }

  /* Глобальные обработчики: один набор на всё приложение, независимо от числа перерисовок. */
  document.addEventListener('pointerdown', e => { if (cur && !cur.menu.contains(e.target) && !cur.btn.contains(e.target)) close(false); }, true);
  addEventListener('resize', () => { if (cur) place(); });
  addEventListener('scroll', e => { if (cur && !cur.menu.contains(e.target)) { cur.btn.isConnected ? place() : close(false); } }, true);

  return { enhance, sync };
})();
