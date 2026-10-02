import {test,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Event','MouseEvent','FormData'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
window.confirm=()=>true;window.scrollTo=()=>{};
const React=await import('react');
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const output=new URL('./.ui-runtime.mjs',import.meta.url);
await build({stdin:{contents:"export {default as Login} from './src/Login.jsx';export {default as RecuperarSenha} from './src/RecuperarSenha.jsx';export {default as MinhaConta} from './src/MinhaConta.jsx';export {default as Identificacao} from './src/Identificacao.jsx';export {default as MenuConfiguracoes} from './src/MenuConfiguracoes.jsx';export {default as ConfigPortal} from './src/ConfigPortal.jsx';export {default as PortalCliente} from './src/PortalCliente.jsx';export {default as ContadorEvento} from './src/ContadorEvento.jsx';export {default as Perfis} from './src/Perfis.jsx';export {default as TelefoneInput} from './src/TelefoneInput.jsx';export {default as Agenda} from './src/Agenda.jsx';export {default as MinhaSenha} from './src/MinhaSenha.jsx';export {default as Usuarios} from './src/UsuariosV2.jsx';export {default as Evento} from './src/Evento.jsx';export {default as DataInput} from './src/DataInput.jsx';export {default as Catalogos} from './src/Catalogos.jsx';export {default as ConfigSaloes} from './src/IdentidadeSalao.jsx';",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(output)});
const {Login,RecuperarSenha,MinhaConta,Identificacao,MenuConfiguracoes,ConfigPortal,PortalCliente,ContadorEvento,Perfis,TelefoneInput,Agenda,MinhaSenha,Usuarios,Evento,DataInput,Catalogos,ConfigSaloes}=await import(output.href);
afterEach(cleanup);after(async()=>{await unlink(output);dom.window.close()});
test('devolução salva com natureza própria e aparece negativa no histórico',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:true,onClose(){},onUpdate(){},onDeleted(){}}));
 await screen.findByText('Dados do evento');fireEvent.click(screen.getByRole('button',{name:'Pagamentos'}));
 fireEvent.click(screen.getByRole('button',{name:'Novo pagamento'}));
 fireEvent.change(screen.getByLabelText('Lançamento'),{target:{value:'devolucao'}});
 fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'),{target:{value:'01/10/2026'}});
 fireEvent.change(screen.getByLabelText('Valor em reais'),{target:{value:'9000'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar pagamento'}));
 await waitFor(()=>assert.ok(f.calls.some(([name,p])=>name==='pagamentos'&&p.valor===90&&p.natureza==='devolucao')));
 assert.ok(await screen.findByText('01/10/2026 · Devolução'));
});
test('configurações autorizam usuário por salão sem pedir senha administrativa',async()=>{
 const f=fixture(),calls=[];f.db.rpc=async(name,args)=>{calls.push([name,args]);return {data:[],error:null}};
 render(React.createElement(Catalogos,{db:f.db,saloes:[{id:'a',nome:'Unidade A'}],onClose(){}}));
 fireEvent.click(screen.getByRole('button',{name:'Acessos'}));fireEvent.click(screen.getByRole('button',{name:'Usuários'}));fireEvent.click(screen.getByRole('button',{name:'+ Novo usuário'}));
 fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Secretária teste'}});
 fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'teste@example.com'}});
 fireEvent.click(screen.getByLabelText('Unidade A'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar acesso'}));
 await waitFor(()=>assert.ok(calls.some(([name,p])=>name==='salvar_usuario'&&p.p_saloes.includes('a')&&p.p_perfil==='secretaria'&&p.p_ativo===true)));
});
function fixture(){
 const event={id:'event',salao_id:'salao',cliente:'Teste',data:'2027-12-31',tipo:'15 Anos',status:'reservado',convidados:100,detalhes:{}};
 const data={tarefas:[{id:'task',titulo:'Boas vindas',concluida:false}],detalhes_evento:[{id:'detail',nome:'Levar lembrancinha',campo_tipo:'checkbox',marcado:false,valor_texto:''}],itens_evento:[{id:'item',descricao:'Pacote',catalogo_id:'catalog',unidade:'item',categoria:'pacote',quantidade:1,valor_unitario:0,total:0}],pagamentos:[],catalogo_salao:[{id:'type',tipo:'tipo_evento',nome:'15 Anos',servicos:[]},{id:'pro',tipo:'profissional',nome:'Foto Teste',servicos:['Fotos']}]};
 const calls=[];let fail=false;
 const db={from(table){let payload=null,filters={},inserting=false;const chain={select(){return chain},in(){return chain},range(){return chain},eq(k,v){filters[k]=v;return chain},order(){return chain},update(v){payload=v;return chain},insert(v){payload=v;inserting=true;return chain},single(){return Promise.resolve(result(true))},then(resolve,reject){return Promise.resolve(result(false)).then(resolve,reject)}};
 function result(single){if(payload){calls.push([table,payload]);if(table==='eventos'){Object.assign(event,payload);return {data:{...event},error:null}}const rows=data[table];if(inserting){const row={id:'pay'+rows.length,...payload};rows.push(row);return {data:{...row},error:null}}const row=rows.find(r=>r.id===filters.id);if(row){Object.assign(row,payload);return {data:{...row},error:null}}}let rows=data[table]||[];if(filters.tipo)rows=rows.filter(r=>r.tipo===filters.tipo);return {data:single?rows[0]:rows.map(r=>({...r})),error:null}}return chain},async rpc(name,args){calls.push([name,args]);if(fail){fail=false;return {error:{message:'teste'}}}if(name==='salvar_servicos_evento')for(const v of args.p_itens)Object.assign(data.itens_evento.find(i=>i.id===v.id),v,{total:v.quantidade*v.valor_unitario});return {error:null}}};
 return {db,event,calls,failNext(){fail=true}};
}
test('calendário escolhe data brasileira e mantém valor ISO no formulário',async()=>{
 let changed='';render(React.createElement('form',{},React.createElement(DataInput,{name:'data',defaultValue:'2028-02-01',onValueChange:v=>changed=v})));
 fireEvent.click(screen.getByRole('button',{name:'Abrir calendário'}));
 fireEvent.click(screen.getByRole('button',{name:'29/02/2028'}));
 assert.equal(screen.getByPlaceholderText('dd/mm/aaaa').value,'29/02/2028');
 assert.equal(document.querySelector('input[type=hidden]').value,'2028-02-29');assert.equal(changed,'2028-02-29');
});
test('cadastro por etapas salva antes de avançar e mantém alterações se houver falha',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:true,iniciarEdicao:true,onClose(){},onUpdate(){},onDeleted(){}}));
 await screen.findByRole('button',{name:'Salvar e continuar'});
 assert.equal(screen.getAllByRole('option',{name:'Particular'}).length,2);
 fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'Novo nome'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar e continuar'}));
 await screen.findByText('Serviços contratados');assert.equal(f.event.cliente,'Novo nome');
 fireEvent.change(screen.getByLabelText('Valor em reais'),{target:{value:'10000'}});
 f.failNext();fireEvent.click(screen.getByRole('button',{name:'Detalhes'}));
 await screen.findByRole('alert');assert.ok(screen.getByText('Serviços contratados'));assert.match(screen.getByLabelText('Valor em reais').value,/100,00/);
 fireEvent.click(screen.getByRole('button',{name:'Detalhes'}));
 await screen.findByText('Detalhes da festa');assert.ok(f.calls.some(([name])=>name==='salvar_servicos_evento'));
 fireEvent.click(screen.getByLabelText('Levar lembrancinha'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar e continuar'}));
 await screen.findByRole('button',{name:'Novo pagamento'});assert.ok(f.calls.some(([name,args])=>name==='salvar_detalhes_evento'&&args.p_itens[0].marcado));
 fireEvent.click(screen.getByRole('button',{name:'Continuar para tarefas'}));
 await screen.findByRole('button',{name:'Concluir cadastro'});
 fireEvent.click(screen.getByLabelText(/Boas vindas/));
 await waitFor(()=>assert.ok(f.calls.some(([name,p])=>name==='tarefas'&&p.concluida)));
 fireEvent.click(screen.getByRole('button',{name:'Concluir cadastro'}));
 await screen.findByRole('button',{name:'Editar evento'});
});
test('checklist salva sem entrar no modo edição',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:true,onClose(){},onUpdate(){},onDeleted(){}}));
 await screen.findByText('Dados do evento');fireEvent.click(screen.getByRole('button',{name:'Tarefas'}));
 const check=screen.getByLabelText(/Boas vindas/);assert.equal(check.disabled,false);fireEvent.click(check);
 await waitFor(()=>assert.ok(f.calls.some(([name,p])=>name==='tarefas'&&p.concluida)));
});

test('cadastro geral envia os saloes selecionados e o tipo do detalhe',async()=>{
 const f=fixture();render(React.createElement(Catalogos,{db:f.db,saloes:[{id:'a',nome:'Unidade A'},{id:'b',nome:'Unidade B'}],onClose(){}}));
 fireEvent.click(screen.getByRole('button',{name:'Salões'}));
 fireEvent.click(screen.getByRole('button',{name:'Detalhes'}));
 fireEvent.click(await screen.findByRole('button',{name:'+ Novo cadastro'}));
 fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Levar bolo'}});
 fireEvent.change(screen.getByLabelText('Como preencher'),{target:{value:'checkbox'}});
 fireEvent.click(screen.getByLabelText('Unidade A'));fireEvent.click(screen.getByLabelText('Unidade B'));
 fireEvent.click(screen.getByRole('button',{name:'Cadastrar'}));
 await waitFor(()=>assert.ok(f.calls.some(([name,p])=>name==='salvar_configuracao'&&p.p_tipo==='detalhe'&&p.p_campo_tipo==='checkbox'&&p.p_saloes.length===2)));
});

test('novo pagamento e edição funcionam sem editar evento, preservando os campos',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:true,onClose(){},onUpdate(){},onDeleted(){}}));
 await screen.findByText('Dados do evento');fireEvent.click(screen.getByRole('button',{name:'Pagamentos'}));
 assert.equal(screen.queryByRole('button',{name:'Editar evento'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Novo pagamento'}));
 fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'),{target:{value:'30102027'}});
 fireEvent.change(screen.getByLabelText('Valor em reais'),{target:{value:'50000'}});
 fireEvent.change(screen.getByLabelText('Forma de pagamento'),{target:{value:'Pix'}});
 fireEvent.change(screen.getByLabelText('Pago para'),{target:{value:'Recebedor teste'}});
 fireEvent.change(screen.getByLabelText('Detalhe'),{target:{value:'Entrada'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar pagamento'}));
 await screen.findByRole('button',{name:'Novo pagamento'});
 const inserted=f.calls.find(([table])=>table==='pagamentos')[1];
 assert.deepEqual([inserted.data,inserted.valor,inserted.forma_pagamento,inserted.pago_para,inserted.detalhe],['2027-10-30',500,'Pix','Recebedor teste','Entrada']);
 fireEvent.click(screen.getByRole('button',{name:'Editar'}));
 assert.equal(screen.getByLabelText('Forma de pagamento').value,'Pix');assert.equal(screen.getByLabelText('Pago para').value,'Recebedor teste');
 fireEvent.change(screen.getByLabelText('Detalhe'),{target:{value:'Entrada corrigida'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar pagamento'}));
 await screen.findByText('Entrada corrigida');
 assert.equal(f.calls.filter(([table])=>table==='pagamentos').length,2);
 fireEvent.click(screen.getByRole('button',{name:'Novo pagamento'}));
 fireEvent.change(screen.getByLabelText('Pago para'),{target:{value:'Descartar'}});
 fireEvent.click(screen.getByRole('button',{name:'Cancelar edição'}));
 assert.equal(f.calls.filter(([table])=>table==='pagamentos').length,2);
});

test('tema tem prévia, cancelamento e gravação restrita ao salão escolhido',async()=>{
 const calls=[];const initial=[{id:'a',nome:'Exxcelência',tema:'azul'},{id:'b',nome:'Exxplêndido',tema:'verde'}];
 const db={from(){let payload,id;const q={update(v){payload=v;return q},eq(_,v){id=v;return q},select(){return q},single(){calls.push({id,...payload});return Promise.resolve({data:{...initial.find(s=>s.id===id),...payload},error:null})}};return q}};
 function Harness(){const [rows,R]=React.useState(initial);return React.createElement(ConfigSaloes,{db,saloes:rows,onUpdate:s=>R(old=>old.map(x=>x.id===s.id?s:x))})}
 render(React.createElement(Harness));
 assert.equal(screen.getByLabelText('Azul').checked,true);
 fireEvent.click(screen.getByLabelText('Roxo'));
 assert.equal(calls.length,0);fireEvent.click(screen.getByRole('button',{name:'Cancelar alteração'}));
 assert.equal(screen.getByLabelText('Azul').checked,true);
 fireEvent.click(screen.getByLabelText('Roxo'));fireEvent.click(screen.getByRole('button',{name:'Salvar dados'}));
 await screen.findByRole('status');assert.equal(calls[0].id,'a');assert.equal(calls[0].tema,'roxo');
 fireEvent.change(screen.getByLabelText('Salão'),{target:{value:'b'}});
 assert.equal(screen.getByLabelText('Verde').checked,true);
});

test('agenda muda entre mês, todos e abre o evento pelo calendário',async()=>{
 const events=[{id:'a',data:'2099-02-12',cliente:'Cliente fevereiro',tipo:'15 Anos',status:'reservado'},{id:'b',data:'2099-03-12',cliente:'Cliente março',tipo:'15 Anos',status:'reservado'}];let selected;
 render(React.createElement(Agenda,{eventos:events,onOpen:e=>selected=e}));
 fireEvent.change(screen.getByLabelText('Mês do calendário'),{target:{value:'2099-02'}});
 fireEvent.click(screen.getByRole('button',{name:'Exibir eventos deste mês'}));
 assert.ok(screen.getByText('Cliente fevereiro'));assert.equal(screen.queryByText('Cliente março'),null);
 fireEvent.click(screen.getByRole('button',{name:'12/02/2099: 1 evento(s)'}));assert.equal(selected.id,'a');
 fireEvent.click(screen.getByRole('button',{name:'Exibir todos os eventos'}));assert.ok(screen.getByText('Cliente março'));
});
test('cliente recebe validade automática e eventos passados não entram no novo vínculo',async()=>{
 const db={rpc:async()=>({data:[],error:null}),from(){const q={select(){return q},in(){return q},order:async()=>({data:[{id:'old',data:'2000-01-01',cliente:'Antigo',salao_id:'a'},{id:'new',data:'2099-12-31',cliente:'Futuro',salao_id:'a'}],error:null})};return q}};
 render(React.createElement(Usuarios,{db,saloes:[{id:'a',nome:'Salão A'}]}));
 fireEvent.click(screen.getByRole('button',{name:'+ Novo usuário'}));
 fireEvent.change(screen.getByLabelText('Perfil'),{target:{value:'cliente'}});
 await screen.findByRole('option',{name:/Futuro/});assert.equal(screen.queryByRole('option',{name:/Antigo/}),null);
 fireEvent.change(screen.getByLabelText('Evento do cliente'),{target:{value:'new'}});
 assert.equal(screen.getByPlaceholderText('dd/mm/aaaa').value,'01/01/2100');
});
test('senha confirma valor, valida senha atual e envia troca sem armazená-la',async()=>{
 const calls=[];const db={auth:{getUser:async()=>({data:{user:{email:'teste@example.com'}},error:null}),signInWithPassword:async p=>{calls.push(['login',p]);return {error:null}},updateUser:async p=>{calls.push(['update',p]);return {error:null}}}};
 render(React.createElement(MinhaSenha,{db,onClose(){}}));
 for(const [label,value] of [['Senha atual','antiga123'],['Nova senha','nova12345'],['Confirmar nova senha','diferente']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar senha'}));await screen.findByRole('alert');assert.equal(calls.length,0);
 fireEvent.change(screen.getByLabelText('Confirmar nova senha'),{target:{value:'nova12345'}});fireEvent.click(screen.getByRole('button',{name:'Salvar senha'}));await screen.findByText('Senha alterada.');assert.equal(calls[1][1].password,'nova12345');assert.equal(screen.getByLabelText('Nova senha').value,'');
});

test('portal mostra apenas seções recebidas e permite pular a abertura do contador',async()=>{
 const event={cliente:'Aniversário teste',data:'2099-01-01',tipo:'15 Anos',status:'reservado',contador:true,animacao:true,itens:[{descricao:'Pacote',quantidade:1}],pagamentos:[{data:'2026-10-01',valor:50,natureza:'devolucao'}]};
 const db={rpc:async()=>({data:event}),auth:{signOut:async()=>({})}};
 render(React.createElement(PortalCliente,{db}));
 await screen.findByText('Itens contratados');assert.equal(screen.queryByText('Resumo financeiro'),null);assert.equal(screen.queryByText('Preparação do evento'),null);
 fireEvent.click(await screen.findByRole('button',{name:'Ir para meu evento'}));
 assert.equal(screen.queryByRole('button',{name:'Ir para meu evento'}),null);assert.ok(screen.getByLabelText('Contagem regressiva do evento'));
 assert.ok(screen.getByRole('button',{name:'Atualizar andamento'}).parentElement.contains(screen.getByRole('button',{name:/Minha conta:/})));
 fireEvent.click(screen.getByRole('button',{name:'Atualizar andamento'}));await screen.findByText('Itens contratados');assert.equal(screen.queryByRole('button',{name:'Ir para meu evento'}),null);
});
test('movimento reduzido evita animação, cancelamento não mostra contagem festiva',()=>{
 window.matchMedia=()=>({matches:true});
 const props={evento:{data:'2099-01-01',contador:true,animacao:true,status:'reservado'}};
 const v=render(React.createElement(ContadorEvento,props));assert.equal(screen.queryByRole('button',{name:'Ir para meu evento'}),null);
 v.rerender(React.createElement(ContadorEvento,{evento:{...props.evento,status:'cancelado'}}));assert.equal(screen.queryByLabelText('Contagem regressiva do evento'),null);
 delete window.matchMedia;
});
test('telefone formata no formulário e mantém o nome para envio',()=>{
 render(React.createElement('form',{},React.createElement('label',{},'Telefone',React.createElement(TelefoneInput,{name:'telefone'}))));
 fireEvent.change(screen.getByLabelText('Telefone'),{target:{value:'51999998888'}});
 assert.equal(new FormData(document.querySelector('form')).get('telefone'),'(51) 99999-8888');
});
test('perfil com financeiro sem editar evento pode lançar pagamentos, mas não editar dados',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:false,financeiro:true,tarefasEditar:false,onClose(){},onUpdate(){}}));
 await screen.findByText('Dados do evento');assert.equal(screen.queryByRole('button',{name:'Editar evento'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Pagamentos'}));assert.ok(screen.getByRole('button',{name:'Novo pagamento'}));
 fireEvent.click(screen.getByRole('button',{name:'Tarefas'}));assert.equal(screen.getByRole('checkbox').disabled,true);
});
test('configuração do portal envia somente opções do salão selecionado',async()=>{
 let payload;
 const db={from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{itens:false}}),upsert:async(v)=>{payload=v;return {}}};return q}};
 render(React.createElement(ConfigPortal,{db,saloes:[{id:'a',nome:'Salão A'},{id:'b',nome:'Salão B'}]}));
 fireEvent.click(await screen.findByLabelText('Itens contratados (serviços com valor maior que zero)'));
 assert.equal(screen.getByLabelText('Salão').disabled,true);
 fireEvent.click(screen.getByRole('button',{name:'Salvar opções'}));await screen.findByRole('status');
 assert.equal(payload.salao_id,'a');assert.equal(payload.itens,true);assert.equal(payload.valores,false);assert.equal(payload.pagamentos,false);
});

test('perfis abrem somente ao criar ou editar, focam título e retornam à lista ao salvar',async()=>{
 const calls=[],rows=[{codigo:'leitor',nome:'Consulta',eventos_visualizar:true,financeiro_visualizar:true,sistema:false}];
 const db={from(){return {select(){return this},order:async()=>({data:rows})}},rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='administrador_global'?true:null}}};
 render(React.createElement(Perfis,{db}));
 await screen.findByRole('button',{name:'+ Novo perfil'});assert.equal(screen.queryByLabelText('Nome do perfil'),null);
 fireEvent.click(screen.getByRole('button',{name:'Editar perfil Consulta'}));
 const title=screen.getByRole('heading',{name:'Editar perfil: Consulta'});assert.equal(document.activeElement,title);
 assert.equal(screen.queryByRole('button',{name:'Editar perfil Consulta'}),null);
 assert.equal(screen.getByLabelText('Visualizar serviços, valores e pagamentos').checked,true);
 assert.equal(screen.getByLabelText('Adicionar e editar serviços e pagamentos').checked,false);
 fireEvent.click(screen.getByLabelText('Adicionar e editar serviços e pagamentos'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar perfil'}));await screen.findByRole('status');
 assert.equal(screen.queryByLabelText('Nome do perfil'),null);
 const call=calls.find(([name])=>name==='salvar_perfil_detalhado');assert.equal(call[1].p_codigo,'leitor');assert.equal(call[1].p_acessos.financeiro,true);
 fireEvent.click(screen.getByRole('button',{name:'+ Novo perfil'}));assert.equal(screen.getByLabelText('Nome do perfil').value,'');
 fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));assert.equal(screen.queryByLabelText('Nome do perfil'),null);
});
test('financeiro somente leitura não mostra edição nem lançamento',async()=>{
 const f=fixture();render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:false,financeiro:true,financeiroEditar:false,tarefasVisualizar:false,documentos:false,onClose(){},onUpdate(){}}));
 await screen.findByText('Dados do evento');assert.equal(screen.queryByRole('button',{name:'Exibir ficha'}),null);assert.equal(screen.queryByRole('button',{name:'Tarefas'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Serviços'}));assert.equal(screen.queryByRole('button',{name:'Editar evento'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Pagamentos'}));assert.equal(screen.queryByRole('button',{name:'Novo pagamento'}),null);assert.ok(screen.getByText('Histórico de pagamentos'));
});

test('configurações agrupam categorias expansíveis e Sobre fica em Aplicativo',()=>{
 let selected='',first='';render(React.createElement(MenuConfiguracoes,{tipo:'servico',onSelect:v=>selected=v,onToggle:(_,v)=>{first=v}}));
 assert.equal(screen.queryByRole('button',{name:'Sobre'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Aplicativo'}));
 assert.equal(first,'sobre');
 fireEvent.click(screen.getByRole('button',{name:'Sobre'}));assert.equal(selected,'sobre');
 assert.ok(screen.getByRole('button',{name:'Logs'}));
 fireEvent.click(screen.getByRole('button',{name:'Aplicativo'}));assert.equal(screen.queryByRole('button',{name:'Logs'}),null);
});
test('conta permite editar nome, remover foto e abrir troca de senha',async()=>{
 let payload,updated;
 const db={rpc:async(name,args)=>{payload={name,...args};return {data:{nome:args.p_nome,foto:args.p_foto,email:'teste@local'}}}};
 render(React.createElement(MinhaConta,{db,perfil:{nome:'Everton',foto:'data:image/jpeg;base64,YWJj',email:'teste@local'},onUpdate:v=>updated=v,onClose(){}}));
 fireEvent.change(screen.getByLabelText('Nome de exibição'),{target:{value:'Everton Araújo'}});fireEvent.click(screen.getByRole('button',{name:'Remover foto'}));
 fireEvent.click(screen.getByRole('button',{name:'Salvar perfil'}));await screen.findByRole('status');
 assert.equal(payload.name,'salvar_meu_perfil');assert.equal(payload.p_nome,'Everton Araújo');assert.equal(payload.p_foto,'');assert.equal(updated.nome,'Everton Araújo');
 const card=screen.getByRole('heading',{name:'Meu perfil'}).closest('.profile-card');
 assert.ok(card.contains(screen.getByRole('button',{name:'Alterar minha senha'})));
 fireEvent.click(screen.getByRole('button',{name:'Alterar minha senha'}));assert.ok(card.contains(screen.getByLabelText('Senha atual')));
 assert.equal(document.querySelector('form form'),null);
});

test('configurações começam vazias, expandem uma categoria e escondem o conteúdo ao recolher',async()=>{
 const f=fixture();render(React.createElement(Catalogos,{db:f.db,saloes:[],onClose(){}}));
 assert.equal(screen.queryByRole('button',{name:'+ Novo cadastro'}),null);
 fireEvent.click(screen.getByRole('button',{name:'Salões'}));
 fireEvent.click(screen.getByRole('button',{name:'Serviços'}));
 await screen.findByRole('button',{name:'+ Novo cadastro'});
 assert.equal(screen.queryByLabelText('Nome'),null);
 fireEvent.click(screen.getByRole('button',{name:'Acessos'}));
 assert.equal(screen.queryByRole('button',{name:'Serviços'}),null);
 assert.equal(screen.queryByRole('button',{name:'+ Novo cadastro'}),null);
 assert.ok(screen.getByRole('heading',{name:'Usuários e acessos'}));
 fireEvent.click(screen.getByRole('button',{name:'Usuários'}));
 assert.ok(screen.getByRole('heading',{name:'Usuários e acessos'}));
 fireEvent.click(screen.getByRole('button',{name:'Acessos'}));
 assert.equal(screen.queryByRole('heading',{name:'Usuários e acessos'}),null);
});
test('edição de usuário permanece na linha e cancelar não grava',async()=>{
 const f=fixture(),calls=[];
 f.db.rpc=async(name,args)=>{calls.push([name,args]);return {data:name==='listar_usuarios'?[{email:'p@local',nome:'Pessoa',perfil:'secretaria',saloes:['a'],ativo:true}]:[]}};
 render(React.createElement(Usuarios,{db:f.db,saloes:[{id:'a',nome:'Unidade A'}]}));
 const button=await screen.findByRole('button',{name:'Editar / suspender'});
 assert.equal(screen.queryByLabelText('Nome'),null);fireEvent.click(button);
 assert.ok(button.closest('article').contains(screen.getByLabelText('Nome')));
 fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Mudou'}});
 fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
 assert.equal(screen.queryByLabelText('Nome'),null);assert.ok(!calls.some(([n])=>n==='salvar_usuario'));
});
test('todos os catálogos editam na própria linha e preservam alterações se salvar falhar',async()=>{
 const rows=['servico','tarefa','tipo_evento','detalhe','profissional'].map((tipo,i)=>({id:String(i),tipo,nome:'Item '+i,servicos:['Fotos'],catalogo_salao:[{salao_id:'a',ativo:true}]}));
 const db={from(){const q={select(){return q},order(){return q},then(fn){return Promise.resolve({data:rows}).then(fn)}};return q},rpc:async()=>({error:{message:'falha'}})};
 render(React.createElement(Catalogos,{db,saloes:[{id:'a',nome:'Unidade A'}],onClose(){}}));
 fireEvent.click(screen.getByRole('button',{name:'Salões'}));
 for(const label of ['Serviços','Tarefas','Tipos de eventos','Detalhes','Profissionais']){
 fireEvent.click(screen.getByRole('button',{name:label}));
 const edit=await screen.findByRole('button',{name:'Editar'});fireEvent.click(edit);
 assert.ok(edit.closest('article').contains(screen.getByLabelText('Nome')));
 fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Alterado'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByRole('alert');
 assert.equal(screen.getByLabelText('Nome').value,'Alterado');
 fireEvent.click(screen.getByRole('button',{name:'Cancelar edição'}));
 }
});

test('esqueci senha envia link para a tela de recuperação sem pedir senha atual',async()=>{
 let call;render(React.createElement(Login,{db:{auth:{resetPasswordForEmail:async(...args)=>{call=args;return {}}}}}));
 fireEvent.click(screen.getByRole('button',{name:'Esqueci minha senha'}));assert.equal(screen.queryByLabelText('Senha'),null);
 fireEvent.change(screen.getByLabelText('E-mail'),{target:{value:'teste@example.com'}});
 fireEvent.click(screen.getByRole('button',{name:'Enviar link de recuperação'}));await screen.findByRole('status');
 assert.equal(call[0],'teste@example.com');assert.equal(call[1].redirectTo,'http://localhost/?recuperar=1');
});
test('recuperação valida confirmação, preserva formulário em falha e encerra sessão ao concluir',async()=>{
 let fail=true,calls=[],done=false;const db={auth:{getUser:async()=>({data:{user:{id:'u'}}}),updateUser:async p=>{calls.push(p);return fail?{error:{message:'erro'}}:{}},signOut:async()=>({})}};
 render(React.createElement(RecuperarSenha,{db,session:{user:{id:'u'}},onDone:()=>done=true}));
 fireEvent.change(screen.getByLabelText('Nova senha'),{target:{value:'nova12345'}});fireEvent.change(screen.getByLabelText('Confirmar nova senha'),{target:{value:'outra12345'}});
 fireEvent.click(screen.getByRole('button',{name:'Salvar nova senha'}));await screen.findByRole('alert');assert.equal(calls.length,0);
 fireEvent.change(screen.getByLabelText('Confirmar nova senha'),{target:{value:'nova12345'}});fireEvent.click(screen.getByRole('button',{name:'Salvar nova senha'}));await waitFor(()=>assert.equal(calls.length,1));await screen.findByText(/Não foi possível salvar a senha/);
 assert.equal(screen.getByLabelText('Nova senha').value,'nova12345');fail=false;
 fireEvent.click(screen.getByRole('button',{name:'Salvar nova senha'}));await screen.findByRole('status');assert.deepEqual(calls[1],{password:'nova12345'});
 fireEvent.click(screen.getByRole('button',{name:'Voltar para entrar'}));await waitFor(()=>assert.equal(done,true));
});
test('link inválido não oferece formulário de redefinição',()=>{
 render(React.createElement(RecuperarSenha,{db:{},session:{user:{}},invalid:true,onDone(){}}));
 assert.ok(screen.getByRole('alert'));assert.equal(screen.queryByLabelText('Nova senha'),null);
});
test('excluir usuário exige confirmação e remove apenas a linha após sucesso',async()=>{
 const f=fixture(),calls=[];f.db.rpc=async(name,args)=>{calls.push([name,args]);return {data:name==='listar_usuarios'?[{email:'p@local',nome:'Pessoa',perfil:'secretaria',saloes:['a'],ativo:true}]:null}};
 render(React.createElement(Usuarios,{db:f.db,saloes:[{id:'a',nome:'Unidade A'}]}));
 fireEvent.click(await screen.findByRole('button',{name:'Excluir usuário'}));assert.ok(!calls.some(([n])=>n==='excluir_usuario'));
 fireEvent.click(screen.getByRole('button',{name:'Cancelar exclusão'}));assert.ok(screen.getByText('Pessoa'));
 fireEvent.click(screen.getByRole('button',{name:'Excluir usuário'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar exclusão'}));await screen.findByRole('status');
 assert.ok(calls.some(([n,p])=>n==='excluir_usuario'&&p.p_email==='p@local'));assert.equal(screen.queryByText('Pessoa'),null);
});
test('editar evento pode criar acesso junto ao salvamento e mantém tela em conflito',async()=>{
 const f=fixture();let payload,fail=true;f.db.rpc=(name,args)=>{payload={name,...args};return {single:async()=>fail?{error:{message:'E-mail já vinculado'}}:{data:{...f.event,...args.p_dados}}}};
 render(React.createElement(Evento,{db:f.db,evento:f.event,gerente:true,administrar:true,onClose(){},onUpdate(){}}));
 fireEvent.click(await screen.findByRole('button',{name:'Editar evento'}));
 fireEvent.change(screen.getByLabelText('Email'),{target:{value:'cliente@example.com'}});fireEvent.click(screen.getByLabelText('Criar acesso do cliente com este e-mail'));
 fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByRole('alert');assert.equal(screen.getByLabelText('Email').value,'cliente@example.com');
 assert.equal(payload.name,'salvar_evento_com_acesso');assert.equal(payload.p_criar_acesso,true);assert.equal(payload.p_dados.detalhes.Email,'cliente@example.com');
 fail=false;fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByRole('status');assert.equal(screen.queryByLabelText('Criar acesso do cliente com este e-mail'),null);
});
