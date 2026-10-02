export const gruposPermissoes=[
 ['Eventos',[['eventos_visualizar','Visualizar eventos e detalhes'],['eventos_criar','Criar eventos'],['eventos_editar','Editar e cancelar eventos'],['eventos_excluir','Excluir eventos e registros vinculados']]],
 ['Financeiro',[['financeiro_visualizar','Visualizar serviços, valores e pagamentos'],['financeiro','Adicionar e editar serviços e pagamentos']]],
 ['Tarefas',[['tarefas_visualizar','Visualizar checklist'],['tarefas_editar','Marcar e desmarcar tarefas']]],
 ['Documentos',[['relatorios','Acessar relatórios e imprimir fichas']]],
 ['Administração',[['administrar','Administração completa, usuários, perfis e configurações']]]
];
export const camposPermissoes=gruposPermissoes.flatMap(([,items])=>items.map(([k])=>k));
export const novoPerfil=()=>({nome:'',...Object.fromEntries(camposPermissoes.map(k=>[k,false]))});
export function alterarPermissao(draft,key,value){
 const next={...draft,[key]:value};
 if(value&&key!=='administrar')next.eventos_visualizar=true;
 if(value&&key==='financeiro')next.financeiro_visualizar=true;
 if(value&&key==='tarefas_editar')next.tarefas_visualizar=true;
 if(!value&&key==='eventos_visualizar')for(const k of camposPermissoes)if(k!=='administrar')next[k]=false;
 if(!value&&key==='financeiro_visualizar')next.financeiro=false;
 if(!value&&key==='tarefas_visualizar')next.tarefas_editar=false;
 return next;
}
