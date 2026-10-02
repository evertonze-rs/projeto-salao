export const permissoesPadrao={gerente:{eventos_editar:true,tarefas_editar:true,financeiro:true,administrar:true},dono:{eventos_visualizar:true,tarefas_visualizar:true,relatorios:true},secretaria:{eventos_visualizar:true,tarefas_visualizar:true,relatorios:true}};
export function pode(membros,perfis,salao,permissao){
 return membros.some(m=>m.salao_id===salao&&m.ativo!==false&&(()=>{
  const p=perfis.find(p=>p.codigo===m.perfil)||permissoesPadrao[m.perfil]||{};
  if(p.administrar)return true;
  const legacy={eventos_visualizar:true,tarefas_visualizar:true,relatorios:true,eventos_criar:!!p.eventos_editar,eventos_excluir:!!p.eventos_editar,financeiro_visualizar:!!p.financeiro};
  const read=k=>p[k]??legacy[k]??false;
  if(permissao!=='administrar'&&!read('eventos_visualizar'))return false;
  return !!read(permissao);
 })());
}
