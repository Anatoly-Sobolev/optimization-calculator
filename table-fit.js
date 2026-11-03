/* Fit complete mathematical tables to their containers at every screen size. CSS zoom participates
 * in layout, so scaled tables reserve their actual height and stay clickable.
 * No cloned tables: existing step controls and animation handlers are retained. */
(() => {
  'use strict';
  const print=matchMedia('print');
  const watched=new Set();
  let pending=false;
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(fit);}};
  const resize=new ResizeObserver(schedule);
  function fit() {
    pending=false;
    for(const el of watched)if(!el.isConnected){resize.unobserve(el);watched.delete(el);}
    const compact=!print.matches;
    document.querySelectorAll('[data-fit-row]').forEach(row=>{row.style.removeProperty('height');row.removeAttribute('data-fit-row');});
    document.querySelectorAll('[data-fit-heading]').forEach(el=>{el.style.removeProperty('min-height');el.removeAttribute('data-fit-heading');});
    document.querySelectorAll('#solution table, #learning table:not(.flow-in)').forEach(table=>{
      if(!watched.has(table)){watched.add(table);resize.observe(table);}
      const parent=table.parentElement;
      if(!watched.has(parent)){watched.add(parent);resize.observe(parent);}
      table.classList.toggle('mobile-fit-table',compact);
      if(!compact){table.style.removeProperty('zoom');return;}
      if(!table.getClientRects().length||!parent.clientWidth)return;
      const style=getComputedStyle(parent);
      const available=parent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      table.style.removeProperty('zoom');
      if(available>0)for(let pass=0;pass<8;pass++){
        const actual=table.getBoundingClientRect().width,current=parseFloat(table.style.zoom)||1;
        if(!actual||actual<=available-1)break;
        const scale=Math.min(1,current*Math.max(1,available-1)/actual);
        if(Math.abs(current-scale)<.0001)break;
        table.style.zoom=String(scale);
        // Borders and font metrics round differently under zoom; use the rendered
        // box again instead of assuming offsetWidth scales perfectly linearly.
      }
    });
    if(compact)document.querySelectorAll('.pvwrap,.learn-compare,.dmcols,.grid2').forEach(group=>{
      const panels=[...group.children];
      const tables=panels.map(panel=>panel.querySelector('table'));
      if(tables.length!==2||tables.some(t=>!t||!t.getClientRects().length))return;
      // Synchronize only genuinely side-by-side tables, not stacked mobile panels.
      if(Math.abs(panels[0].getBoundingClientRect().top-panels[1].getBoundingClientRect().top)>2)return;
      const scale=Math.min(...tables.map(t=>parseFloat(t.style.zoom)||1));
      tables.forEach(t=>t.style.zoom=String(scale));
      const headings=panels.map(panel=>panel.querySelector('.dmh,h4'));
      if(headings.every(Boolean)){
        const height=Math.max(...headings.map(h=>h.getBoundingClientRect().height));
        headings.forEach(h=>{h.style.minHeight=height+'px';h.dataset.fitHeading='';});
      }
      if(tables[0].rows.length===tables[1].rows.length){
        [...tables[0].rows].forEach((row,i)=>{
          const pair=[row,tables[1].rows[i]],height=Math.max(...pair.map(r=>r.getBoundingClientRect().height))/scale;
          pair.forEach(r=>{r.style.height=height+'px';r.dataset.fitRow='';});
        });
      }
    });
  }
  new MutationObserver(schedule).observe(document.querySelector('main'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
  document.addEventListener('toggle',schedule,true);
  print.addEventListener('change',schedule);
  window.addEventListener('resize',schedule);
  window.addEventListener('beforeprint',()=>{document.querySelectorAll('.mobile-fit-table').forEach(table=>{table.classList.remove('mobile-fit-table');table.style.removeProperty('zoom');});});
  window.addEventListener('afterprint',schedule);
  schedule();
})();
