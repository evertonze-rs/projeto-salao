import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {resumo} from '../src/finance.mjs';
test('devoluções reduzem recebimento líquido sem alterar o contratado',()=>{
 assert.deepEqual(resumo([{total:900}],[{valor:1000},{valor:100,natureza:'devolucao'}]),{total:900,pago:900,saldo:0});
});
test('gerenciamento limita salões, bloqueia autoalteração, suspende e expira acesso no banco',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text unique);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of ['001_estrutura','002_catalogos','003_tipos_evento','004_cancelar_excluir','005_configuracoes_gerais','006_pagamentos_temas','007_devolucoes_usuarios'])await db.exec(await readFile(new URL(`../supabase/${f}.sql`,import.meta.url),'utf8'));
 const [a,b]=(await db.query('select id from saloes order by nome')).rows.map(r=>r.id);
 const admin='00000000-0000-4000-8000-000000000001',user='00000000-0000-4000-8000-000000000002';
 await db.exec(`insert into auth.users values('${admin}','admin@test.local');insert into membros(usuario_id,salao_id,perfil) values('${admin}','${a}','gerente');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 const save=(salon,role='secretaria',active=true,expires=null,email='user@test.local')=>db.query('select salvar_acesso($1,$2,$3,$4,$5,$6)',[email,'Teste',salon,role,active,expires]);
 await assert.rejects(save(b));await assert.rejects(save(a,'gerente',true,null,'admin@test.local'));
 await save(a);assert.equal((await db.query('select * from listar_acessos()')).rows[0].usuario_id,null);
 await db.exec(`reset role;insert into auth.users values('${user}','user@test.local');set role authenticated;set request.jwt.claim.sub='${user}';`);
 assert.equal((await db.query('select * from saloes')).rows.length,1);
 await assert.rejects(save(a,'gerente'));assert.equal((await db.query('select * from listar_acessos()')).rows.length,0);
 await assert.rejects(db.exec(`update membros set perfil='gerente' where usuario_id='${user}'`));
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save(a,'secretaria',false);
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select * from saloes')).rows.length,0);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save(a,'secretaria',true,'2000-01-01');
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select * from saloes')).rows.length,0);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await save(a,'secretaria',true);
 const ev=(await db.query(`insert into eventos(salao_id,cliente,data,tipo) values('${a}','Teste','2027-01-01','15 Anos') returning id`)).rows[0].id;
 await db.exec(`insert into pagamentos(evento_id,salao_id,data,valor,natureza) values('${ev}','${a}','2027-01-01',100,'devolucao')`);
 await assert.rejects(db.exec(`insert into pagamentos(evento_id,salao_id,data,valor,natureza) values('${ev}','${a}','2027-01-01',-100,'devolucao')`));
 await db.exec(`set request.jwt.claim.sub='${user}'`);assert.equal((await db.query('select * from pagamentos')).rows.length,0);
 }finally{await db.close()}
});
