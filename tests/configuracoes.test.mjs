import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('configurações gerais: salões, pacote, profissionais, detalhes e transações',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['001_estrutura.sql','002_catalogos.sql','003_tipos_evento.sql','004_cancelar_excluir.sql','005_configuracoes_gerais.sql'])await db.exec(await readFile(new URL(`../supabase/${file}`,import.meta.url),'utf8'));
 const saloes=(await db.query('select * from saloes order by nome')).rows;
 const [a,b]=saloes.map(s=>s.id),user='00000000-0000-4000-8000-000000000001',limited='00000000-0000-4000-8000-000000000002';
 await db.exec(`insert into auth.users values ('${user}'),('${limited}');insert into membros values ('${user}','${a}','gerente'),('${user}','${b}','gerente'),('${limited}','${a}','gerente');set role authenticated;set request.jwt.claim.sub='${user}';`);
 assert.ok((await db.query('select * from configuracoes_catalogo')).rows.length>0);
 async function config(id,tipo,nome,units,field='texto',roles=[]){return (await db.query('select salvar_configuracao($1,$2,$3,$4,$5,$6,$7) as id',[id,tipo,nome,'item',field,roles,units])).rows[0].id}
 const service=await config(null,'servico','Novo serviço',[a,b]);
 assert.equal((await db.query(`select * from catalogo_salao where configuracao_id='${service}' and ativo`)).rows.length,2);
 const pro=await config(null,'profissional','Profissional de teste',[a],'texto',['Fotos']);
 const detail=await config(null,'detalhe','Detalhe de teste',[a,b],'checkbox');
 const evento=(await db.query(`insert into eventos(salao_id,cliente,data,tipo) values ('${a}','Teste','2027-01-01','15 Anos') returning id`)).rows[0].id;
 assert.equal((await db.query(`select * from detalhes_evento where evento_id='${evento}' and nome='Detalhe de teste'`)).rows[0].campo_tipo,'checkbox');
 await db.exec(`update eventos set detalhes='{"Fotos":"Profissional de teste","Filmagem":"Particular"}' where id='${evento}'`);
 await assert.rejects(db.exec(`update eventos set detalhes='{"Filmagem":"Profissional de teste"}' where id='${evento}'`));
 const pack=(await db.query('select id from configuracoes_catalogo where obrigatorio')).rows[0].id;
 await assert.rejects(config(pack,'servico','Outro pacote',[a]));await assert.rejects(db.query('select excluir_configuracao($1)',[pack]));
 await assert.rejects(config(null,'servico','Pacote',[a]));
 await db.exec(`set request.jwt.claim.sub='${limited}'`);
 await assert.rejects(config(service,'servico','Mudar sem permissão',[a]));
 await assert.rejects(config(null,'tarefa','Sem permissão',[b]));
 await db.exec(`set request.jwt.claim.sub='${user}'`);
 await config(service,'servico','Serviço atualizado',[b]);
 assert.equal((await db.query(`select nome from catalogo_salao where configuracao_id='${service}' and ativo`)).rows[0].nome,'Serviço atualizado');
 assert.ok((await db.query(`select * from itens_evento where evento_id='${evento}' and descricao='Novo serviço'`)).rows.length);
 await db.query('select excluir_configuracao($1)',[pro]);
 assert.equal((await db.query(`select * from configuracoes_catalogo where id='${pro}'`)).rows.length,0);
 await db.exec(`update eventos set cliente='Outro nome' where id='${evento}'`);
 const item=(await db.query(`select id from itens_evento where evento_id='${evento}' limit 1`)).rows[0].id;
 const invalid='00000000-0000-4000-8000-000000000099';
 await assert.rejects(db.query('select salvar_servicos_evento($1,$2)',[evento,JSON.stringify([{id:item,quantidade:1,valor_unitario:300},{id:invalid,quantidade:1,valor_unitario:20}])]));
 assert.equal(Number((await db.query(`select valor_unitario from itens_evento where id='${item}'`)).rows[0].valor_unitario),0);
 await db.query('select salvar_servicos_evento($1,$2)',[evento,JSON.stringify([{id:item,quantidade:1,valor_unitario:300}])]);
 assert.equal(Number((await db.query(`select total from itens_evento where id='${item}'`)).rows[0].total),300);
 const d=(await db.query(`select id from detalhes_evento where evento_id='${evento}' and nome='Detalhe de teste'`)).rows[0].id;
 await db.query('select salvar_detalhes_evento($1,$2)',[evento,JSON.stringify([{id:d,marcado:true,valor_texto:''}])]);
 assert.equal((await db.query(`select marcado from detalhes_evento where id='${d}'`)).rows[0].marcado,true);
 await db.query('select excluir_evento($1)',[evento]);assert.equal((await db.query(`select * from detalhes_evento where evento_id='${evento}'`)).rows.length,0);
 }finally{await db.close()}
});
