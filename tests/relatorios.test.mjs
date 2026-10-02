import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modeloFicha,criarPDF,todos} from '../src/relatorios.mjs';
const event={cliente:'Teste de impressão',data:'2027-01-01',tipo:'15 Anos',status:'reservado',detalhes:{Email:'cliente@example.com',Telefone:'123'}};
const data={itens:[{descricao:'Pacote',categoria:'pacote',quantidade:1,total:100}],pagamentos:[{valor:100,natureza:'recebimento',data:'2026-01-01'}],tarefas:[{titulo:'Reunião',concluida:true}],detalhes:[{nome:'Orientação',campo_tipo:'texto',valor_texto:'Texto para a equipe'}]};
test('ficha respeita opções e separa checklist e financeiro sem páginas vazias',()=>{
 const flags={dados:true,servicos:true,detalhes:true,checklist:true,financeiro:true,pagamentos:true};
 const model=modeloFicha(event,{nome:'Salão teste'},data,flags,true);
 const doc=criarPDF(model);assert.equal(doc.getNumberOfPages(),3);
 assert.equal(model.sections.filter(s=>s.pageBreakBefore).length,2);
 const noMoney=modeloFicha(event,{nome:'Salão teste'},data,{...flags,financeiro:false},true);
 assert.equal(noMoney.sections.some(s=>s.title.includes('financeiro')),false);
 assert.equal(noMoney.sections.find(s=>s.title==='Serviços contratados').headers.includes('Valor'),false);
 const noAccess=modeloFicha(event,{nome:'Salão teste'},data,flags,false);
 assert.equal(noAccess.sections.some(s=>s.title.includes('financeiro')),false);
 const bytes=doc.output('arraybuffer');assert.ok(bytes.byteLength>1000);assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
});
test('relatórios buscam todas as páginas do banco',async()=>{
 const rows=Array.from({length:1121},(_,i)=>({id:i}));let calls=0;
 const result=await todos(()=>({range(a,b){calls++;return Promise.resolve({data:rows.slice(a,b+1),error:null})}}));
 assert.equal(result.length,1121);assert.equal(calls,3);
});
