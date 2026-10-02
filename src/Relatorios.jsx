import {pode} from './acessos.mjs';
import React,{useEffect,useState} from 'react';
import DataInput from './DataInput.jsx';
import {criarPDF,todos} from './relatorios.mjs';
import {formatDate} from './dates.mjs';
import {hojeSP} from './agenda.mjs';
import {moeda,resumo} from './finance.mjs';
import VisualizarRelatorio from './VisualizarRelatorio.jsx';
export {VisualizarRelatorio};
export default function Relatorios({db,saloes,membros,perfis=[],onClose}){
 const [model,M]=useState(null),[busy,B]=useState(false),[error,E]=useState(''),[sid,S]=useState(saloes[0]?.id||''),[tipo,T]=useState('agenda');
 const [profissionais,P]=useState([]),[loadingProfissionais,LP]=useState(false),[erroProfissionais,EP]=useState('');
 useEffect(()=>{
  if(tipo!=='profissionais')return;
  let active=true;P([]);LP(true);EP('');
  Promise.all([
   todos(()=>db.from('catalogo_salao').select('nome').eq('salao_id',sid).eq('tipo','profissional').eq('ativo',true).order('id')),
   todos(()=>db.from('eventos').select('detalhes').eq('salao_id',sid).order('id'))
  ]).then(([catalogo,eventos])=>{
   const nomes=new Map();
   for(const value of [...catalogo.map(p=>p.nome),...eventos.flatMap(e=>[e.detalhes?.Fotos,e.detalhes?.Filmagem])]){
    const nome=(value||'').trim(),key=nome.toLocaleLowerCase('pt-BR');
    if(nome&&key!=='particular'&&!nomes.has(key))nomes.set(key,nome);
   }
   if(active)P([...nomes].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')));
  }).catch(()=>{if(active)EP('N\u00e3o foi poss\u00edvel carregar os profissionais. Selecione outro relat\u00f3rio e tente novamente.')}).finally(()=>{if(active)LP(false)});
  return()=>{active=false};
 },[db,sid,tipo]);
 const financial=pode(membros,perfis,sid,'financeiro_visualizar');
 async function generate(e){e.preventDefault();const f=new FormData(e.currentTarget),start=f.get('inicio'),end=f.get('fim');E('');if(start>end){E('A data final deve ser igual ou posterior à inicial.');return}B(true);try{
 const events=await todos(()=>db.from('eventos').select('*').eq('salao_id',sid).gte('data',start).lte('data',end).order('data').order('id'));
 const sections=[];let title='Agenda de eventos';
 if(tipo==='financeiro'){if(!financial)throw Error();const [items,pays]=await Promise.all([todos(()=>db.from('itens_evento').select('*').eq('salao_id',sid).order('id')),todos(()=>db.from('pagamentos').select('*').eq('salao_id',sid).order('id'))]);const ids=new Set(events.map(e=>e.id));const total=resumo(items.filter(x=>ids.has(x.evento_id)),pays.filter(x=>ids.has(x.evento_id)));title='Relatório financeiro';sections.push({title:'Totais dos eventos do período',headers:['Contratado','Recebido líquido','Saldo / crédito (-)'],rows:[[moeda(total.total),moeda(total.pago),moeda(total.saldo)]]});sections.push({title:'Posição por evento',headers:['Data','Cliente','Situação','Contratado','Recebido líquido','Saldo'],rows:events.map(e=>{const t=resumo(items.filter(x=>x.evento_id===e.id),pays.filter(x=>x.evento_id===e.id));return [formatDate(e.data),e.cliente,e.status,moeda(t.total),moeda(t.pago),moeda(t.saldo)]})});}
 else if(tipo==='profissionais'){
 title='Eventos por profissional';const term=(f.get('profissional')||'').trim().toLocaleLowerCase('pt-BR');const groups=new Map();
 for(const ev of events.filter(e=>e.status!=='cancelado'&&(!f.has('passados')||e.data<hojeSP()))){
  for(const role of ['Fotos','Filmagem']){const name=(ev.detalhes?.[role]||'').trim();if(!name||name.toLowerCase()==='particular'||(term&&name.toLocaleLowerCase('pt-BR')!==term))continue;const key=name.toLocaleLowerCase('pt-BR');if(!groups.has(key))groups.set(key,{name,events:new Map(),Fotos:0,Filmagem:0});const g=groups.get(key);g[role]++;g.events.set(ev.id,ev)}
 }
 const list=[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 sections.push({title:'Resumo por profissional (eventos cancelados excluídos)',headers:['Profissional','Fotos','Filmagem','Eventos distintos'],rows:list.map(g=>[g.name,g.Fotos,g.Filmagem,g.events.size])});
 for(const g of list)sections.push({title:g.name,headers:['Data','Cliente','Tipo'],rows:[...g.events.values()].map(e=>[formatDate(e.data),e.cliente,e.tipo])});
 }
 else if(tipo==='tarefas'){title='Relatório de tarefas';const tasks=await todos(()=>db.from('tarefas').select('*').eq('salao_id',sid).order('ordem').order('id'));sections.push({title:'Andamento dos eventos',headers:['Data','Cliente','Concluídas / total','Pendências'],rows:events.map(e=>{const t=tasks.filter(x=>x.evento_id===e.id);return [formatDate(e.data),e.cliente,`${t.filter(x=>x.concluida).length} / ${t.length}`,t.filter(x=>!x.concluida).map(x=>x.titulo).join('; ')||'Nenhuma']})})}
 else sections.push({title:`${events.length} eventos no período`,headers:['Data','Cliente','Tipo','Convidados','Situação'],rows:events.map(e=>[formatDate(e.data),e.cliente,e.tipo,e.convidados??'—',e.status])});
 M({title,salaoInfo:saloes.find(s=>s.id===sid),salao:saloes.find(s=>s.id===sid)?.nome||'Salão',subtitle:`Eventos de ${formatDate(start)} a ${formatDate(end)}${tipo==='financeiro'?' · Posição atual; inclui todos os pagamentos desses eventos.':''}`,sections,landscape:tipo!=='agenda'});
 }catch{E('Não foi possível gerar o relatório. Confira sua conexão e suas permissões.')}finally{B(false)}}
 if(model)return <VisualizarRelatorio model={model} onClose={()=>M(null)}/>;
 return <section><button className="back" onClick={onClose}>Voltar à agenda</button><h1>Relatórios</h1><p>Documentos próprios para consulta, PDF e impressão em A4.</p><form className="card" onSubmit={generate}><fieldset disabled={busy}><div className="fields"><label>Salão<select value={sid} onChange={e=>{S(e.target.value);T('agenda')}}>{saloes.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></label><label>Relatório<select value={tipo} onChange={e=>T(e.target.value)}><option value="agenda">Agenda de eventos</option>{pode(membros,perfis,sid,'tarefas_visualizar')&&<option value="tarefas">Tarefas e pendências</option>}<option value="profissionais">Eventos por profissional</option>{financial&&<option value="financeiro">Financeiro por evento</option>}</select></label><label>Data inicial do evento<DataInput name="inicio" required defaultValue={`${hojeSP().slice(0,7)}-01`}/></label><label>Data final do evento<DataInput name="fim" required defaultValue={`${hojeSP().slice(0,4)}-12-31`}/></label></div>{tipo==='profissionais'&&<><label>Profissional<select name="profissional" key={sid} disabled={loadingProfissionais||!!erroProfissionais}><option value="">{loadingProfissionais?'Carregando profissionais...':'Todos os profissionais'}</option>{profissionais.map(([value,nome])=><option key={value} value={value}>{nome}</option>)}</select></label>{erroProfissionais&&<p role="alert" className="error">{erroProfissionais}</p>}<label className="task"><input name="passados" type="checkbox" defaultChecked/>Somente eventos com data anterior a hoje</label><p>A contagem usa a data do evento. Particular e eventos cancelados não entram no relatório.</p></>}{error&&<p role="alert" className="error">{error}</p>}<button>{busy?'Gerando…':'Visualizar relatório'}</button></fieldset></form></section>
}
