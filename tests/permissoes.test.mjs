import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('isolamento por salão, financeiro restrito e proteção contra autoelevação',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated;
 grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/001_estrutura.sql',import.meta.url),'utf8'));
 const units=(await db.query('select id from saloes order by nome')).rows;
 const a=units[0].id,b=units[1].id;
 const manager='00000000-0000-4000-8000-000000000001',secretary='00000000-0000-4000-8000-000000000002',unknown='00000000-0000-4000-8000-000000000003';
 await db.exec(`insert into auth.users values ('${manager}'),('${secretary}'),('${unknown}');insert into membros values ('${manager}','${a}','gerente'),('${secretary}','${a}','secretaria');insert into eventos(salao_id,cliente,data) values ('${a}','Teste A','2027-01-01'),('${b}','Teste B','2027-01-02');`);
 const event=(await db.query(`select id from eventos where salao_id='${a}'`)).rows[0].id;
 const eventB=(await db.query(`select id from eventos where salao_id='${b}'`)).rows[0].id;
 await db.exec(`insert into pagamentos(evento_id,salao_id,data,valor) values ('${event}','${a}','2027-01-01',140);set role authenticated;set request.jwt.claim.sub='${secretary}';`);
 assert.equal((await db.query('select * from eventos')).rows.length,1);
 assert.equal((await db.query('select * from pagamentos')).rows.length,0);
 await assert.rejects(db.exec(`insert into eventos(salao_id,cliente,data) values ('${a}','Proibido','2027-01-01')`));
 await assert.rejects(db.exec(`update membros set perfil='gerente'`));
 await db.exec(`set request.jwt.claim.sub='${unknown}'`);
 assert.equal((await db.query('select * from eventos')).rows.length,0);
 await db.exec(`set request.jwt.claim.sub='${manager}'`);
 assert.equal((await db.query('select * from pagamentos')).rows.length,1);
 await db.exec(`insert into eventos(salao_id,cliente,data) values ('${a}','Permitido','2027-01-01')`);
 await assert.rejects(db.exec(`insert into eventos(salao_id,cliente,data) values ('${b}','Proibido','2027-01-01')`));
 await assert.rejects(db.exec(`insert into pagamentos(evento_id,salao_id,data,valor) values ('${eventB}','${a}','2027-01-01',140)`));
 await db.exec(`insert into itens_evento(evento_id,salao_id,descricao,categoria,quantidade,valor_unitario) values ('${event}','${a}','Convidados extras','extra',3,140)`);
 assert.equal(Number((await db.query('select total from itens_evento')).rows[0].total),420);
 }finally{await db.close()}
});
