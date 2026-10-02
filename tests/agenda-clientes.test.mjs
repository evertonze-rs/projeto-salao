import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {hojeSP,filtrarEventos} from '../src/agenda.mjs';
test('agenda inclui hoje e respeita o fuso de São Paulo',()=>{
 assert.equal(hojeSP(new Date('2026-10-02T01:30:00Z')),'2026-10-01');
 const events=['2026-09-30','2026-10-01','2026-10-02'].map((data,i)=>({data,cliente:`Cliente ${i}`,tipo:'15 Anos'}));
 assert.equal(filtrarEventos(events,'proximos','','2026-10-01').length,2);
 assert.equal(filtrarEventos(events,'passados','','2026-10-01').length,1);
 assert.equal(filtrarEventos(events,'todos','cliente 0','2026-10-01').length,1);
});
test('multissalão atômico e cliente isolado, revogado e expirado sem acesso às tabelas internas',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text unique);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of ['001_estrutura','002_catalogos','003_tipos_evento','004_cancelar_excluir','005_configuracoes_gerais','006_pagamentos_temas','007_devolucoes_usuarios','008_clientes_multissalao'])await db.exec(await readFile(new URL(`../supabase/${f}.sql`,import.meta.url),'utf8'));
 const [a,b]=(await db.query('select id from saloes order by nome')).rows.map(r=>r.id);
 const admin='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002',limited='00000000-0000-4000-8000-000000000003',stranger='00000000-0000-4000-8000-000000000004';
 await db.exec(`insert into auth.users values('${admin}','admin@teste.local'),('${user}','user@teste.local'),('${limited}','limited@teste.local'),('${stranger}','stranger@teste.local');insert into membros(usuario_id,salao_id,perfil) values('${admin}','${a}','gerente'),('${admin}','${b}','gerente'),('${limited}','${a}','gerente');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 const ev=(await db.query(`insert into eventos(salao_id,cliente,data,tipo,detalhes) values('${a}','Cliente','2099-01-01','15 Anos','{"segredo":"interno"}') returning id`)).rows[0].id;
 const save=(role,saloes,event=null,active=true,validade=null)=>db.query('select salvar_usuario($1,$2,$3,$4,$5,$6,$7)',['user@teste.local','Teste',role,saloes,event,active,validade]);
 await save('secretaria',[a,b]);await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select * from saloes')).rows.length,2);
 await assert.rejects(save('gerente',[a,b]));
 await db.exec(`set request.jwt.claim.sub='${limited}'`);await assert.rejects(save('secretaria',[a]));
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save('secretaria',[a]);
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select * from saloes')).rows.length,1);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save('cliente',[],ev);
 await db.exec(`set request.jwt.claim.sub='${user}'`);
 for(const table of ['eventos','saloes','tarefas','detalhes_evento','itens_evento','pagamentos','catalogo_salao'])assert.equal((await db.query(`select * from ${table}`)).rows.length,0);
 const summary=(await db.query('select meu_evento_resumido() as data')).rows[0].data;
 assert.equal(summary.cliente,'Cliente');assert.equal(summary.detalhes,undefined);assert.equal(summary.pagamentos,undefined);
 await assert.rejects(db.exec('select * from acessos_clientes'));
 await db.exec(`set request.jwt.claim.sub='${stranger}'`);assert.equal((await db.query('select meu_evento_resumido() as data')).rows[0].data,null);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save('cliente',[],ev,false);
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select meu_evento_resumido() as data')).rows[0].data,null);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save('cliente',[],ev,true,'2000-01-01');
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select meu_evento_resumido() as data')).rows[0].data,null);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save('cliente',[],ev);await db.exec(`update eventos set data='2000-01-01' where id='${ev}'`);
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select meu_evento_resumido() as data')).rows[0].data,null);
 }finally{await db.close()}
});
