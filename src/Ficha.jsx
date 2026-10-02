import React,{useMemo,useState} from 'react';
import {modeloFicha} from './relatorios.mjs';
import {VisualizarRelatorio} from './Relatorios.jsx';
export default function Ficha({evento,salao,data,financeiro,tarefasVisualizar=true,onClose}){
 const [flags,F]=useState({dados:true,servicos:true,detalhes:true,checklist:tarefasVisualizar,financeiro:false,pagamentos:false,anotacoes:true});
 const options={dados:'Dados do evento',servicos:'Serviços',detalhes:'Detalhes',...(tarefasVisualizar?{checklist:'Checklist'}:{}),...(financeiro?{financeiro:'Resumo financeiro',pagamentos:'Histórico de pagamentos'}:{}),anotacoes:'Anotações'};
 const model=useMemo(()=>modeloFicha(evento,salao,data,flags,financeiro),[evento,salao,data,flags,financeiro]);
 return <><section className="card ficha-options"><h2>Conteúdo da ficha</h2><div className="choice-group">{Object.entries(options).map(([k,label])=><label className="task" key={k}><input type="checkbox" checked={flags[k]} onChange={e=>F(old=>({...old,[k]:e.target.checked,...(k==='pagamentos'&&e.target.checked?{financeiro:true}:{}),...(k==='financeiro'&&!e.target.checked?{pagamentos:false}:{})}))}/>{label}</label>)}</div><p>A ficha e o PDF acompanham as opções marcadas. Checklist e resumo financeiro iniciam em páginas separadas.</p></section><VisualizarRelatorio model={model} onClose={onClose}/></>
}
