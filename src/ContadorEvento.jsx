import React,{useEffect,useRef,useState} from 'react';
import {diasParaEvento} from './contador.mjs';
export default function ContadorEvento({evento}){
 const [dias,D]=useState(()=>diasParaEvento(evento.data)),[intro,I]=useState(false),shown=useRef(false);
 useEffect(()=>{const update=()=>D(diasParaEvento(evento.data));update();const timer=setInterval(update,30000);return()=>clearInterval(timer)},[evento.data]);
 useEffect(()=>{
  if(shown.current||!evento.animacao||!evento.contador||evento.status==='cancelado')return;
  shown.current=true;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  I(true);const timer=setTimeout(()=>I(false),3500);return()=>clearTimeout(timer);
 },[evento.animacao,evento.contador,evento.status]);
 if(!evento.contador||evento.status==='cancelado'||!Number.isFinite(dias))return null;
 const title=dias>1?'dias para celebrar!':dias===1?'Amanhã é o grande dia!':dias===0?'Hoje é o grande dia!':'Uma celebração para recordar!';
 const content=<><span className="countdown-spark" aria-hidden="true">✦ ✧ ✦</span>{dias>1&&<strong className="countdown-number">{dias}</strong>}<h2>{title}</h2><p>{dias>0?'Cada dia mais perto de criar boas memórias.':dias===0?'Aproveite cada momento da sua festa.':'Obrigado por celebrar com a gente.'}</p></>;
 return <><section className="countdown-card" aria-label="Contagem regressiva do evento">{content}</section>{intro&&<div className="countdown-intro" role="status" aria-live="polite"><div className="countdown-welcome"><p>{evento.cliente}</p>{content}<button autoFocus className="back" onClick={()=>I(false)}>Ir para meu evento</button></div></div>}</>;
}
