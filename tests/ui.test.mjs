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
await build({stdin:{contents:"export {default as Evento} from './src/Evento.jsx';export {default as DataInput} from './src/DataInput.jsx';export {default as Catalogos} from './src/Catalogos.jsx';export {default as ConfigSaloes} from './src/ConfigSaloes.jsx';",resolveDir:fileURLToPath(new URL('..',import.meta.url)),loader:'jsx'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:fileURLToPath(output)});
const {Evento,DataInput,Catalogos,ConfigSaloes}=await import(output.href);
afterEach(cleanup);after(async()=>{await unlink(output);dom.window.close()});
function fixture(){
 const event={id:'event',salao_id:'salao',cliente:'Teste',data:'2027-12-31',tipo:'15 Anos',status:'reservado',convidados:100,detalhes:{}};
 const data={tarefas:[{id:'task',titulo:'Boas vindas',concluida:false}],detalhes_evento:[{id:'detail',nome:'Levar lembrancinha',campo_tipo:'checkbox',marcado:false,valor_texto:''}],itens_evento:[{id:'item',descricao:'Pacote',catalogo_id:'catalog',unidade:'item',categoria:'pacote',quantidade:1,valor_unitario:0,total:0}],pagamentos:[],catalogo_salao:[{id:'type',tipo:'tipo_evento',nome:'15 Anos',servicos:[]},{id:'pro',tipo:'profissional',nome:'Foto Teste',servicos:['Fotos']}]};
 const calls=[];let fail=false;
 const db={from(table){let payload=null,filters={},inserting=false;const chain={select(){return chain},eq(k,v){filters[k]=v;return chain},order(){return chain},update(v){payload=v;return chain},insert(v){payload=v;inserting=true;return chain},single(){return Promise.resolve(result(true))},then(resolve,reject){return Promise.resolve(result(false)).then(resolve,reject)}};
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
 await screen.findByRole('button',{name:'Cadastrar'});
 fireEvent.click(screen.getByRole('button',{name:'Detalhes'}));
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
 fireEvent.click(screen.getByLabelText('Roxo'));fireEvent.click(screen.getByRole('button',{name:'Salvar tema'}));
 await screen.findByRole('status');assert.deepEqual(calls,[{id:'a',tema:'roxo'}]);
 fireEvent.change(screen.getByLabelText('Salão'),{target:{value:'b'}});
 assert.equal(screen.getByLabelText('Verde').checked,true);
});
