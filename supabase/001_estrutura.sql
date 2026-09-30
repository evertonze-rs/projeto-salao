-- Projeto Salão: executar uma vez no SQL Editor do projeto novo.
-- Não importa clientes nem concede acesso a usuários automaticamente.
begin;
create table public.saloes (
 id uuid primary key default gen_random_uuid(), nome text not null unique
);
create table public.membros (
 usuario_id uuid not null references auth.users(id),
 salao_id uuid not null references public.saloes(id),
 perfil text not null check (perfil in ('gerente','dono','secretaria')),
 primary key (usuario_id,salao_id)
);
create function public.tem_acesso(unidade uuid, perfis text[])
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.membros m where m.usuario_id = auth.uid()
 and m.salao_id = unidade and m.perfil = any(perfis));
$$;
revoke all on function public.tem_acesso(uuid,text[]) from public;
grant execute on function public.tem_acesso(uuid,text[]) to authenticated;
create table public.eventos (
 id uuid primary key default gen_random_uuid(),
 salao_id uuid not null references public.saloes(id),
 cliente text not null check(length(trim(cliente))>0), data date not null,
 tipo text not null default '', convidados integer check(convidados>=0),
 status text not null default 'reservado' check(status in ('reservado','confirmado','realizado','cancelado')),
 detalhes jsonb not null default '{}', criado_em timestamptz not null default now(),
 unique(id,salao_id)
);
create table public.itens_evento (
 id uuid primary key default gen_random_uuid(), evento_id uuid not null, salao_id uuid not null,
 descricao text not null, categoria text not null check(categoria in ('pacote','extra')),
 quantidade numeric(12,3) not null default 1 check(quantidade>=0),
 valor_unitario numeric(12,2) not null check(valor_unitario>=0),
 total numeric(14,2) generated always as (round(quantidade*valor_unitario,2)) stored,
 foreign key(evento_id,salao_id) references public.eventos(id,salao_id)
);
create table public.pagamentos (
 id uuid primary key default gen_random_uuid(), evento_id uuid not null, salao_id uuid not null,
 data date not null, valor numeric(12,2) not null check(valor>0), detalhe text not null default '',
 criado_em timestamptz not null default now(),
 foreign key(evento_id,salao_id) references public.eventos(id,salao_id)
);
create table public.tarefas (
 id uuid primary key default gen_random_uuid(), evento_id uuid not null, salao_id uuid not null,
 titulo text not null, concluida boolean not null default false, prazo date,
 foreign key(evento_id,salao_id) references public.eventos(id,salao_id)
);
create index eventos_salao_data on public.eventos(salao_id,data);
create index itens_evento_evento on public.itens_evento(evento_id);
create index pagamentos_evento on public.pagamentos(evento_id);
create index tarefas_evento on public.tarefas(evento_id);
alter table public.saloes enable row level security;
alter table public.membros enable row level security;
alter table public.eventos enable row level security;
alter table public.itens_evento enable row level security;
alter table public.pagamentos enable row level security;
alter table public.tarefas enable row level security;
revoke all on public.saloes,public.membros,public.eventos,public.itens_evento,public.pagamentos,public.tarefas from anon,authenticated;
grant select on public.saloes,public.membros to authenticated;
grant select,insert,update on public.eventos,public.itens_evento,public.pagamentos,public.tarefas to authenticated;
create policy membros_proprios on public.membros for select to authenticated using(usuario_id=auth.uid());
create policy saloes_autorizados on public.saloes for select to authenticated using(public.tem_acesso(id,array['gerente','dono','secretaria']));
create policy eventos_leitura on public.eventos for select to authenticated using(public.tem_acesso(salao_id,array['gerente','dono','secretaria']));
create policy eventos_criacao on public.eventos for insert to authenticated with check(public.tem_acesso(salao_id,array['gerente']));
create policy eventos_edicao on public.eventos for update to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
create policy tarefas_leitura on public.tarefas for select to authenticated using(public.tem_acesso(salao_id,array['gerente','dono','secretaria']));
create policy tarefas_criacao on public.tarefas for insert to authenticated with check(public.tem_acesso(salao_id,array['gerente']));
create policy tarefas_edicao on public.tarefas for update to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
-- Financeiro inicialmente exclusivo da gerente, até definição das permissões do dono.
create policy itens_gerente on public.itens_evento for all to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
create policy pagamentos_gerente on public.pagamentos for all to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
insert into public.saloes(nome) values ('Exxcelência'),('Exxplêndido');
commit;
