import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('exclusão protege próprio usuário e outros salões; edição e acesso são atômicos',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text unique);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of (await readdir(new URL('../supabase/',import.meta.url))).filter(f=>/^(00[1-9]|01[1-6])_/.test(f)).sort())await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 const [a,b]=(await db.query('select id from saloes order by nome')).rows.map(r=>r.id);
 const admin='00000000-0000-4000-8000-000000000001',limited='00000000-0000-4000-8000-000000000002',client='00000000-0000-4000-8000-000000000003',staff='00000000-0000-4000-8000-000000000004';
 await db.exec(`insert into auth.users values('${admin}','admin@teste.local'),('${limited}','limited@teste.local'),('${client}','client@teste.local'),('${staff}','staff@teste.local');insert into membros(usuario_id,salao_id,perfil) values('${admin}','${a}','gerente'),('${admin}','${b}','gerente'),('${limited}','${a}','gerente'),('${staff}','${a}','secretaria'),('${staff}','${b}','secretaria');set role authenticated;set request.jwt.claim.sub='${admin}';`);
 const ev=(await db.query(`insert into eventos(salao_id,cliente,data,tipo) values('${a}','Antes','2099-01-01','15 Anos') returning *`)).rows[0];
 const payload={cliente:'Depois',data:'2099-01-02',tipo:'15 Anos',status:'reservado',convidados:90,detalhes:{Email:'client@teste.local'}};
 await db.query('select salvar_evento_com_acesso($1,$2,true)',[ev.id,JSON.stringify(payload)]);
 let users=(await db.query('select listar_usuarios() p')).rows[0].p;assert.equal(users.find(u=>u.email==='client@teste.local').validade,'2099-01-03');
 await assert.rejects(db.query('select salvar_evento_com_acesso($1,$2,true)',[ev.id,JSON.stringify({...payload,cliente:'Não salvar'})]));
 assert.equal((await db.query('select cliente from eventos where id=$1',[ev.id])).rows[0].cliente,'Depois');
 await assert.rejects(db.query('select excluir_usuario($1)',['admin@teste.local']));
 await db.exec(`set request.jwt.claim.sub='${limited}'`);await db.query('update saloes set slogan=$1 where id=$2',['Slogan A',a]);assert.equal((await db.query('update saloes set slogan=$1 where id=$2 returning id',['Não permitido',b])).rows.length,0);await assert.rejects(db.query('select excluir_usuario($1)',['staff@teste.local']));
 await db.exec(`set request.jwt.claim.sub='${staff}'`);await assert.rejects(db.query('select excluir_usuario($1)',['client@teste.local']));
 await assert.rejects(db.query('select salvar_evento_com_acesso($1,$2,true)',[ev.id,JSON.stringify({...payload,detalhes:{Email:'outro@teste.local'}})]));
 await db.exec(`set request.jwt.claim.sub='${admin}'`);await db.query('select excluir_usuario($1)',['client@teste.local']);
 assert.equal((await db.query('select id from eventos where id=$1',[ev.id])).rows.length,1);
 assert.ok((await db.query("select id from logs_alteracoes where tabela='acessos_clientes' and acao='DELETE'")).rows.length);
 await db.exec('reset role');assert.equal((await db.query('select id from auth.users where id=$1',[client])).rows.length,0);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${client}'`);assert.equal((await db.query('select meu_evento_resumido() p')).rows[0].p,null);
 await db.exec(`set request.jwt.claim.sub='${admin}'`);
 await db.query('select salvar_evento_com_acesso($1,$2,true)',[ev.id,JSON.stringify(payload)]);
 users=(await db.query('select listar_usuarios() p')).rows[0].p;assert.equal(users.find(u=>u.email==='client@teste.local').usuario_id,null);
 await db.query('select excluir_usuario($1)',['client@teste.local']);
 await db.exec('set role anon');await assert.rejects(db.query('select excluir_usuario($1)',['staff@teste.local']));
 }finally{await db.close()}
});
