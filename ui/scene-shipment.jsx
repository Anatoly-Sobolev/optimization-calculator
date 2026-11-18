import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ShipmentMap} from './shipment-map.jsx';

// The exercise engine renders HTML for each round. Mount the same map used
// in the lesson when that round enters the document, including answer reveals.
function SceneShipment({P,matrix,selected}) {
  const routes=matrix.flatMap((row,i)=>row.flatMap((amount,j)=>amount>0?[[i,j]]:[]));
  const [route,setRoute]=useState(selected??routes[0]??[0,0]);
  const [i,j]=route;
  const panel=useRef(null);
  useEffect(()=>{
    const host=panel.current.closest('shipment-plan');
    const table=host.previousElementSibling?.querySelector('table.sx');
    const cell=table?.tBodies[0]?.rows[i]?.cells[j+1];
    if(!cell)return;
    cell.setAttribute('data-map-route','');
    return ()=>cell.removeAttribute('data-map-route');
  },[i,j]);
  const options=routes.some(([a,b])=>a===i&&b===j)?routes:[route,...routes];
  return <div ref={panel} className="scene-shipment"><label>Показать рейс
    <select value={route.join(',')} onChange={e=>setRoute(e.target.value.split(',').map(Number))}>
      {options.map(([a,b])=><option key={[a,b].join(',')} value={[a,b].join(',')}>{a<P.m0?'Склад '+(a+1):'Недопоставка'} → {b<P.n0?'магазин '+(b+1):'резерв'} · {matrix[a][b]} ящ.</option>)}
    </select></label><ShipmentMap P={P} matrix={matrix} i={i} j={j} isolated/></div>;
}

customElements.define('shipment-plan',class extends HTMLElement {
  connectedCallback() {
    if(this.root)return;
    this.root=createRoot(this);
    this.root.render(<SceneShipment {...JSON.parse(this.dataset.plan)}/>);
  }
  disconnectedCallback() {
    this.root?.unmount();
    this.root=null;
  }
});
