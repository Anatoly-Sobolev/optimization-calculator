import React from 'react';

export const depot=(P,i)=>i<P.m0?'A'+LU.sub(i+1):'Недопоставка';
export const shop=(P,j)=>j<P.n0?'B'+LU.sub(j+1):'Резерв';
export const route=(P,i,j)=>depot(P,i)+' → '+shop(P,j);
export const display=v=>v==null?'·':LU.txt(v);

export function FreightGrid({P,values,rows,cols,caption,rowLabel,colLabel,selected=[],onPick,marks=[],write=false,previous,next,balances=false}){
  const [a,b]=selected;
  return <table className="freight-grid"><caption>{caption}</caption>
    <thead><tr><th scope="col">Склад</th>{cols.map((_,j)=><th key={j} scope="col" data-axis={j===b}>{shop(P,j)}</th>)}<th scope="col">{rowLabel}</th></tr></thead>
    <tbody>{rows.map((value,i)=><tr key={i}><th scope="row" data-axis={i===a}>{depot(P,i)}</th>
      {cols.map((_,j)=>{
        const here=i===a&&j===b,mark=marks.find(m=>m.i===i&&m.j===j);
        return <td key={j} data-selected={here} data-map-route={onPick&&here?'':undefined} data-next={next?.i===i&&next?.j===j} data-closed={balances&&values[i]?.[j]==null&&(rows[i].isZero()||cols[j].isZero())} data-cross={i===a||j===b} data-sign={mark?.sign}>
          {onPick?<button type="button" aria-pressed={here} aria-label={route(P,i,j)+', '+display(values[i][j])+' ящ.'} onClick={()=>onPick([i,j])}>{display(values[i][j])}</button>:
          <span data-write={write&&here?'yes':undefined}>{previous&&mark?<><small className="old-load">было {display(previous[i][j]??0)}</small>{display(values[i][j]??0)}</>:<>{mark&&<small>{mark.sign}</small>}{display(values[i]?.[j])}</>}</span>}
        </td>;
      })}<td data-axis={i===a} data-source={i===a?'stock':undefined}>{display(value)}</td></tr>)}</tbody>
    <tfoot><tr><th scope="row">{colLabel}</th>{cols.map((value,j)=><td key={j} data-axis={j===b} data-source={j===b?'order':undefined}>{display(value)}</td>)}<td/></tr></tfoot>
  </table>;
}
