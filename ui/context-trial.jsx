import React,{useState} from 'react';
import {ArrowRight,Flag,Undo2} from 'lucide-react';
import {TrialChallenge} from './trial-challenge.jsx';
import {ShippingTrial} from './shipping-trial.jsx';
import {LinearTrial} from './linear-trial.jsx';
import {PayoffBalance} from './teaching-figures.jsx';

function NetworkTrial({net}){
  const [run,setRun]=useState(0);
  const events=[...new Set(net.arcs.flatMap(a=>[a.i,a.j]))].sort((a,b)=>a-b);
  const start=events.find(k=>!net.arcs.some(a=>a.j===k));
  const [event,setEvent]=useState(net.arcs[0].j),[dates,setDates]=useState(()=>Object.fromEntries(events.map(k=>[k,'0'])));
  const day=k=>/^\d+$/.test(dates[k])&&Number.isSafeInteger(+dates[k])?Number(dates[k]):null;
  const incoming=net.arcs.filter(a=>a.j===event);
  const finish=a=>day(a.i)===null?null:day(a.i)+LU.num(a.d);
  const works=net.arcs.filter(a=>finish(a)!==null&&day(a.j)!==null&&finish(a)<=day(a.j));
  const horizon=Math.max(1,day(event)??0,...incoming.map(a=>finish(a)??0));
  const complete=events.every(k=>day(k)!==null)&&works.length===net.arcs.length;
  return <div className="trial-spread"><div><h2>Когда можно начать следующий этап?</h2><p>Работы проекта связаны: следующую можно начать, когда закончились все предыдущие. Назначьте событиям даты и соберите своё расписание. Цель — завершить проект как можно раньше.</p>
    <h3>Ваш календарь событий</h3><div className="event-days">{events.map(k=><button key={k} aria-pressed={k===event} onClick={()=>setEvent(k)}>№ {k}<small>день {dates[k]||'—'}</small></button>)}</div>
    <p className="trial-term">Событие — момент, к которому готовы все входящие работы. Работа {net.arcs[0].i} → {net.arcs[0].j} занимает {LU.txt(net.arcs[0].d)} дн.</p>
    <div className="trial-verdict" role="status"><b>{complete?'Расписание допустимо':'Согласовано работ: '+works.length+' из '+net.arcs.length}</b><span>{complete?'Длительность вашего проекта · '+Math.max(...events.map(day))+' дн.':'Проверьте даты у начала и конца каждой работы.'}</span></div>
  </div><div className="trial-board primer-art"><h3><Flag/> Событие {event}</h3>
    <label className="trial-field">День события {event}<input type="number" min="0" step="1" value={dates[event]} disabled={event===start} onChange={e=>setDates({...dates,[event]:e.target.value})}/></label>
    {event===start?<p>Старт проекта принят за день 0.</p>:<><p>Когда готовы работы, ведущие сюда</p>
      <ul key={run} className="trial-conditions timeline" data-animate={run>0}>{incoming.map((a,k)=><li key={a.i} style={{'--order':k}}><span>{a.i} → {a.j} · {dates[a.i]||'—'} + {LU.txt(a.d)} = {finish(a)??'—'} дн.</span><b data-ok={works.includes(a)}>{works.includes(a)?'Успевает':'Проверить дату'}</b>
      <div><i style={{left:100*(day(a.i)??0)/horizon+'%',width:100*LU.num(a.d)/horizon+'%'}}/>{day(event)!==null&&<em style={{left:100*day(event)/horizon+'%'}}/>}</div></li>)}</ul>
      <small>Полоса начинается в назначенный день предыдущего события. Её длина — длительность. Черта — день выбранного события.</small></>}
    <TrialChallenge onAttempt={()=>setRun(n=>n+1)} label="Испытать расписание" value={Q.of(Math.max(0,...events.map(k=>day(k)??0)))} valid={complete} optimum={net.T} unit=" дн." reason="Работы не успевают к назначенным датам или есть незаполненная дата." steps={['Событий · '+events.length,'Успевают работы · '+works.length+' из '+net.arcs.length]}/>
    {day(event)===null&&<p role="status">Введите целый день от нуля.</p>}</div></div>;
}
function GameTrial({game:g}){
  const [row,setRow]=useState(0),[col,setCol]=useState(0),[rounds,setRounds]=useState([]);
  const [weights,setWeights]=useState(g.C.map((_,i)=>i?'0':'1'));
  const validWeights=weights.every(w=>/^\d{1,12}$/.test(w))&&weights.some(w=>Number(w)>0);
  const counts=validWeights?weights.map(Q.of):null;
  const tickets=counts?.reduce((v,w)=>v.add(w),Q.of(0));
  const expectations=counts?g.C[0].map((_,j)=>counts.reduce((sum,w,i)=>sum.add(w.mul(g.C[i][j])),Q.of(0)).div(tickets)):[];
  const guarantee=expectations.reduce((low,v)=>!low||v.lt(low)?v:low,null);
  const score=g.C[row][col],total=rounds.reduce((sum,[i,j])=>sum.add(g.C[i][j]),Q.of(0));
  function drawTicket(){
    let ticket=Math.random()*LU.num(tickets);
    const choice=counts.findIndex(w=>(ticket-=LU.num(w))<0);
    setRow(choice);setRounds([...rounds,[choice,col]]);
  }
  return <div className="trial-spread"><div><h2>Кто выиграет эту партию?</h2><p>Выберите строку за A и столбец за B. На их пересечении — выигрыш A. Поменяйте один ход и сыграйте ещё раз.</p>
    <div className="reading-grid trial-ledger"><table><caption>Выигрыш игрока A за партию</caption><thead><tr><th>A / B</th>{g.C[0].map((_,j)=><th key={j}>B{j+1}</th>)}</tr></thead>
    <tbody>{g.C.map((r,i)=><tr key={i}><th>A{i+1}</th>{r.map((v,j)=><td key={j}><button aria-label={'A'+(i+1)+', B'+(j+1)} aria-pressed={row===i&&col===j} onClick={()=>{setRow(i);setCol(j);}}>{LU.txt(v)}</button></td>)}</tr>)}</tbody></table></div>
    <p className="trial-term">Стратегия — правило выбора хода. Можно всегда выбирать одну строку или чередовать строки. Положительный результат прибавляется к счёту A, отрицательный уменьшает его.</p>
    <h3>Соберите стратегию игрока A</h3><p>Назначьте строкам билеты: A случайно вытянет один из них. Чем больше билетов у строки, тем чаще она выпадет. Цель — увеличить средний выигрыш даже против самого неудобного ответа B.</p>
    <div className="trial-actions game-weights">{weights.map((w,i)=><label key={i}>Билеты A{LU.sub(i+1)}<input type="number" min="0" step="1" value={w} onChange={e=>setWeights(weights.map((v,k)=>k===i?e.target.value:v))}/></label>)}</div>
    {validWeights?<p className="trial-term">Средний выигрыш A при каждом ответе B: {expectations.map((v,j)=>'B'+LU.sub(j+1)+' · '+LU.txt(v)).join('; ')}.</p>:<p role="status">Задайте целые количества билетов от нуля и хотя бы один билет всего.</p>}
    <TrialChallenge label="Испытать стратегию" enabled={validWeights} value={guarantee} valid={validWeights} optimum={g.value} maximize steps={validWeights?['Билетов · '+LU.txt(tickets),'Худший ответ · B'+LU.sub(expectations.findIndex(v=>v.eq(guarantee))+1),'Гарантия · '+LU.txt(guarantee)]:[]}/></div>
    <div className="trial-board primer-art"><div className="trial-actions">{[['Ход игрока A',g.m,row,setRow],['Ход игрока B',g.n,col,setCol]].map(([label,count,value,set])=><label key={label}>{label}<select value={value} onChange={e=>set(+e.target.value)}>{Array.from({length:count},(_,i)=><option key={i} value={i}>{label.endsWith('A')?'Строка':'Столбец'} {i+1}</option>)}</select></label>)}</div>
    <PayoffBalance value={LU.num(score)} limit={Math.max(1,...g.C.flat().map(v=>Math.abs(LU.num(v))))}/>
    <div className="trial-actions"><button className="trial-primary" onClick={()=>setRounds([...rounds,[row,col]])}>Сыграть партию</button><button disabled={!validWeights} onClick={drawTicket}>Сыграть по билетам</button><button disabled={!rounds.length} onClick={()=>setRounds(rounds.slice(0,-1))}><Undo2/>Отменить</button></div>
    {rounds.length>0&&<div className="round-receipt" key={rounds.length}><span>A{LU.sub(rounds.at(-1)[0]+1)} × B{LU.sub(rounds.at(-1)[1]+1)}</span><i aria-hidden="true">→</i><span>К счёту A · {LU.txt(g.C[rounds.at(-1)[0]][rounds.at(-1)[1]])}</span></div>}
    <div className="trial-verdict" role="status"><b>{rounds.length?'Сыграно партий · '+rounds.length:'Пока сыграно 0 партий'}</b><span>Счёт A · {LU.txt(total)}. Счёт B · {LU.txt(total.neg())}.{rounds.length>0&&' Средний выигрыш A · '+LU.txt(total.div(rounds.length))+'.'}</span></div></div></div>;
}
export function ContextTrial({data,onOpen}){
  return <section className="context-trial" aria-label="Постановка задачи и ваш эксперимент">
    {data.type==='transp'?<ShippingTrial data={data}/>:data.type==='netw'?<NetworkTrial net={data.N}/>:data.type==='game'?<GameTrial game={data.G}/>:<LinearTrial data={data}/>}
    <div className="trial-footer">{data.type!=='transp'&&<span>Можно менять свой вариант и сравнивать результаты.</span>}<button className="trial-primary" onClick={onOpen}>Перейти к методу <ArrowRight/></button></div>
  </section>;
}
