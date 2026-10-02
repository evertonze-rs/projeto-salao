import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('identidade, agrupamento dos profissionais e cadastro de evento com acesso atômico',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text unique);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const f of ['001_estrutura','002_catalogos','003_tipos_evento','004_cancelar_excluir','005_configuracoes_gerais','006_pagamentos_temas','007_devolucoes_usuarios','008_clientes_multissalao'])await db.exec(await readFile(new URL(`../supabase/${f}.sql`,import.meta.url),'utf8'));
 const [a,b]=(await db.query('select id from saloes order by nome')).rows.map(r=>r.id),admin='00000000-0000-4000-8000-000000000001';
 await db.exec(`insert into auth.users values('${admin}','admin@teste.local');insert into membros(usuario_id,salao_id,perfil) values('${admin}','${a}','gerente'),('${admin}','${b}','gerente');set request.jwt.claim.sub='${admin}';`);
 for(const [id,roles] of [[a,['Fotos']],[b,['Filmagem']]])await db.query("select salvar_configuracao(null,'profissional','Fotógrafo Teste','item','texto',$1,$2)",[roles,[id]]);
 await db.exec(await readFile(new URL('../supabase/009_identidade_contatos.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select * from configuracoes_catalogo where tipo='profissional' and not excluido")).rows.length,1);
 assert.equal((await db.query("select * from catalogo_salao where tipo='profissional' and ativo")).rows.length,2);
 await db.exec('set role authenticated');
 const values={salao_id:a,cliente:'Cliente teste',data:'2099-01-01',tipo:'15 Anos',convidados:100,detalhes:{Email:'cliente@teste.local',Telefone:'51999990000'}};
 const ev=(await db.query('select * from criar_evento($1,true)',[JSON.stringify(values)])).rows[0];
 assert.equal(ev.detalhes.Telefone,'51999990000');
 const list=(await db.query('select listar_usuarios() as data')).rows[0].data;
 const client=list.find(x=>x.email==='cliente@teste.local');assert.equal(client.validade,'2099-01-02');assert.equal(client.evento_id,ev.id);
 const count=(await db.query('select count(*) n from eventos')).rows[0].n;
 await assert.rejects(db.query('select criar_evento($1,true)',[JSON.stringify({...values,cliente:'Não deve ser criado'})]));
 assert.equal((await db.query('select count(*) n from eventos')).rows[0].n,count);
 await db.query('update saloes set endereco=$1,telefone=$2 where id=$3',['Rua de teste','123',a]);
 await assert.rejects(db.query('update saloes set logo=$1 where id=$2',['https://externo.invalid/logo.svg',a]));
 }finally{await db.close()}
});
