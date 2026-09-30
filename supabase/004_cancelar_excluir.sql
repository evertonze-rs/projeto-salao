-- Executar uma vez após 003. Não cancela nem exclui nenhum evento.
begin;
alter table public.eventos add column cancelamento_justificativa text,
 add column cancelado_em timestamptz, add column cancelado_por uuid references auth.users(id);
create function public.validar_cancelamento() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='cancelado' then
  if TG_OP='INSERT' or old.status is distinct from new.status or new.cancelamento_justificativa is distinct from old.cancelamento_justificativa then
   if nullif(trim(new.cancelamento_justificativa),'') is null then raise exception 'Informe a justificativa do cancelamento';end if;
   new.cancelamento_justificativa:=trim(new.cancelamento_justificativa);
   new.cancelado_em:=now();new.cancelado_por:=auth.uid();
  else new.cancelado_em:=old.cancelado_em;new.cancelado_por:=old.cancelado_por;
  end if;
 elsif TG_OP='UPDATE' then
  -- Mantém o último motivo como histórico mesmo se o evento for reativado.
  new.cancelamento_justificativa:=old.cancelamento_justificativa;
  new.cancelado_em:=old.cancelado_em;new.cancelado_por:=old.cancelado_por;
 else new.cancelamento_justificativa:=null;new.cancelado_em:=null;new.cancelado_por:=null;
 end if;
 return new;
end $$;
create trigger evento_cancelamento before insert or update on public.eventos for each row execute function public.validar_cancelamento();
create function public.excluir_evento(evento_alvo uuid) returns void
language plpgsql security definer set search_path='' as $$
declare unidade uuid;
begin
 select salao_id into unidade from public.eventos where id=evento_alvo for update;
 if not found or not public.tem_acesso(unidade,array['gerente']) then raise exception 'Evento inexistente ou acesso negado';end if;
 delete from public.pagamentos where evento_id=evento_alvo;
 delete from public.itens_evento where evento_id=evento_alvo;
 delete from public.tarefas where evento_id=evento_alvo;
 delete from public.eventos where id=evento_alvo;
end $$;
revoke all on function public.validar_cancelamento(),public.excluir_evento(uuid) from public,anon,authenticated;
grant execute on function public.excluir_evento(uuid) to authenticated;
commit;
