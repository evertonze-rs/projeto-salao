-- Executar após 009. A limpeza opcional 010 é independente desta atualização.
begin;
create table public.perfis_acesso (
 codigo text primary key, nome text not null check(length(trim(nome)) between 1 and 80),
 eventos_editar boolean not null default false, tarefas_editar boolean not null default false,
 financeiro boolean not null default false, administrar boolean not null default false,
 sistema boolean not null default false
);
insert into public.perfis_acesso values
 ('gerente','Gerente',true,true,true,true,true),
 ('dono','Dono',false,false,false,false,true),
 ('secretaria','Secretária',false,false,false,false,true),
 ('cliente','Cliente',false,false,false,false,true);
alter table public.perfis_acesso enable row level security;
revoke all on public.perfis_acesso from public,anon,authenticated;
grant select on public.perfis_acesso to authenticated;
create policy perfis_leitura on public.perfis_acesso for select to authenticated using (
 exists(select 1 from public.membros m where m.usuario_id=auth.uid() and m.ativo
 and (m.validade is null or m.validade >= (now() at time zone 'America/Sao_Paulo')::date))
);
alter table public.membros drop constraint membros_perfil_check;
alter table public.acessos_autorizados drop constraint acessos_autorizados_perfil_check;
alter table public.membros add foreign key(perfil) references public.perfis_acesso(codigo), add check(perfil<>'cliente');
alter table public.acessos_autorizados add foreign key(perfil) references public.perfis_acesso(codigo), add check(perfil<>'cliente');

create function public.tem_permissao(unidade uuid, permissao text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.membros m join public.perfis_acesso p on p.codigo=m.perfil
 where m.usuario_id=auth.uid() and m.salao_id=unidade and m.ativo
 and (m.validade is null or m.validade >= (now() at time zone 'America/Sao_Paulo')::date)
 and (p.administrar or case permissao when 'consultar' then true when 'administrar' then p.administrar
 when 'eventos_editar' then p.eventos_editar when 'tarefas_editar' then p.tarefas_editar
 when 'financeiro' then p.financeiro else false end));
$$;
-- Mantém as funções administrativas anteriores, com perfis agora configuráveis.
create or replace function public.tem_acesso(unidade uuid,perfis text[]) returns boolean
language sql stable security definer set search_path='' as $$
 select public.tem_permissao(unidade,case when perfis=array['gerente'] then 'administrar' else 'consultar' end);
$$;
create function public.administrador_global() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.saloes)
 and not exists(select 1 from public.saloes s where not public.tem_permissao(s.id,'administrar'));
$$;
create function public.salvar_perfil(p_codigo text,p_nome text,p_eventos boolean,p_tarefas boolean,p_financeiro boolean,p_administrar boolean)
returns text language plpgsql security definer set search_path='' as $$
declare cod text:=coalesce(p_codigo,'perfil_'||gen_random_uuid()::text);
begin
 if not public.administrador_global() then raise exception 'É necessário administrar todos os salões para alterar perfis globais';end if;
 if cod in ('gerente','cliente') then raise exception 'Perfil reservado: use as configurações do portal para o cliente';end if;
 if p_codigo is not null and not exists(select 1 from public.perfis_acesso where codigo=cod) then raise exception 'Perfil inexistente';end if;
 insert into public.perfis_acesso(codigo,nome,eventos_editar,tarefas_editar,financeiro,administrar)
 values(cod,trim(p_nome),p_eventos,p_tarefas,p_financeiro,p_administrar)
 on conflict(codigo) do update set nome=excluded.nome,eventos_editar=excluded.eventos_editar,
 tarefas_editar=excluded.tarefas_editar,financeiro=excluded.financeiro,administrar=excluded.administrar;
 return cod;
end $$;
create function public.excluir_perfil(p_codigo text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.administrador_global() then raise exception 'Acesso negado';end if;
 if exists(select 1 from public.perfis_acesso where codigo=p_codigo and sistema) then raise exception 'Perfis padrão não podem ser excluídos';end if;
 if exists(select 1 from public.membros where perfil=p_codigo) or exists(select 1 from public.acessos_autorizados where perfil=p_codigo) then raise exception 'Perfil em uso. Troque os usuários de perfil antes de excluir';end if;
 delete from public.perfis_acesso where codigo=p_codigo;
end $$;

alter policy eventos_criacao on public.eventos with check(public.tem_permissao(salao_id,'eventos_editar'));
alter policy eventos_edicao on public.eventos using(public.tem_permissao(salao_id,'eventos_editar')) with check(public.tem_permissao(salao_id,'eventos_editar'));
alter policy tarefas_criacao on public.tarefas with check(public.tem_permissao(salao_id,'tarefas_editar'));
alter policy tarefas_edicao on public.tarefas using(public.tem_permissao(salao_id,'tarefas_editar')) with check(public.tem_permissao(salao_id,'tarefas_editar'));
alter policy itens_gerente on public.itens_evento using(public.tem_permissao(salao_id,'financeiro')) with check(public.tem_permissao(salao_id,'financeiro'));
alter policy pagamentos_gerente on public.pagamentos using(public.tem_permissao(salao_id,'financeiro')) with check(public.tem_permissao(salao_id,'financeiro'));
alter policy detalhes_criacao on public.detalhes_evento with check(public.tem_permissao(salao_id,'eventos_editar'));
alter policy detalhes_edicao on public.detalhes_evento using(public.tem_permissao(salao_id,'eventos_editar')) with check(public.tem_permissao(salao_id,'eventos_editar'));

create table public.portal_config (
 salao_id uuid primary key references public.saloes(id),
 itens boolean not null default false, valores boolean not null default false,
 pagamentos boolean not null default false, detalhes boolean not null default false,
 checklist boolean not null default false, progresso boolean not null default true,
 contador boolean not null default true, animacao boolean not null default true
);
insert into public.portal_config(salao_id) select id from public.saloes;
alter table public.portal_config enable row level security;
revoke all on public.portal_config from public,anon,authenticated;
grant select,insert,update on public.portal_config to authenticated;
create policy portal_admin on public.portal_config for all to authenticated
 using(public.tem_permissao(salao_id,'administrar')) with check(public.tem_permissao(salao_id,'administrar'));

create or replace function public.meu_evento_resumido() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('cliente',e.cliente,'data',e.data,'tipo',e.tipo,'convidados',e.convidados,
 'status',e.status,'salao',s.nome,'tema',s.tema,'logo',s.logo,'telefone',s.telefone,
 'contador',coalesce(c.contador,true),'animacao',coalesce(c.animacao,true))
 || case when coalesce(c.progresso,true) then jsonb_build_object(
 'tarefas_total',(select count(*) from public.tarefas t where t.evento_id=e.id),
 'tarefas_concluidas',(select count(*) from public.tarefas t where t.evento_id=e.id and t.concluida)) else '{}'::jsonb end
 || case when c.itens then jsonb_build_object('itens',coalesce((select jsonb_agg(
 jsonb_build_object('descricao',i.descricao,'quantidade',i.quantidade,'unidade',i.unidade)
 || case when c.valores then jsonb_build_object('total',i.total,'valor_unitario',i.valor_unitario) else '{}'::jsonb end order by i.ordem,i.descricao)
 from public.itens_evento i where i.evento_id=e.id and i.quantidade>0 and i.total>0),'[]'::jsonb)) else '{}'::jsonb end
 || case when c.valores then jsonb_build_object('financeiro',jsonb_build_object(
 'contratado',coalesce((select sum(i.total) from public.itens_evento i where i.evento_id=e.id),0),
 'pago',coalesce((select sum(case when p.natureza='devolucao' then -p.valor else p.valor end) from public.pagamentos p where p.evento_id=e.id),0))) else '{}'::jsonb end
 || case when c.pagamentos then jsonb_build_object('pagamentos',coalesce((select jsonb_agg(jsonb_build_object(
 'data',p.data,'valor',p.valor,'natureza',p.natureza,'forma_pagamento',p.forma_pagamento) order by p.data,p.id)
 from public.pagamentos p where p.evento_id=e.id),'[]'::jsonb)) else '{}'::jsonb end
 || case when c.detalhes then jsonb_build_object('detalhes',coalesce((select jsonb_agg(jsonb_build_object(
 'nome',d.nome,'campo_tipo',d.campo_tipo,'valor_texto',d.valor_texto,'marcado',d.marcado) order by d.ordem,d.nome)
 from public.detalhes_evento d where d.evento_id=e.id),'[]'::jsonb)) else '{}'::jsonb end
 || case when c.checklist then jsonb_build_object('tarefas',coalesce((select jsonb_agg(jsonb_build_object(
 'titulo',t.titulo,'concluida',t.concluida) order by t.ordem,t.titulo)
 from public.tarefas t where t.evento_id=e.id),'[]'::jsonb)) else '{}'::jsonb end
 from public.acessos_clientes a join auth.users u on lower(u.email)=a.email
 join public.eventos e on e.id=a.evento_id join public.saloes s on s.id=e.salao_id
 left join public.portal_config c on c.salao_id=s.id
 where u.id=auth.uid() and a.ativo and (now() at time zone 'America/Sao_Paulo')::date<=e.data+1
 and (a.validade is null or a.validade>=(now() at time zone 'America/Sao_Paulo')::date);
$$;

revoke all on function public.tem_permissao(uuid,text),public.administrador_global(),public.salvar_perfil(text,text,boolean,boolean,boolean,boolean),public.excluir_perfil(text) from public,anon,authenticated;
grant execute on function public.tem_permissao(uuid,text),public.administrador_global(),public.salvar_perfil(text,text,boolean,boolean,boolean,boolean),public.excluir_perfil(text) to authenticated;
-- Funções atualizadas para aceitar perfis configuráveis são adicionadas abaixo.

create or replace function public.salvar_acesso(p_email text,p_nome text,p_salao uuid,p_perfil text,p_ativo boolean,p_validade date)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid; mail text:=lower(trim(p_email));
begin
 if not public.tem_acesso(p_salao,array['gerente']) then raise exception 'Acesso negado';end if;
 if nullif(trim(p_nome),'') is null or not exists(select 1 from public.perfis_acesso where codigo=p_perfil and codigo<>'cliente') or p_ativo is null then raise exception 'Dados inválidos';end if;
 select id into uid from auth.users where lower(email)=mail;
 if uid=auth.uid() then raise exception 'Seu próprio acesso deve ser alterado por outro gerente';end if;
 insert into public.acessos_autorizados(email,salao_id,nome,perfil,ativo,validade)
 values(mail,p_salao,trim(p_nome),p_perfil,p_ativo,p_validade)
 on conflict(email,salao_id) do update set nome=excluded.nome,perfil=excluded.perfil,ativo=excluded.ativo,validade=excluded.validade;
 if uid is not null then
  insert into public.membros(usuario_id,salao_id,perfil,ativo,validade,nome)
  values(uid,p_salao,p_perfil,p_ativo,p_validade,trim(p_nome))
  on conflict(usuario_id,salao_id) do update set perfil=excluded.perfil,ativo=excluded.ativo,validade=excluded.validade,nome=excluded.nome;
 end if;
end $$;
create or replace function public.salvar_usuario(p_email text,p_nome text,p_perfil text,p_saloes uuid[],p_evento uuid,p_ativo boolean,p_validade date)
returns void language plpgsql security definer set search_path='' as $$
declare mail text:=lower(trim(p_email)); uid uuid; sid uuid;
begin
 if auth.uid() is null or nullif(trim(p_nome),'') is null or position('@' in mail)<2 or p_ativo is null or p_perfil is null or not exists(select 1 from public.perfis_acesso where codigo=p_perfil) then raise exception 'Dados inválidos';end if;
 perform pg_advisory_xact_lock(hashtextextended(mail,0));
 select id into uid from auth.users where lower(email)=mail;
 if uid=auth.uid() then raise exception 'Seu próprio acesso deve ser alterado por outro gerente';end if;
 -- Exige autoridade também sobre vínculos anteriores, antes de remover ou trocar perfil.
 if exists(select 1 from public.acessos_autorizados a where a.email=mail and not public.tem_acesso(a.salao_id,array['gerente']))
 or exists(select 1 from public.membros m where m.usuario_id=uid and not public.tem_acesso(m.salao_id,array['gerente']))
 or exists(select 1 from public.acessos_clientes c join public.eventos e on e.id=c.evento_id where c.email=mail and not public.tem_acesso(e.salao_id,array['gerente'])) then raise exception 'Acesso negado aos vínculos existentes';end if;
 if p_perfil='cliente' then
  select salao_id into sid from public.eventos where id=p_evento;
  if sid is null or not public.tem_acesso(sid,array['gerente']) then raise exception 'Evento não autorizado';end if;
 else
  if coalesce(cardinality(p_saloes),0)=0 then raise exception 'Selecione pelo menos um salão';end if;
  foreach sid in array p_saloes loop
   if sid is null or not public.tem_acesso(sid,array['gerente']) then raise exception 'Salão não autorizado';end if;
  end loop;
 end if;
 delete from public.acessos_autorizados where email=mail;
 delete from public.membros where usuario_id=uid;
 delete from public.acessos_clientes where email=mail;
 if p_perfil='cliente' then
  insert into public.acessos_clientes values(mail,trim(p_nome),p_evento,p_ativo,p_validade);
 else
  foreach sid in array p_saloes loop
   perform public.salvar_acesso(mail,p_nome,sid,p_perfil,p_ativo,p_validade);
  end loop;
 end if;
end $$;
create or replace function public.preparar_evento() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.itens_evento(evento_id,salao_id,catalogo_id,descricao,categoria,quantidade,valor_unitario)
 select new.id,new.salao_id,c.id,c.nome,c.categoria,case when c.unidade='item' then 1 else 0 end,0 from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='servico' and c.ativo;
 insert into public.tarefas(evento_id,salao_id,catalogo_id,titulo)
 select new.id,new.salao_id,c.id,c.nome from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='tarefa' and c.ativo;
 insert into public.detalhes_evento(evento_id,salao_id,catalogo_id,nome,campo_tipo)
 select new.id,new.salao_id,c.id,c.nome,c.campo_tipo from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='detalhe' and c.ativo;
 return new;
end $$;
create or replace function public.salvar_servicos_evento(p_evento uuid,p_itens jsonb) returns void language plpgsql set search_path='' as $$
declare v jsonb;
begin
 if not exists(select 1 from public.eventos where id=p_evento and public.tem_permissao(salao_id,'financeiro')) then raise exception 'Acesso negado';end if;
 for v in select * from jsonb_array_elements(p_itens) loop
  update public.itens_evento set quantidade=(v->>'quantidade')::numeric,valor_unitario=(v->>'valor_unitario')::numeric where id=(v->>'id')::uuid and evento_id=p_evento;
  if not found then raise exception 'Serviço inválido';end if;
 end loop;
end $$;
create or replace function public.salvar_detalhes_evento(p_evento uuid,p_itens jsonb) returns void language plpgsql set search_path='' as $$
declare v jsonb;
begin
 if not exists(select 1 from public.eventos where id=p_evento and public.tem_permissao(salao_id,'eventos_editar')) then raise exception 'Acesso negado';end if;
 for v in select * from jsonb_array_elements(p_itens) loop
  update public.detalhes_evento set valor_texto=coalesce(v->>'valor_texto',''),marcado=coalesce((v->>'marcado')::boolean,false) where id=(v->>'id')::uuid and evento_id=p_evento;
  if not found then raise exception 'Detalhe inválido';end if;
 end loop;
end $$;
create or replace function public.excluir_evento(evento_alvo uuid) returns void language plpgsql security definer set search_path='' as $$
declare unidade uuid;
begin
 select salao_id into unidade from public.eventos where id=evento_alvo for update;
 if not found or not public.tem_permissao(unidade,'eventos_editar') then raise exception 'Evento inexistente ou acesso negado';end if;
 delete from public.detalhes_evento where evento_id=evento_alvo;
 delete from public.pagamentos where evento_id=evento_alvo;
 delete from public.itens_evento where evento_id=evento_alvo;
 delete from public.tarefas where evento_id=evento_alvo;
 delete from public.eventos where id=evento_alvo;
end $$;
revoke all on function public.preparar_evento() from public,anon,authenticated;
commit;
