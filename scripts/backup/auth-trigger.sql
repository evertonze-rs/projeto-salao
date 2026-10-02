-- Aplicar SOMENTE no destino restaurado, depois da importação dos dados.
-- O schema.sql restaura public.vincular_usuario_autorizado.
drop trigger if exists salao_novo_usuario on auth.users;
create trigger salao_novo_usuario after insert on auth.users
for each row execute function public.vincular_usuario_autorizado();
