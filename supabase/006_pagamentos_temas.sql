-- Executar uma vez após 005. Preserva todos os pagamentos e salões.
begin;
alter table public.pagamentos
 add column forma_pagamento text not null default '' check(forma_pagamento in ('','Pix','Dinheiro','Cartão de crédito','Cartão de débito','Transferência','Boleto','Cheque','Outro')),
 add column pago_para text not null default '';
alter table public.saloes add column tema text not null default 'verde' check(tema in ('verde','azul','roxo','laranja'));
update public.saloes set tema='azul' where nome='Exxcelência';
update public.saloes set tema='verde' where nome='Exxplêndido';
grant update(tema) on public.saloes to authenticated;
create policy salao_editar_tema on public.saloes for update to authenticated
 using(public.tem_acesso(id,array['gerente'])) with check(public.tem_acesso(id,array['gerente']));
commit;
