-- Aplicar uma vez após 012. Logs começam nesta atualização; não recriam o passado.
begin;
create table public.perfil_pessoal (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 nome text not null default '' check(length(nome)<=120),
 foto text not null default '' check(length(foto)<=150000 and (foto='' or foto ~ '^data:image/(png|jpeg);base64,'))
);
alter table public.perfil_pessoal enable row level security;
revoke all on public.perfil_pessoal from public,anon,authenticated;
grant select on public.perfil_pessoal to authenticated;
create policy perfil_proprio on public.perfil_pessoal for select to authenticated using(usuario_id=auth.uid());

create function public.meu_perfil() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('nome',coalesce(nullif(p.nome,''),
 (select nullif(m.nome,'') from public.membros m where m.usuario_id=u.id order by m.salao_id limit 1),
 (select c.nome from public.acessos_clientes c where c.email=lower(u.email)),u.email),
 'email',u.email,'foto',coalesce(p.foto,''))
 from auth.users u left join public.perfil_pessoal p on p.usuario_id=u.id where u.id=auth.uid();
$$;
create function public.salvar_meu_perfil(p_nome text,p_foto text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre no sistema';end if;
 insert into public.perfil_pessoal(usuario_id,nome,foto) values(auth.uid(),trim(coalesce(p_nome,'')),coalesce(p_foto,''))
 on conflict(usuario_id) do update set nome=excluded.nome,foto=excluded.foto;
 return public.meu_perfil();
end $$;

create table public.logs_alteracoes (
 id bigint generated always as identity primary key,
 criado_em timestamptz not null default now(), usuario_id uuid,
 autor text not null, autor_email text, salao_id uuid,
 tabela text not null, acao text not null check(acao in ('INSERT','UPDATE','DELETE')),
 registro text not null, campos text[] not null, antes jsonb, depois jsonb
);
create index logs_data on public.logs_alteracoes(criado_em desc,id desc);
create index logs_salao on public.logs_alteracoes(salao_id,criado_em desc);
alter table public.logs_alteracoes enable row level security;
revoke all on public.logs_alteracoes from public,anon,authenticated;
grant select on public.logs_alteracoes to authenticated;
create policy logs_consulta on public.logs_alteracoes for select to authenticated using(
 case when salao_id is null then public.administrador_global() else public.tem_permissao(salao_id,'administrar') end
);
-- Não registra imagens completas nem credenciais. Auth/senhas não recebem gatilhos.
create function public.registrar_alteracao() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb; d jsonb; rowdata jsonb; sid uuid; actor text; mail text; changes text[]; rid text;
begin
 if TG_OP<>'INSERT' then a:=to_jsonb(old);end if;
 if TG_OP<>'DELETE' then d:=to_jsonb(new);end if;
 if a is not distinct from d then return null;end if;
 select array_agg(k order by k) into changes from (
 select key k from jsonb_object_keys(coalesce(a,'{}')||coalesce(d,'{}')) key
 where a->key is distinct from d->key) keys;
 rowdata:=coalesce(d,a);
 sid:=nullif(rowdata->>'salao_id','')::uuid;
 if TG_TABLE_NAME='saloes' then sid:=(rowdata->>'id')::uuid;end if;
 if TG_TABLE_NAME='acessos_clientes' then select salao_id into sid from public.eventos where id=(rowdata->>'evento_id')::uuid;end if;
 select u.email,coalesce(nullif(p.nome,''),(select nullif(m.nome,'') from public.membros m where m.usuario_id=u.id order by m.salao_id limit 1),u.email)
 into mail,actor from auth.users u left join public.perfil_pessoal p on p.usuario_id=u.id where u.id=auth.uid();
 rid:=coalesce(rowdata->>'id',rowdata->>'codigo',rowdata->>'email',rowdata->>'usuario_id',rowdata->>'salao_id','');
 -- Imagens são substituídas por indicadores, preservando o campo alterado.
 if a ? 'foto' then a:=jsonb_set(a,'{foto}',to_jsonb(case when a->>'foto'='' then 'Sem foto' else 'Foto cadastrada' end));end if;
 if d ? 'foto' then d:=jsonb_set(d,'{foto}',to_jsonb(case when d->>'foto'='' then 'Sem foto' else 'Foto cadastrada' end));end if;
 if a ? 'logo' then a:=jsonb_set(a,'{logo}',to_jsonb(case when a->>'logo'='' then 'Sem logo' else 'Logo cadastrado' end));end if;
 if d ? 'logo' then d:=jsonb_set(d,'{logo}',to_jsonb(case when d->>'logo'='' then 'Sem logo' else 'Logo cadastrado' end));end if;
 if TG_OP='UPDATE' then
  select jsonb_object_agg(key,value) into a from jsonb_each(a) where key=any(changes);
  select jsonb_object_agg(key,value) into d from jsonb_each(d) where key=any(changes);
 end if;
 insert into public.logs_alteracoes(usuario_id,autor,autor_email,salao_id,tabela,acao,registro,campos,antes,depois)
 values(auth.uid(),coalesce(actor,'Sistema / SQL'),mail,sid,TG_TABLE_NAME,TG_OP,rid,coalesce(changes,'{}'),a,d);
 return null;
end $$;
do $$ declare t text; begin
 foreach t in array array['eventos','itens_evento','pagamentos','tarefas','detalhes_evento','saloes','membros','acessos_autorizados','acessos_clientes','perfis_acesso','configuracoes_catalogo','catalogo_salao','portal_config','perfil_pessoal'] loop
  execute format('create trigger auditar_alteracao after insert or update or delete on public.%I for each row execute function public.registrar_alteracao()',t);
 end loop;
end $$;
revoke all on function public.meu_perfil(),public.salvar_meu_perfil(text,text),public.registrar_alteracao() from public,anon,authenticated;
grant execute on function public.meu_perfil(),public.salvar_meu_perfil(text,text) to authenticated;
commit;
