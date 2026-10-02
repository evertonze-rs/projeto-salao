import React,{useState} from 'react';
export const categoriasConfiguracoes=[
 ['cliente','Cliente',[['portal','Portal do cliente']]],
 ['acessos','Acessos',[['usuarios','Usuários'],['perfis','Perfis de acesso']]],
 ['saloes','Salões',[['saloes','Salões'],['servico','Serviços'],['tarefa','Tarefas'],['tipo_evento','Tipos de eventos'],['detalhe','Detalhes'],['profissional','Profissionais']]],
 ['aplicativo','Aplicativo',[['sobre','Sobre'],['logs','Logs']]]
];
export default function MenuConfiguracoes({tipo,onSelect,disabled,administrador=true,onToggle}){
 const [open,O]=useState(null);
 return <nav className="settings-categories" aria-label="Categorias das configurações">{categoriasConfiguracoes.filter(([id])=>administrador||id==='aplicativo').map(([id,label,items])=><section className="settings-category" key={id}><button type="button" className="category-toggle" aria-expanded={open===id} aria-controls={`categoria-${id}`} disabled={disabled} onClick={()=>{const next=open===id?null:id;if(onToggle?.(next,next?items.filter(([key])=>administrador||key==='sobre')[0]?.[0]:null)!==false)O(next)}}>{label}<span aria-hidden="true">{open===id?'−':'+'}</span></button>{open===id&&<div id={`categoria-${id}`}>{items.filter(([key])=>administrador||key==='sobre').map(([key,name])=><button type="button" className="category-item" key={key} disabled={disabled} aria-current={tipo===key?'page':undefined} onClick={()=>onSelect(key)}>{name}</button>)}</div>}</section>)}</nav>;
}
