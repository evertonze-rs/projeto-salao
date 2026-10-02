-- Aplicar depois de 013. Preserva os dados e as permissões existentes.
begin;
create or replace function public.meu_perfil() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('nome',coalesce(n.nome,nullif(p.nome,''),u.email),
 'nome_cadastro',n.nome,'email',u.email,'foto',coalesce(p.foto,''))
 from auth.users u
 left join public.perfil_pessoal p on p.usuario_id=u.id
 left join lateral (select coalesce(
 (select nullif(trim(m.nome),'') from public.membros m where m.usuario_id=u.id and nullif(trim(m.nome),'') is not null order by m.salao_id limit 1),
 (select nullif(trim(c.nome),'') from public.acessos_clientes c where c.email=lower(u.email))) nome) n on true
 where u.id=auth.uid();
$$;
revoke all on function public.meu_perfil() from public,anon;
grant execute on function public.meu_perfil() to authenticated;
commit;
