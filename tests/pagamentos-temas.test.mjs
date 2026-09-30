import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('temas por salão e dados do pagamento preservam as permissões',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
 for(const file of ['001_estrutura.sql','002_catalogos.sql','003_tipos_evento.sql','004_cancelar_excluir.sql','005_configuracoes_gerais.sql','006_pagamentos_temas.sql'])await db.exec(await readFile(new URL(`../supabase/${file}`,import.meta.url),'utf8'));
 const saloes=(await db.query('select * from saloes order by nome')).rows;
 const [a,b]=saloes.map(s=>s.id),user='00000000-0000-4000-8000-000000000001',secretary='00000000-0000-4000-8000-000000000002';
 assert.equal(saloes[0].tema,'azul');assert.equal(saloes[1].tema,'verde');
 await db.exec(`insert into auth.users values ('${user}'),('${secretary}');insert into membros values ('${user}','${a}','gerente'),('${secretary}','${a}','secretaria');set role authenticated;set request.jwt.claim.sub='${user}';`);
 await db.exec(`update saloes set tema='roxo' where id='${a}'`);
 assert.equal((await db.query(`select tema from saloes where id='${a}'`)).rows[0].tema,'roxo');
 await assert.rejects(db.exec(`update saloes set nome='Não permitido' where id='${a}'`));
 await assert.rejects(db.exec(`update saloes set tema='invalido' where id='${a}'`));
 assert.equal((await db.query(`update saloes set tema='laranja' where id='${b}' returning id`)).rows.length,0);
 const event=(await db.query(`insert into eventos(salao_id,cliente,data,tipo) values ('${a}','Teste','2027-01-01','15 Anos') returning id`)).rows[0].id;
 const payment=(await db.query(`insert into pagamentos(evento_id,salao_id,data,valor,forma_pagamento,pago_para,detalhe) values ('${event}','${a}','2027-01-01',500,'Pix','Recebedor teste','Entrada') returning *`)).rows[0];
 assert.equal(payment.forma_pagamento,'Pix');assert.equal(payment.pago_para,'Recebedor teste');assert.equal(payment.detalhe,'Entrada');
 await db.exec(`update pagamentos set forma_pagamento='Dinheiro',pago_para='Outro recebedor' where id='${payment.id}'`);
 assert.equal((await db.query(`select detalhe from pagamentos where id='${payment.id}'`)).rows[0].detalhe,'Entrada');
 await db.exec(`set request.jwt.claim.sub='${secretary}'`);
 assert.equal((await db.query(`update saloes set tema='verde' where id='${a}' returning id`)).rows.length,0);
 assert.equal((await db.query('select * from pagamentos')).rows.length,0);
 await assert.rejects(db.exec(`insert into pagamentos(evento_id,salao_id,data,valor) values ('${event}','${a}','2027-01-01',100)`));
 }finally{await db.close()}
});
