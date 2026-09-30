import React,{useEffect,useState} from 'react';
export default function TipoEventoSelect({db,salao,atual=''}){
 const [rows,R]=useState([]),[loading,L]=useState(true),[error,E]=useState(false),[value,V]=useState(atual);
 useEffect(()=>{let active=true;L(true);E(false);R([]);V(atual);
  db.from('catalogo_salao').select('id,nome').eq('salao_id',salao).eq('tipo','tipo_evento').eq('ativo',true).order('ordem').order('nome').then(({data,error})=>{if(!active)return;L(false);if(error)E(true);else R(data)}).catch(()=>{if(active){L(false);E(true)}});
  return()=>{active=false};
 },[db,salao,atual]);
 const historico=atual&&!rows.some(r=>r.nome===atual);
 return <label>Tipo de evento<select name="tipo" required value={value} onChange={e=>V(e.target.value)} aria-busy={loading}>
  <option value="">{loading?'Carregando tipos…':'Selecione o tipo'}</option>
  {historico&&<option value={atual}>{atual} (tipo atual)</option>}
  {rows.map(r=><option key={r.id} value={r.nome}>{r.nome}</option>)}
 </select>{error?<small role="alert">Não foi possível carregar os tipos. Tente abrir o formulário novamente.</small>:!loading&&!rows.length&&<small>Cadastre os tipos em Configurar salão → Tipos de evento. A atualização 003 do banco precisa estar aplicada.</small>}</label>;
}
