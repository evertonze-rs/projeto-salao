-- Executar após 007. Clientes acessam somente um resumo autorizado por função.
begin;
create table public.acessos_clientes (
 email text primary key check(email=lower(trim(email))),
 nome text not null, evento_id uuid not null references public.eventos(id) on delete cascade,
 ativo boolean not null default true, validade date
);
alter table public.acessos_clientes enable row level security;
revoke all on public.acessos_clientes from public,anon,authenticated;
create function public.salvar_usuario(p_email text,p_nome text,p_perfil text,p_saloes uuid[],p_evento uuid,p_ativo boolean,p_validade date)
returns void language plpgsql security definer set search_path='' as $$
declare mail text:=lower(trim(p_email)); uid uuid; sid uuid;
begin
 if auth.uid() is null or nullif(trim(p_nome),'') is null or position('@' in mail)<2 or p_ativo is null or p_perfil is null or p_perfil not in ('gerente','dono','secretaria','cliente') then raise exception 'Dados inválidos';end if;
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
create function public.listar_usuarios() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]') from (
 select a.email,max(a.nome) nome,min(a.perfil) perfil,jsonb_agg(a.salao_id) saloes,
 null::uuid evento_id,bool_and(a.ativo) ativo,min(a.validade) validade,max(u.id::text)::uuid usuario_id
 from public.acessos_autorizados a left join auth.users u on lower(u.email)=a.email
 where public.tem_acesso(a.salao_id,array['gerente']) group by a.email
 union all
 select c.email,c.nome,'cliente','[]'::jsonb,c.evento_id,c.ativo,c.validade,u.id
 from public.acessos_clientes c join public.eventos e on e.id=c.evento_id
 left join auth.users u on lower(u.email)=c.email where public.tem_acesso(e.salao_id,array['gerente'])
 ) x;
$$;
create function public.meu_evento_resumido() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('cliente',e.cliente,'data',e.data,'tipo',e.tipo,'convidados',e.convidados,
 'status',e.status,'salao',s.nome,'tema',s.tema,
 'tarefas_total',(select count(*) from public.tarefas t where t.evento_id=e.id),
 'tarefas_concluidas',(select count(*) from public.tarefas t where t.evento_id=e.id and t.concluida))
 from public.acessos_clientes c join auth.users u on lower(u.email)=c.email
 join public.eventos e on e.id=c.evento_id join public.saloes s on s.id=e.salao_id
 where u.id=auth.uid() and c.ativo
 and (now() at time zone 'America/Sao_Paulo')::date<=e.data
 and (c.validade is null or c.validade>=(now() at time zone 'America/Sao_Paulo')::date);
$$;
revoke all on function public.salvar_usuario(text,text,text,uuid[],uuid,boolean,date),public.listar_usuarios(),public.meu_evento_resumido() from public,anon,authenticated;
grant execute on function public.salvar_usuario(text,text,text,uuid[],uuid,boolean,date),public.listar_usuarios(),public.meu_evento_resumido() to authenticated;
-- A função antiga segue disponível internamente; o aplicativo usa gravação atômica.
revoke execute on function public.salvar_acesso(text,text,uuid,text,boolean,date) from authenticated;
commit;
