-- Executar após 006. Mantém os dados e as permissões existentes.
begin;
alter table public.pagamentos add column natureza text not null default 'recebimento'
 check(natureza in ('recebimento','devolucao'));
-- O valor continua positivo; a natureza determina o sinal no saldo.
alter table public.membros add column ativo boolean not null default true,
 add column validade date, add column nome text not null default '';
create or replace function public.tem_acesso(unidade uuid,perfis text[])
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.membros m where m.usuario_id=auth.uid()
 and m.salao_id=unidade and m.perfil=any(perfis) and m.ativo
 and (m.validade is null or m.validade >= (now() at time zone 'America/Sao_Paulo')::date));
$$;
create table public.acessos_autorizados (
 email text not null check(email=lower(trim(email)) and position('@' in email)>1),
 salao_id uuid not null references public.saloes(id), nome text not null,
 perfil text not null check(perfil in ('gerente','dono','secretaria')),
 ativo boolean not null default true, validade date,
 primary key(email,salao_id)
);
alter table public.acessos_autorizados enable row level security;
revoke all on public.acessos_autorizados from public,anon,authenticated;
-- Importa autorizações atuais, sem alterar o acesso do administrador de teste.
insert into public.acessos_autorizados(email,salao_id,nome,perfil,ativo,validade)
select lower(trim(u.email)),m.salao_id,m.nome,m.perfil,m.ativo,m.validade
from public.membros m join auth.users u on u.id=m.usuario_id where u.email is not null;
create function public.listar_acessos()
returns table(email text,salao_id uuid,nome text,perfil text,ativo boolean,validade date,usuario_id uuid)
language sql stable security definer set search_path='' as $$
 select a.email,a.salao_id,a.nome,a.perfil,a.ativo,a.validade,u.id
 from public.acessos_autorizados a left join auth.users u on lower(u.email)=a.email
 where public.tem_acesso(a.salao_id,array['gerente']) order by a.nome,a.email;
$$;
create function public.salvar_acesso(p_email text,p_nome text,p_salao uuid,p_perfil text,p_ativo boolean,p_validade date)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid; mail text:=lower(trim(p_email));
begin
 if not public.tem_acesso(p_salao,array['gerente']) then raise exception 'Acesso negado';end if;
 if nullif(trim(p_nome),'') is null or p_perfil not in ('gerente','dono','secretaria') or p_ativo is null then raise exception 'Dados inválidos';end if;
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
-- O cadastro no Auth nunca escolhe o perfil: somente autorizações administrativas.
create function public.vincular_usuario_autorizado() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.membros(usuario_id,salao_id,perfil,ativo,validade,nome)
 select new.id,a.salao_id,a.perfil,a.ativo,a.validade,a.nome from public.acessos_autorizados a
 where a.email=lower(new.email)
 on conflict(usuario_id,salao_id) do nothing;
 return new;
end $$;
create trigger salao_novo_usuario after insert on auth.users for each row execute function public.vincular_usuario_autorizado();
revoke all on function public.listar_acessos(),public.salvar_acesso(text,text,uuid,text,boolean,date),public.vincular_usuario_autorizado() from public,anon,authenticated;
grant execute on function public.listar_acessos(),public.salvar_acesso(text,text,uuid,text,boolean,date) to authenticated;
commit;
