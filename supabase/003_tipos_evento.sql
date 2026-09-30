-- Executar uma vez após 001 e 002. Preserva os tipos dos eventos existentes.
begin;
alter table public.catalogo_salao drop constraint catalogo_salao_tipo_check;
alter table public.catalogo_salao add constraint catalogo_salao_tipo_check check(tipo in ('servico','tarefa','tipo_evento'));
insert into public.catalogo_salao(salao_id,tipo,nome,ordem)
select s.id,'tipo_evento',v.nome,v.ordem from (values
 ('Exxcelência','15 Anos',0),('Exxcelência','75 anos',1),
 ('Exxcelência','Formatura',2),('Exxcelência','Casamento',3),
 ('Exxplêndido','15 Anos',0),('Exxplêndido','Casamento',1)
) as v(salao,nome,ordem) join public.saloes s on s.nome=v.salao
on conflict(salao_id,tipo,nome) do nothing;
create function public.validar_tipo_evento() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.tipo is not distinct from old.tipo and new.salao_id=old.salao_id then return new; end if;
 end if;
 if not exists(select 1 from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='tipo_evento' and c.nome=new.tipo and c.ativo) then
  raise exception 'Selecione um tipo de evento ativo no cadastro deste salão';
 end if;
 return new;
end $$;
create trigger evento_tipo_cadastrado before insert or update on public.eventos for each row execute function public.validar_tipo_evento();
revoke all on function public.validar_tipo_evento() from public;
commit;
