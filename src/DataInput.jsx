import React,{useRef,useState} from 'react';
import {formatDate,parseDate,maskDate} from './dates.mjs';
export default function DataInput({name,defaultValue='',required=false,onValueChange}){
 const [value,V]=useState(formatDate(defaultValue)),[calendar,C]=useState(false);const text=useRef(null);
 function choose(iso){V(formatDate(iso));text.current?.setCustomValidity('');C(false);text.current?.focus();onValueChange?.(iso)}
 return <span className="date-control"><span className="date-entry"><input ref={text} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" aria-label="Data no formato dia, mês e ano" maxLength={10} required={required} value={value} onChange={e=>{const next=maskDate(e.target.value);V(next);e.target.setCustomValidity(next&&!parseDate(next)?'Informe uma data válida no formato dd/mm/aaaa.':'')}}/><button type="button" className="back calendar-button" aria-label="Abrir calendário" aria-expanded={calendar} onClick={()=>C(!calendar)}>▦</button></span>{calendar&&<Calendar value={parseDate(value)} onChoose={choose} onClose={()=>C(false)}/>}<input type="hidden" name={name} value={parseDate(value)}/></span>;
}
function Calendar({value,onChoose,onClose}){
 const today=new Date(),initial=value?value.split('-').map(Number):[today.getFullYear(),today.getMonth()+1];
 const [year,Y]=useState(initial[0]),[month,M]=useState(initial[1]);
 const first=new Date(year,month-1,1).getDay(),count=new Date(year,month,0).getDate();
 function move(delta){const d=new Date(year,month-1+delta,1);Y(d.getFullYear());M(d.getMonth()+1)}
 return <span className="calendar-pop" role="group" aria-label="Calendário"><span className="calendar-heading"><button type="button" className="back" aria-label="Mês anterior" onClick={()=>move(-1)}>‹</button><span>{new Date(year,month-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span><button type="button" className="back" aria-label="Próximo mês" onClick={()=>move(1)}>›</button></span><span className="calendar-grid">{['D','S','T','Q','Q','S','S'].map((d,i)=><small key={`h${i}`}>{d}</small>)}{Array.from({length:first},(_,i)=><span key={`e${i}`}/>)}{Array.from({length:count},(_,i)=>{const iso=`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return <button type="button" key={iso} aria-label={formatDate(iso)} aria-pressed={value===iso} onClick={()=>onChoose(iso)}>{i+1}</button>})}</span><span className="actions"><button type="button" className="back" onClick={()=>onChoose(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`)}>Hoje</button><button type="button" className="back" onClick={onClose}>Fechar</button></span></span>;
}
