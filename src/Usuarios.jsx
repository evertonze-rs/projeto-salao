import React,{useEffect,useState} from 'react';
import DataInput from './DataInput.jsx';
import {formatDate} from './dates.mjs';
const perfis={gerente:'Gerente — gerencia eventos, financeiro, cadastros e acessos',dono:'Dono — consulta eventos, detalhes e tarefas',secretaria:'Secretária — consulta eventos, detalhes e tarefas'};
export default function Usuarios({db,saloes,onLockChange}){
 const [rows,R]=useState([]),[editing,ED]=useState(null),[busy,B]=useState(false),[dirty,D]=useState(false),[error,E]=useState(''),[notice,N]=useState(''),[version,V]=useState(0);
 useEffect(()=>{onLockChange?.(dirty||busy);return()=>onLockChange?.(false)},[dirty,busy]);
 useEffect(()=>{const fn=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn)},[dirty]);
 async function load(){const {data,error}=await db.rpc('listar_acessos');if(error)throw error;R(data)}
 useEffect(()=>{load().catch(()=>E('Aplique a atualização 007 do banco para gerenciar usuários.'))},[]);
 function cancel(){if(dirty&&!window.confirm('Descartar as alterações deste acesso?'))return;D(false);ED(null);V(v=>v+1)}
 async function save(e){e.preventDefault();const f=new FormData(e.currentTarget);B(true);E('');N('');try{
  const {error}=await db.rpc('salvar_acesso',{p_email:f.get('email').trim(),p_nome:f.get('nome').trim(),p_salao:f.get('salao'),p_perfil:f.get('perfil'),p_ativo:f.get('ativo')==='on',p_validade:f.get('validade')||null});if(error)throw error;
  D(false);ED(null);V(v=>v+1);await load();N('Acesso salvo. Para outro salão, cadastre o mesmo e-mail e selecione o salão desejado.');
 }catch(err){E(err.message?.includes('próprio acesso')?'Seu próprio acesso deve ser alterado por outro gerente.':'Não foi possível salvar. Confira os dados e sua permissão no salão.')}finally{B(false)}}
 return <section><h2>Usuários e acessos</h2><p>Autorize o e-mail e escolha o perfil em cada salão. Para o primeiro acesso, a pessoa usa “Criar minha senha” na tela de entrada com esse mesmo e-mail. Suspender bloqueia os dados deste salão, preservando o histórico.</p>
 {error&&<p role="alert" className="error">{error}</p>}{notice&&<p role="status" className="success">{notice}</p>}
 <form className="card" key={`${version}-${editing?.email||''}-${editing?.salao_id||''}`} onSubmit={save} onChange={()=>D(true)}><h3>{editing?'Editar acesso':'Autorizar usuário'}</h3><fieldset disabled={busy}><div className="fields">
 <label>Nome<input name="nome" required maxLength={150} defaultValue={editing?.nome||''}/></label><label>E-mail<input name="email" type="email" required readOnly={!!editing} defaultValue={editing?.email||''}/></label>
 <label>Salão<select name="salao" defaultValue={editing?.salao_id||saloes[0]?.id}>{saloes.filter(s=>!editing||s.id===editing.salao_id).map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
 <label>Perfil<select name="perfil" defaultValue={editing?.perfil||'secretaria'}>{Object.entries(perfis).map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
 <label>Acesso até (opcional)<DataInput name="validade" defaultValue={editing?.validade||''} onValueChange={()=>D(true)}/></label>
 <label className="task"><input name="ativo" type="checkbox" defaultChecked={editing?.ativo??true}/>Acesso ativo</label></div>
 <div className="actions"><button>{busy?'Salvando…':'Salvar acesso'}</button><button type="button" className="back" onClick={cancel}>Cancelar</button></div></fieldset></form>
 <section className="card">{rows.map(r=><article className="record" key={`${r.email}-${r.salao_id}`}><div><h3>{r.nome||r.email}</h3><p>{r.email}</p><p>{saloes.find(s=>s.id===r.salao_id)?.nome} · {r.perfil} · {r.ativo?'Ativo':'Suspenso'}{r.validade?` · Validade: ${formatDate(r.validade)}`:''}</p><small>{r.usuario_id?'Conta cadastrada':'Aguardando criação da senha'}</small></div><button type="button" className="back" disabled={busy} onClick={()=>{if(dirty&&!window.confirm('Descartar alterações não salvas?'))return;D(false);ED(r);V(v=>v+1);window.scrollTo({top:0,behavior:'smooth'})}}>Editar / suspender</button></article>)}{!rows.length&&<p>Nenhum acesso encontrado.</p>}</section></section>
}
