-- Executar após 008. Preserva os eventos e históricos.
begin;
alter table public.saloes add column endereco text not null default '',
 add column cnpj text not null default '', add column telefone text not null default '',
 add column email text not null default '', add column logo text not null default ''
 check(length(logo)<1200000 and (logo='' or logo='/brand/exxcelencia.png' or logo ~ '^data:image/(png|jpeg);base64,'));
update public.saloes set logo='/brand/exxcelencia.png' where nome='Exxcelência';
grant update(nome,endereco,cnpj,telefone,email,logo) on public.saloes to authenticated;
create function public.criar_evento(p_dados jsonb,p_criar_acesso boolean default false)
returns public.eventos language plpgsql set search_path='' as $$
declare ev public.eventos; mail text:=lower(trim(coalesce(p_dados->'detalhes'->>'Email','')));
begin
 if p_criar_acesso and (mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Informe um e-mail válido para o cliente';end if;
 insert into public.eventos(salao_id,cliente,data,tipo,convidados,detalhes)
 values((p_dados->>'salao_id')::uuid,trim(p_dados->>'cliente'),(p_dados->>'data')::date,p_dados->>'tipo',nullif(p_dados->>'convidados','')::integer,coalesce(p_dados->'detalhes','{}'::jsonb)) returning * into ev;
 if p_criar_acesso then perform public.autorizar_novo_cliente(mail,ev.cliente,ev.id);end if;
 return ev;
end $$;
create function public.autorizar_novo_cliente(p_email text,p_nome text,p_evento uuid)
returns void language plpgsql security definer set search_path='' as $$
declare ev public.eventos;
begin
 select * into ev from public.eventos where id=p_evento;
 if not found or not public.tem_acesso(ev.salao_id,array['gerente']) then raise exception 'Acesso negado';end if;
 perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)),0));
 if exists(select 1 from public.acessos_autorizados where email=lower(trim(p_email)))
 or exists(select 1 from public.acessos_clientes where email=lower(trim(p_email))) then raise exception 'E-mail já vinculado: gerencie esse acesso em Usuários';end if;
 perform public.salvar_usuario(p_email,p_nome,'cliente','{}'::uuid[],ev.id,true,ev.data+1);
end $$;
create or replace function public.meu_evento_resumido() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('cliente',e.cliente,'data',e.data,'tipo',e.tipo,'convidados',e.convidados,
 'status',e.status,'salao',s.nome,'tema',s.tema,'logo',s.logo,'telefone',s.telefone,
 'tarefas_total',(select count(*) from public.tarefas t where t.evento_id=e.id),
 'tarefas_concluidas',(select count(*) from public.tarefas t where t.evento_id=e.id and t.concluida))
 from public.acessos_clientes c join auth.users u on lower(u.email)=c.email
 join public.eventos e on e.id=c.evento_id join public.saloes s on s.id=e.salao_id
 where u.id=auth.uid() and c.ativo and (now() at time zone 'America/Sao_Paulo')::date<=e.data+1
 and (c.validade is null or c.validade>=(now() at time zone 'America/Sao_Paulo')::date);
$$;
-- Agrupa profissionais repetidos entre salões; conserva nomes históricos nos eventos.
do $$ declare g record; canonical uuid; c record; keepid uuid; roles text[]; begin
 for g in select lower(regexp_replace(trim(nome),'\s+',' ','g')) as chave from public.configuracoes_catalogo
 where tipo='profissional' and not excluido group by 1 having count(*)>1 loop
  select id into canonical from public.configuracoes_catalogo where tipo='profissional' and not excluido and lower(regexp_replace(trim(nome),'\s+',' ','g'))=g.chave order by id limit 1;
  select array_agg(distinct v) into roles from public.configuracoes_catalogo x cross join lateral unnest(x.servicos) v
  where x.tipo='profissional' and not x.excluido and lower(regexp_replace(trim(x.nome),'\s+',' ','g'))=g.chave;
  for c in select distinct s.salao_id from public.catalogo_salao s join public.configuracoes_catalogo x on x.id=s.configuracao_id where x.tipo='profissional' and not x.excluido and lower(regexp_replace(trim(x.nome),'\s+',' ','g'))=g.chave loop
   select s.id into keepid from public.catalogo_salao s join public.configuracoes_catalogo x on x.id=s.configuracao_id where s.salao_id=c.salao_id and x.tipo='profissional' and not x.excluido and lower(regexp_replace(trim(x.nome),'\s+',' ','g'))=g.chave order by s.ativo desc,s.id limit 1;
   update public.catalogo_salao s set configuracao_id=null,ativo=false where s.salao_id=c.salao_id and s.id<>keepid and s.configuracao_id in(select x.id from public.configuracoes_catalogo x where x.tipo='profissional' and not x.excluido and lower(regexp_replace(trim(x.nome),'\s+',' ','g'))=g.chave);
   update public.catalogo_salao set configuracao_id=canonical,servicos=roles where id=keepid;
  end loop;
  update public.configuracoes_catalogo set servicos=roles where id=canonical;
  update public.configuracoes_catalogo set excluido=true where tipo='profissional' and id<>canonical and lower(regexp_replace(trim(nome),'\s+',' ','g'))=g.chave;
 end loop;
end $$;
revoke all on function public.criar_evento(jsonb,boolean),public.autorizar_novo_cliente(text,text,uuid) from public,anon,authenticated;
grant execute on function public.criar_evento(jsonb,boolean),public.autorizar_novo_cliente(text,text,uuid) to authenticated;
commit;
