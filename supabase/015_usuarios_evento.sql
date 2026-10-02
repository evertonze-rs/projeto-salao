-- Executar após 014. Instala funções; não exclui nenhum usuário ao executar este arquivo.
begin;
create function public.excluir_usuario(p_email text) returns void
language plpgsql security definer set search_path='' as $$
declare mail text:=lower(trim(p_email)); uid uuid; vinculos uuid[];
begin
 if auth.uid() is null or nullif(mail,'') is null then raise exception 'Acesso negado';end if;
 perform pg_advisory_xact_lock(hashtextextended(mail,0));
 select id into uid from auth.users where lower(email)=mail for update;
 if uid=auth.uid() then raise exception 'Não é permitido excluir seu próprio usuário';end if;
 select array_agg(distinct salao_id) into vinculos from (
 select a.salao_id from public.acessos_autorizados a where a.email=mail
 union select m.salao_id from public.membros m where m.usuario_id=uid
 union select e.salao_id from public.acessos_clientes c join public.eventos e on e.id=c.evento_id where c.email=mail
 ) v;
 if coalesce(cardinality(vinculos),0)=0 or exists(select 1 from unnest(vinculos) s where not public.tem_permissao(s,'administrar')) then
 raise exception 'Acesso negado aos vínculos do usuário';end if;
 delete from public.acessos_autorizados where email=mail;
 delete from public.acessos_clientes where email=mail;
 delete from public.membros where usuario_id=uid;
 -- Eventos não pertencem ao usuário de autenticação; os históricos são preservados.
 delete from public.perfil_pessoal where usuario_id=uid;
 delete from auth.users where id=uid;
end $$;
create function public.salvar_evento_com_acesso(p_evento uuid,p_dados jsonb,p_criar_acesso boolean default false)
returns public.eventos language plpgsql set search_path='' as $$
declare ev public.eventos; mail text:=lower(trim(coalesce(p_dados->'detalhes'->>'Email','')));
begin
 if p_criar_acesso and mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Informe um e-mail válido para o cliente';end if;
 update public.eventos set cliente=trim(p_dados->>'cliente'),data=(p_dados->>'data')::date,
 tipo=p_dados->>'tipo',convidados=nullif(p_dados->>'convidados','')::integer,status=p_dados->>'status',
 detalhes=coalesce(p_dados->'detalhes','{}'::jsonb)
 where id=p_evento returning * into ev;
 if not found then raise exception 'Evento não autorizado';end if;
 if p_criar_acesso then perform public.autorizar_novo_cliente(mail,ev.cliente,ev.id);end if;
 return ev;
end $$;
revoke all on function public.excluir_usuario(text),public.salvar_evento_com_acesso(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.excluir_usuario(text),public.salvar_evento_com_acesso(uuid,jsonb,boolean) to authenticated;
commit;
