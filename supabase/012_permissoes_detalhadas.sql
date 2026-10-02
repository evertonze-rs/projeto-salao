-- Aplicar uma vez, após 011. Preserva os acessos atuais na conversão.
begin;
alter table public.perfis_acesso
 add column eventos_visualizar boolean not null default true,
 add column eventos_criar boolean not null default false,
 add column eventos_excluir boolean not null default false,
 add column tarefas_visualizar boolean not null default true,
 add column financeiro_visualizar boolean not null default false,
 add column relatorios boolean not null default true;
update public.perfis_acesso set eventos_criar=eventos_editar,eventos_excluir=eventos_editar,financeiro_visualizar=financeiro;
update public.perfis_acesso set eventos_visualizar=false,tarefas_visualizar=false,relatorios=false where codigo='cliente';

create or replace function public.tem_permissao(unidade uuid,permissao text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.membros m join public.perfis_acesso p on p.codigo=m.perfil
 where m.usuario_id=auth.uid() and m.salao_id=unidade and m.ativo
 and (m.validade is null or m.validade >= (now() at time zone 'America/Sao_Paulo')::date)
 and (p.administrar or case permissao
 when 'salao' then true when 'consultar' then p.eventos_visualizar
 when 'eventos_visualizar' then p.eventos_visualizar
 when 'eventos_criar' then p.eventos_visualizar and p.eventos_criar
 when 'eventos_editar' then p.eventos_visualizar and p.eventos_editar
 when 'eventos_excluir' then p.eventos_visualizar and p.eventos_excluir
 when 'tarefas_visualizar' then p.eventos_visualizar and p.tarefas_visualizar
 when 'tarefas_editar' then p.eventos_visualizar and p.tarefas_visualizar and p.tarefas_editar
 when 'financeiro_visualizar' then p.eventos_visualizar and p.financeiro_visualizar
 when 'financeiro' then p.eventos_visualizar and p.financeiro_visualizar and p.financeiro
 when 'relatorios' then p.eventos_visualizar and p.relatorios
 else false end));
$$;
alter policy saloes_autorizados on public.saloes using(public.tem_permissao(id,'salao'));
alter policy eventos_criacao on public.eventos with check(public.tem_permissao(salao_id,'eventos_criar'));
alter policy tarefas_leitura on public.tarefas using(public.tem_permissao(salao_id,'tarefas_visualizar'));
drop policy itens_gerente on public.itens_evento;
drop policy pagamentos_gerente on public.pagamentos;
create policy itens_consulta on public.itens_evento for select to authenticated using(public.tem_permissao(salao_id,'financeiro_visualizar'));
create policy itens_criacao on public.itens_evento for insert to authenticated with check(public.tem_permissao(salao_id,'financeiro'));
create policy itens_edicao on public.itens_evento for update to authenticated using(public.tem_permissao(salao_id,'financeiro')) with check(public.tem_permissao(salao_id,'financeiro'));
create policy pagamentos_consulta on public.pagamentos for select to authenticated using(public.tem_permissao(salao_id,'financeiro_visualizar'));
create policy pagamentos_criacao on public.pagamentos for insert to authenticated with check(public.tem_permissao(salao_id,'financeiro'));
create policy pagamentos_edicao on public.pagamentos for update to authenticated using(public.tem_permissao(salao_id,'financeiro')) with check(public.tem_permissao(salao_id,'financeiro'));

create function public.salvar_perfil_detalhado(p_codigo text,p_nome text,p_acessos jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare cod text:=coalesce(p_codigo,'perfil_'||gen_random_uuid()::text); a jsonb:=p_acessos; k text;
begin
 if not public.administrador_global() then raise exception 'É necessário administrar todos os salões';end if;
 if cod in ('gerente','cliente') then raise exception 'Perfil reservado';end if;
 if p_codigo is not null and not exists(select 1 from public.perfis_acesso where codigo=cod) then raise exception 'Perfil inexistente';end if;
 if a is null or jsonb_typeof(a)<>'object' then raise exception 'Permissões inválidas';end if;
 for k in select jsonb_object_keys(a) loop
  if k not in ('eventos_visualizar','eventos_criar','eventos_editar','eventos_excluir','tarefas_visualizar','tarefas_editar','financeiro_visualizar','financeiro','relatorios','administrar') or jsonb_typeof(a->k)<>'boolean' then raise exception 'Permissão inválida';end if;
 end loop;
 if (coalesce((a->>'eventos_criar')::boolean,false) or coalesce((a->>'eventos_editar')::boolean,false) or coalesce((a->>'eventos_excluir')::boolean,false) or coalesce((a->>'tarefas_visualizar')::boolean,false) or coalesce((a->>'financeiro_visualizar')::boolean,false) or coalesce((a->>'relatorios')::boolean,false)) and not coalesce((a->>'eventos_visualizar')::boolean,false) then raise exception 'Libere a visualização dos eventos';end if;
 if coalesce((a->>'financeiro')::boolean,false) and not coalesce((a->>'financeiro_visualizar')::boolean,false) then raise exception 'Libere a visualização financeira';end if;
 if coalesce((a->>'tarefas_editar')::boolean,false) and not coalesce((a->>'tarefas_visualizar')::boolean,false) then raise exception 'Libere a visualização das tarefas';end if;
 insert into public.perfis_acesso(codigo,nome,eventos_visualizar,eventos_criar,eventos_editar,eventos_excluir,tarefas_visualizar,tarefas_editar,financeiro_visualizar,financeiro,relatorios,administrar)
 values(cod,trim(p_nome),coalesce((a->>'eventos_visualizar')::boolean,false),coalesce((a->>'eventos_criar')::boolean,false),coalesce((a->>'eventos_editar')::boolean,false),coalesce((a->>'eventos_excluir')::boolean,false),coalesce((a->>'tarefas_visualizar')::boolean,false),coalesce((a->>'tarefas_editar')::boolean,false),coalesce((a->>'financeiro_visualizar')::boolean,false),coalesce((a->>'financeiro')::boolean,false),coalesce((a->>'relatorios')::boolean,false),coalesce((a->>'administrar')::boolean,false))
 on conflict(codigo) do update set nome=excluded.nome,eventos_visualizar=excluded.eventos_visualizar,eventos_criar=excluded.eventos_criar,eventos_editar=excluded.eventos_editar,eventos_excluir=excluded.eventos_excluir,tarefas_visualizar=excluded.tarefas_visualizar,tarefas_editar=excluded.tarefas_editar,financeiro_visualizar=excluded.financeiro_visualizar,financeiro=excluded.financeiro,relatorios=excluded.relatorios,administrar=excluded.administrar;
 return cod;
end $$;
revoke all on function public.salvar_perfil_detalhado(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.salvar_perfil_detalhado(text,text,jsonb) to authenticated;
revoke execute on function public.salvar_perfil(text,text,boolean,boolean,boolean,boolean) from authenticated;

create or replace function public.excluir_evento(evento_alvo uuid) returns void language plpgsql security definer set search_path='' as $$
declare unidade uuid;
begin
 select salao_id into unidade from public.eventos where id=evento_alvo for update;
 if not found or not public.tem_permissao(unidade,'eventos_excluir') then raise exception 'Evento inexistente ou acesso negado';end if;
 delete from public.detalhes_evento where evento_id=evento_alvo;
 delete from public.pagamentos where evento_id=evento_alvo;
 delete from public.itens_evento where evento_id=evento_alvo;
 delete from public.tarefas where evento_id=evento_alvo;
 delete from public.eventos where id=evento_alvo;
end $$;
commit;
