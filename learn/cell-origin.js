/* Preserve the operation while the source cells and the expression still exist. */
const CellOrigin=(()=>{
  const pending=new WeakMap();
  const text=el=>{
    if(!el)return '';
    const copy=el.cloneNode(true);
    copy.querySelectorAll('.fr').forEach(f=>f.replaceWith(f.querySelector('.nu').textContent+'/'+f.querySelector('.de').textContent));
    copy.querySelectorAll('.vtag').forEach(e=>e.remove());
    return copy.textContent.trim();
  };
  function locationOf(cell) {
    const tr=cell.parentElement, table=cell.closest('table');
    const top=table.rows[0]?.cells[cell.cellIndex], left=tr.cells[0];
    return [left!==cell&&(left.tagName==='TH'||left.classList.contains('bas'))?text(left):'Строка '+(tr.sectionRowIndex+1),top!==cell&&text(top)].filter(Boolean).join(' · ');
  }
  function register(cell,entry) {
    if(!cell||!entry)return;
    cell.dataset.origin=entry;cell.tabIndex=0;
  }
  function source(from,to,context) {
    const dest=to?.closest('td');if(!dest||!from)return;
    const calc=from.closest('.pvfm,.tfcalc,.gfm');
    const cell=from.closest('td,th');
    const clue=calc?text(calc):cell?'Из ячейки '+locationOf(cell)+' переносим '+text(from):'Переносим из записи «'+text(from)+'».';
    pending.set(to,[context,clue].filter(Boolean).join(' '));
  }
  function save(el,context) {
    const cell=el?.closest('td');
    if(!cell||!text(el))return;
    const exact=pending.get(el);pending.delete(el);
    if(exact||context){
      register(cell,exact||context);
      if(cell.classList.contains('tcell')){el.dataset.origin=exact||context;el.tabIndex=0;}
      const stage=cell.closest('.dmstage');
      if(stage)cell.dataset.originFrame=stage.dataset.frame;
    }
  }
  function reveal(target) {
    const cell=target.closest('td');if(!cell)return;
    const table=cell.closest('table'), wrapper=table.closest('.tblwrap,.learn-scroll')||table;
    let note=wrapper.nextElementSibling;
    if(!note?.classList.contains('cell-reading')){
      note=document.createElement('aside');note.className='cell-reading';note.setAttribute('aria-live','polite');wrapper.after(note);
    }
    table.querySelectorAll('.origin-selected').forEach(c=>c.classList.remove('origin-selected'));cell.classList.add('origin-selected');
    const title=document.createElement('strong');title.textContent=locationOf(cell)+' · '+text(target);
    const body=document.createElement('span');body.textContent=target.dataset.origin;note.replaceChildren(title,body);
    const root=cell.closest('.demo'), frame=Number(target.dataset.originFrame||cell.dataset.originFrame);
    if(root?.replayCell && frame>0){
      const replay=document.createElement('button');replay.type='button';replay.textContent='Повторить заполнение · кадр '+frame;
      replay.onclick=()=>{root.replayCell(frame);root.querySelector('.dm-next')?.focus({preventScroll:true});};
      note.append(replay);
    }
  }
  document.addEventListener('click',e=>{const cell=e.target.closest?.('[data-origin]');if(cell)reveal(cell);});
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-origin]')){e.preventDefault();reveal(e.target);}});
  document.addEventListener('input',e=>{
    const scene=e.target.closest('.probe-layout,.trace-grid,.delivery');
    scene?.querySelectorAll('.cell-reading').forEach(el=>el.remove());
  });
  return {register,source,save,text};
})();
