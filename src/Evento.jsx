import React,{useEffect,useRef,useState} from 'react';
import DataInput from './DataInput.jsx';
import {formatDate} from './dates.mjs';
import AcoesEvento from './AcoesEvento.jsx';
import TipoEventoSelect from './TipoEventoSelect.jsx';
import ProfissionalSelect from './ProfissionalSelect.jsx';
import {moeda,resumo} from './finance.mjs';
import MoedaInput from './MoedaInput.jsx';

const dataBR=v=>formatDate(v)||'—';
export default function Evento({db,evento,gerente,onClose,onUpdate,onDeleted,iniciarEdicao=false,onLockChange}){
 const [payOpen,PO]=useState(false);
 const [tab,T]=useState('dados'),[editMode,EM]=useState(iniciarEdicao),[wizard,W]=useState(iniciarEdicao);
 const [itens,I]=useState([]),[pagamentos,P]=useState([]),[tarefas,TA]=useState([]),[detalhes,DT]=useState([]),[profissionais,PR]=useState([]);
 const [busy,B]=useState(false),[loaded,LD]=useState(false),[loading,L]=useState(true),[error,E]=useState(''),[success,S]=useState(''),[editing,ED]=useState(null),[version,V]=useState(0),[dirty,D]=useState(false);
 const formRef=useRef(null),destination=useRef(null);
 const tabs=[['dados','Evento'],...(gerente?[['itens','Serviços']]:[]),['detalhes','Detalhes'],...(gerente?[['pagamentos','Pagamentos']]:[]),['tarefas','Tarefas']];
 async function load(){
  L(true);E('');
  try{const queries=[db.from('tarefas').select('*').eq('evento_id',evento.id).order('ordem').order('titulo'),db.from('detalhes_evento').select('*').eq('evento_id',evento.id).order('ordem').order('nome'),db.from('catalogo_salao').select('*').eq('salao_id',evento.salao_id).eq('tipo','profissional').eq('ativo',true).order('nome')];
   if(gerente)queries.push(db.from('itens_evento').select('*').eq('evento_id',evento.id).order('ordem').order('descricao'),db.from('pagamentos').select('*').eq('evento_id',evento.id).order('data'));
   const results=await Promise.all(queries);if(results.some(r=>r.error))throw Error();
   TA(results[0].data);DT(results[1].data);PR(results[2].data);I(results[3]?.data||[]);P(results[4]?.data||[]);LD(true);
  }catch{E('Não foi possível carregar a ficha. Confira a conexão e se a atualização 005 do banco foi aplicada.')}finally{L(false)}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{onLockChange?.(dirty||busy);return()=>onLockChange?.(false)},[dirty,busy]);
 useEffect(()=>{const handler=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty]);
 function go(action){if(busy)return;if(dirty&&formRef.current){destination.current=action;if(formRef.current.reportValidity())formRef.current.requestSubmit();else destination.current=null}else{ED(null);PO(false);S('');action()}}
 function cancel(){if(dirty&&!window.confirm('Descartar apenas as alterações ainda não salvas desta etapa? As etapas já salvas serão mantidas.'))return;if(tab==='pagamentos'){D(false);PO(false);ED(null);V(v=>v+1);S('Alterações do pagamento descartadas.');return}D(false);EM(false);W(false);ED(null);V(v=>v+1);S('Edição encerrada. Os dados já salvos foram mantidos.')}
 function afterSave(){D(false);ED(null);PO(false);V(v=>v+1);S('Alterações salvas.');if(destination.current){const action=destination.current;destination.current=null;action();return}if(tab==='pagamentos')return;if(wizard){const next=tabs[tabs.findIndex(([id])=>id===tab)+1];if(next){T(next[0]);EM(true)}else{W(false);EM(false);T('dados')}}else if(tab!=='pagamentos'){EM(false)}}
 async function save(e){e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);B(true);E('');S('');try{
  if(tab==='dados'){
   const values={...evento.detalhes};for(const k of ['Mãe','Pai','Fotos','Filmagem','Data assin.','Fechado por'])values[k]=f.get(k)||'';
   const {data,error}=await db.from('eventos').update({cliente:f.get('cliente').trim(),data:f.get('data'),tipo:f.get('tipo'),convidados:f.get('convidados')===''?null:Number(f.get('convidados')),status:f.get('status'),detalhes:values}).eq('id',evento.id).eq('salao_id',evento.salao_id).select().single();if(error)throw error;onUpdate(data);
  }else if(tab==='itens'){
   const values=itens.map(i=>({id:i.id,quantidade:i.catalogo_id&&i.unidade==='item'?1:Number(f.get(`q_${i.id}`)),valor_unitario:Number(f.get(`v_${i.id}`))}));
   const {error}=await db.rpc('salvar_servicos_evento',{p_evento:evento.id,p_itens:values});if(error)throw error;
   const result=await db.from('itens_evento').select('*').eq('evento_id',evento.id).order('ordem').order('descricao');if(result.error)throw result.error;I(result.data);
  }else if(tab==='detalhes'){
   const values=detalhes.map(d=>({id:d.id,valor_texto:d.campo_tipo==='texto'?f.get(d.id)||'':d.valor_texto,marcado:d.campo_tipo==='checkbox'?f.has(d.id):d.marcado}));
   const {error}=await db.rpc('salvar_detalhes_evento',{p_evento:evento.id,p_itens:values});if(error)throw error;DT(old=>old.map(d=>({...d,...values.find(v=>v.id===d.id)})));
  }else if(tab==='pagamentos'){
   const value=Number(f.get('valor')),date=f.get('data'),description=f.get('detalhe').trim();
   if(editing||value||date||description){if(!date||value<=0)throw Error('payment');const payload={data:date,valor:value,detalhe:description,forma_pagamento:f.get('forma_pagamento')||'',pago_para:f.get('pago_para').trim()};
    const query=editing?db.from('pagamentos').update(payload).eq('id',editing.id).eq('evento_id',evento.id):db.from('pagamentos').insert({...payload,evento_id:evento.id,salao_id:evento.salao_id});
    const {data,error}=await query.select().single();if(error)throw error;P(old=>(editing?old.map(x=>x.id===data.id?data:x):[...old,data]).sort((a,b)=>a.data.localeCompare(b.data)));
   }
  }
  afterSave();
 }catch(err){destination.current=null;E(err.message==='payment'?'Preencha a data e um valor maior que zero.':'Não foi possível salvar a etapa. As alterações permanecem na tela; confira a conexão e tente novamente.')}finally{B(false)}}
 async function tarefa(t){B(true);E('');try{const {data,error}=await db.from('tarefas').update({concluida:!t.concluida}).eq('id',t.id).eq('evento_id',evento.id).select().single();if(error)throw error;TA(old=>old.map(x=>x.id===t.id?data:x));S('Tarefa salva.')}catch{E('Não foi possível atualizar a tarefa. Tente novamente.')}finally{B(false)}}
 const totals=resumo(itens,pagamentos);
 const extra=evento.detalhes||{};
 const baseFields=[['Mãe',extra['Mãe']],['Pai',extra.Pai],['Fotos',extra.Fotos],['Filmagem',extra.Filmagem],['Data assin.',dataBR(extra['Data assin.'])],['Fechado por',extra['Fechado por']||extra['Fechado por:']||extra.Fechado]];
 function controls(){return <div className="save-bar actions"><button disabled={busy}>{busy?'Salvando…':tab==='pagamentos'?'Salvar pagamento':wizard?(tab==='tarefas'?'Concluir cadastro':'Salvar e continuar'):'Salvar alterações'}</button><button type="button" className="back" disabled={busy} onClick={cancel}>Cancelar edição</button></div>}
 return <section className="event-detail"><button className="back" disabled={busy} onClick={()=>go(onClose)}>← Voltar aos eventos</button><header><div><span className="eyebrow">{dataBR(evento.data)} · {evento.status}</span><h1>{evento.cliente}</h1></div>{gerente&&!editMode&&tab!=='pagamentos'&&<button disabled={loading||busy||!!error} onClick={()=>{EM(true);V(v=>v+1)}}>Editar evento</button>}</header>{wizard&&<p className="step-note">Cadastro do evento · etapa {tabs.findIndex(([id])=>id===tab)+1} de {tabs.length}. Cada etapa é salva antes de avançar.</p>}<nav className="detail-tabs" aria-label="Seções do evento">{tabs.map(([id,label])=><button key={id} disabled={busy||loading} aria-current={tab===id?'page':undefined} onClick={()=>go(()=>{T(id);ED(null);V(v=>v+1)})}>{label}</button>)}</nav>{error&&<p className="error" role="alert">{error}</p>}{success&&<p className="success" role="status">{success}</p>}{loading?<p>Carregando ficha…</p>:!loaded?<button className="back" onClick={load}>Tentar carregar novamente</button>:<>
 {evento.cancelamento_justificativa&&<section className="card"><h2>{evento.status==='cancelado'?'Evento cancelado':'Último cancelamento'}</h2><p className="cancel-reason">{evento.cancelamento_justificativa}</p></section>}
 {gerente&&<div className="totals"><div><small>Total contratado</small><strong>{moeda(totals.total)}</strong></div><div><small>Valor pago</small><strong>{moeda(totals.pago)}</strong></div><div><small>{totals.saldo<0?'Crédito do cliente':'Saldo a receber'}</small><strong>{moeda(Math.abs(totals.saldo))}</strong></div></div>}
 {(tab==='pagamentos'?payOpen:editMode)&&gerente?<form key={`${tab}-${version}-${editing?.id||''}`} ref={formRef} onSubmit={save} onChange={()=>D(true)}><fieldset disabled={busy}>
 {tab==='dados'&&<section className="card"><h2>Dados do evento</h2><div className="fields"><label>Cliente<input name="cliente" required defaultValue={evento.cliente}/></label><label>Data<DataInput name="data" required defaultValue={evento.data} onValueChange={()=>D(true)}/></label><TipoEventoSelect db={db} salao={evento.salao_id} atual={evento.tipo}/><label>Convidados<input name="convidados" type="number" min="0" step="1" defaultValue={evento.convidados??''}/></label><label>Situação<select name="status" defaultValue={evento.status}>{(evento.status==='cancelado'?['reservado','confirmado','realizado','cancelado']:['reservado','confirmado','realizado']).map(s=><option key={s}>{s}</option>)}</select></label>{['Mãe','Pai'].map(k=><label key={k}>{k}<input name={k} defaultValue={extra[k]||''}/></label>)}{['Fotos','Filmagem'].map(c=><ProfissionalSelect key={c} campo={c} rows={profissionais} atual={extra[c]||''}/>)}<label>Data da assinatura<DataInput name="Data assin." defaultValue={extra['Data assin.']||''} onValueChange={()=>D(true)}/></label><label>Fechado por<input name="Fechado por" defaultValue={extra['Fechado por']||extra['Fechado por:']||extra.Fechado||''}/></label></div></section>}
 {tab==='itens'&&<section className="card"><h2>Serviços contratados</h2>{itens.map(i=><article className="record service-row" key={i.id}><div><h3>{i.descricao}</h3><small>Total salvo: {moeda(i.total)}</small></div><div className="service-inputs">{(!i.catalogo_id||i.unidade!=='item')&&<label>{i.unidade==='litros'?'Litros':'Quantidade'}<input name={`q_${i.id}`} type="number" min="0" step={i.unidade==='litros'?'0.001':'1'} required defaultValue={i.quantidade}/></label>}<label>{i.unidade==='item'?'Valor':'Preço unitário'}<MoedaInput name={`v_${i.id}`} defaultValue={i.valor_unitario}/></label></div></article>)}</section>}
 {tab==='detalhes'&&<section className="card"><h2>Detalhes da festa</h2><div className="fields">{detalhes.map(d=>d.campo_tipo==='checkbox'?<label className="task" key={d.id}><input type="checkbox" name={d.id} defaultChecked={d.marcado}/><span>{d.nome}</span></label>:<label key={d.id}>{d.nome}<textarea rows={2} name={d.id} defaultValue={d.valor_texto}/></label>)}</div>{!detalhes.length&&<p>Nenhum detalhe cadastrado para este evento.</p>}</section>}
 {tab==='pagamentos'&&<section className="card"><h2>{editing?'Editar pagamento':'Registrar pagamento'}</h2><div className="fields"><label>Data do pagamento<DataInput name="data" required defaultValue={editing?.data||''} onValueChange={()=>D(true)}/></label><label>Valor<MoedaInput name="valor" defaultValue={editing?.valor||0}/></label><label>Forma de pagamento<select name="forma_pagamento" defaultValue={editing?.forma_pagamento||''}><option value="">Selecione (opcional)</option>{['Pix','Dinheiro','Cartão de crédito','Cartão de débito','Transferência','Boleto','Cheque','Outro'].map(f=><option key={f}>{f}</option>)}</select></label><label>Pago para<input name="pago_para" defaultValue={editing?.pago_para||''} placeholder="Quem recebeu o pagamento"/></label><label>Detalhe<input name="detalhe" defaultValue={editing?.detalhe||''}/></label></div></section>}
 {tab==='tarefas'&&<section className="card"><h2>Concluir cadastro</h2><p>As tarefas abaixo são salvas automaticamente ao marcar ou desmarcar.</p></section>}
 </fieldset>{controls()}</form>:<>
 {tab==='dados'&&<section className="card"><h2>Dados do evento</h2><dl className="read-fields">{[['Cliente',evento.cliente],['Data',dataBR(evento.data)],['Tipo',evento.tipo],['Convidados',evento.convidados],['Situação',evento.status],...baseFields].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v===0?0:v||'—'}</dd></div>)}</dl></section>}
 {tab==='itens'&&<section className="card"><h2>Serviços contratados</h2>{itens.map(i=><article className="record" key={i.id}><div><h3>{i.descricao}</h3><small>{i.quantidade} × {moeda(i.valor_unitario)}</small></div><strong>{moeda(i.total)}</strong></article>)}</section>}
 {tab==='detalhes'&&<section className="card"><h2>Detalhes da festa</h2><dl className="read-fields">{detalhes.map(d=><div key={d.id}><dt>{d.nome}</dt><dd>{d.campo_tipo==='checkbox'?(d.marcado?'Sim':'Não'):d.valor_texto||'—'}</dd></div>)}</dl></section>}
 </>}
 {tab==='pagamentos'&&gerente&&!payOpen&&<div className="actions payment-toolbar"><button disabled={busy} onClick={()=>{ED(null);PO(true);V(v=>v+1);S('')}}>Novo pagamento</button>{wizard&&<button className="back" disabled={busy} onClick={()=>{T('tarefas');EM(true)}}>Continuar para tarefas</button>}</div>}
 {tab==='pagamentos'&&<section className="card"><h2>Histórico de pagamentos</h2>{!pagamentos.length&&<p>Nenhum pagamento registrado.</p>}{pagamentos.map(p=><article className="record" key={p.id}><div><h3>{dataBR(p.data)}</h3><p>{p.forma_pagamento||'Forma não informada'} · {p.pago_para?`Pago para: ${p.pago_para}`:'Recebedor não informado'}</p><p>{p.detalhe||'Sem detalhe'}</p></div><strong>{moeda(p.valor)}</strong>{gerente&&<button className="back" disabled={busy} onClick={()=>go(()=>{ED(p);PO(true);V(v=>v+1)})}>Editar</button>}</article>)}</section>}
 {tab==='tarefas'&&<section className="card"><h2>Andamento · {tarefas.filter(t=>t.concluida).length}/{tarefas.length}</h2>{tarefas.map(t=><label className="task" key={t.id}><input type="checkbox" checked={t.concluida} disabled={!gerente||busy} onChange={()=>tarefa(t)}/><span>{t.titulo}<small>{t.concluida?'Concluída':'Pendente'}</small></span></label>)}</section>}
 {tab==='dados'&&gerente&&!editMode&&<AcoesEvento db={db} evento={evento} onUpdate={onUpdate} onDeleted={onDeleted}/>}
 </>}</section>
}
