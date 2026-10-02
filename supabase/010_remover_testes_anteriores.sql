-- Somente eventos locais anteriores à importação, conforme solicitado.
-- Guarda cópia integral antes de excluir. Não toca em eventos importados ou posteriores.
begin;
create table if not exists public.backup_eventos_teste (
 evento_id uuid primary key, dados jsonb not null, arquivado_em timestamptz not null default now()
);
alter table public.backup_eventos_teste enable row level security;
revoke all on public.backup_eventos_teste from public,anon,authenticated;
do $$ declare limite timestamptz; ev record; quantidade integer; begin
 if (select count(*) from public.eventos where detalhes ? '_origem')<201 then raise exception 'A importação completa precisa estar concluída antes da limpeza';end if;
 select min(criado_em) into limite from public.eventos where detalhes ? '_origem';
 select count(*) into quantidade from public.eventos where not (detalhes ? '_origem') and criado_em<limite;
 if quantidade>20 then raise exception 'Mais de 20 eventos anteriores encontrados. Revise os candidatos antes de continuar';end if;
 for ev in select * from public.eventos where not (detalhes ? '_origem') and criado_em<limite for update loop
  insert into public.backup_eventos_teste(evento_id,dados) values(ev.id,jsonb_build_object(
   'evento',to_jsonb(ev),'servicos',(select coalesce(jsonb_agg(t),'[]') from public.itens_evento t where evento_id=ev.id),
   'pagamentos',(select coalesce(jsonb_agg(t),'[]') from public.pagamentos t where evento_id=ev.id),
   'tarefas',(select coalesce(jsonb_agg(t),'[]') from public.tarefas t where evento_id=ev.id),
   'detalhes',(select coalesce(jsonb_agg(t),'[]') from public.detalhes_evento t where evento_id=ev.id),
   'clientes',(select coalesce(jsonb_agg(t),'[]') from public.acessos_clientes t where evento_id=ev.id))) on conflict do nothing;
  delete from public.detalhes_evento where evento_id=ev.id;
  delete from public.itens_evento where evento_id=ev.id;
  delete from public.pagamentos where evento_id=ev.id;
  delete from public.tarefas where evento_id=ev.id;
  delete from public.eventos where id=ev.id;
 end loop;
end $$;
commit;
select dados->'evento'->>'cliente' as teste_removido,dados->'evento'->>'data' as data from public.backup_eventos_teste order by arquivado_em;
