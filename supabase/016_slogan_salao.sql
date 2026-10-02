-- Aplicar após 015. Mantém as políticas de administração do salão.
begin;
alter table public.saloes add column slogan text not null default '' check(length(slogan)<=180);
grant update(slogan) on public.saloes to authenticated;
commit;
