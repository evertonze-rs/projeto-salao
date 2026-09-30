-- Executar uma vez depois da migração 001. Preserva os lançamentos existentes.
begin;
create table public.catalogo_salao (
 id uuid primary key default gen_random_uuid(), salao_id uuid not null references public.saloes(id),
 tipo text not null check(tipo in ('servico','tarefa')), nome text not null check(length(trim(nome))>0),
 categoria text not null default 'extra' check(categoria in ('pacote','extra')),
 unidade text not null default 'item' check(unidade in ('item','litros','pessoas')),
 ordem integer not null default 100, ativo boolean not null default true,
 unique(salao_id,tipo,nome), unique(id,salao_id)
);
alter table public.catalogo_salao enable row level security;
revoke all on public.catalogo_salao from anon,authenticated;
grant select,insert,update on public.catalogo_salao to authenticated;
create policy catalogo_leitura on public.catalogo_salao for select to authenticated using(public.tem_acesso(salao_id,array['gerente','dono','secretaria']));
create policy catalogo_criacao on public.catalogo_salao for insert to authenticated with check(public.tem_acesso(salao_id,array['gerente']));
create policy catalogo_edicao on public.catalogo_salao for update to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
alter table public.itens_evento add column catalogo_id uuid, add column unidade text not null default 'item', add column ordem integer not null default 100;
alter table public.tarefas add column catalogo_id uuid, add column ordem integer not null default 100;
alter table public.itens_evento add foreign key(catalogo_id,salao_id) references public.catalogo_salao(id,salao_id), add unique(evento_id,catalogo_id);
alter table public.tarefas add foreign key(catalogo_id,salao_id) references public.catalogo_salao(id,salao_id), add unique(evento_id,catalogo_id);
insert into public.catalogo_salao(salao_id,tipo,nome,categoria,unidade,ordem) select s.id,v.tipo,v.nome,v.categoria,v.unidade,v.ordem from (values
('Exxcelência','servico','Pacote','pacote','item',0),
('Exxcelência','servico','1. Bar','extra','item',1),
('Exxcelência','servico','2. Banner','extra','item',2),
('Exxcelência','servico','3. Espelho','extra','item',3),
('Exxcelência','servico','4. Túnel','extra','item',4),
('Exxcelência','servico','5. Plataforma','extra','item',5),
('Exxcelência','servico','6. Fogos','extra','item',6),
('Exxcelência','servico','7. Robô','extra','item',7),
('Exxcelência','servico','8. Bazuca','extra','item',8),
('Exxcelência','servico','9. Tocha','extra','item',9),
('Exxcelência','servico','10. Borboletas','extra','item',10),
('Exxcelência','servico','11. Quadro','extra','item',11),
('Exxcelência','servico','12.Maqui','extra','item',12),
('Exxcelência','servico','13. Taças','extra','item',13),
('Exxcelência','servico','14. Vídeo externo','extra','item',14),
('Exxcelência','servico','15. Chopp','extra','litros',15),
('Exxcelência','servico','Valor convidados Extras','extra','pessoas',16),
('Exxcelência','tarefa','Boas vindas','extra','item',0),
('Exxcelência','tarefa','Avisos','extra','item',1),
('Exxcelência','tarefa','Degustação','extra','item',2),
('Exxcelência','tarefa','Reunião','extra','item',3),
('Exxcelência','tarefa','Pagas','extra','item',4),
('Exxcelência','tarefa','Cerimônia','extra','item',5),
('Exxcelência','tarefa','Retrô','extra','item',6),
('Exxcelência','tarefa','Lista de conv.','extra','item',7),
('Exxcelência','tarefa','Aviso de pag.','extra','item',8),
('Exxcelência','tarefa','Aviso de ensaio','extra','item',9),
('Exxcelência','tarefa','Quitada','extra','item',10),
('Exxcelência','tarefa','Normas','extra','item',11),
('Exxplêndido','servico','Pacote','pacote','item',0),
('Exxplêndido','servico','1. Bar','extra','item',1),
('Exxplêndido','servico','2. Espelho','extra','item',2),
('Exxplêndido','servico','3. Túnel','extra','item',3),
('Exxplêndido','servico','4. Plataforma','extra','item',4),
('Exxplêndido','servico','5. Fogos','extra','item',5),
('Exxplêndido','servico','6. Robô','extra','item',6),
('Exxplêndido','servico','7. Bazuca','extra','item',7),
('Exxplêndido','servico','8. Tocha','extra','item',8),
('Exxplêndido','servico','9. Borb.','extra','item',9),
('Exxplêndido','servico','10. Quadro','extra','item',10),
('Exxplêndido','servico','11. Taças','extra','item',11),
('Exxplêndido','servico','12. filmagem ext.','extra','item',12),
('Exxplêndido','servico','13. Chopp','extra','litros',13),
('Exxplêndido','servico','Valor conv Extras','extra','pessoas',14),
('Exxplêndido','tarefa','Boas vindas','extra','item',0),
('Exxplêndido','tarefa','Avisos','extra','item',1),
('Exxplêndido','tarefa','Degustação','extra','item',2),
('Exxplêndido','tarefa','Reunião','extra','item',3),
('Exxplêndido','tarefa','Pagas','extra','item',4),
('Exxplêndido','tarefa','Cerimônia','extra','item',5),
('Exxplêndido','tarefa','Retrô','extra','item',6),
('Exxplêndido','tarefa','Lista de conv.','extra','item',7),
('Exxplêndido','tarefa','Aviso de pag.','extra','item',8),
('Exxplêndido','tarefa','Aviso de ensaio','extra','item',9),
('Exxplêndido','tarefa','Quitada','extra','item',10),
('Exxplêndido','tarefa','Normas','extra','item',11)
) as v(salao,tipo,nome,categoria,unidade,ordem) join public.saloes s on s.nome=v.salao;

create function public.validar_item_catalogo() returns trigger language plpgsql set search_path='' as $$
declare c public.catalogo_salao;
begin
 if TG_OP='INSERT' then
  select * into c from public.catalogo_salao where id=new.catalogo_id and salao_id=new.salao_id and ativo;
  if not found then raise exception 'Escolha um item ativo do cadastro do salão'; end if;
  if TG_TABLE_NAME='itens_evento' then
   if c.tipo<>'servico' then raise exception 'Catálogo inválido'; end if;
   new.descricao:=c.nome; new.categoria:=c.categoria;new.unidade:=c.unidade;new.ordem:=c.ordem;
  else
   if c.tipo<>'tarefa' then raise exception 'Catálogo inválido'; end if;
   new.titulo:=c.nome;new.ordem:=c.ordem;
  end if;
 else
  if new.catalogo_id is distinct from old.catalogo_id or new.evento_id<>old.evento_id or new.salao_id<>old.salao_id then raise exception 'Vínculo não pode ser alterado'; end if;
  if TG_TABLE_NAME='itens_evento' then
   new.descricao:=old.descricao;new.categoria:=old.categoria;new.unidade:=old.unidade;new.ordem:=old.ordem;
  else new.titulo:=old.titulo;new.ordem:=old.ordem;
  end if;
 end if;
 return new;
end $$;
create trigger validar_servico before insert or update on public.itens_evento for each row execute function public.validar_item_catalogo();
create trigger validar_tarefa before insert or update on public.tarefas for each row execute function public.validar_item_catalogo();
create function public.preparar_evento() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.itens_evento(evento_id,salao_id,catalogo_id,descricao,categoria,quantidade,valor_unitario)
 select new.id,new.salao_id,c.id,c.nome,c.categoria,case when c.unidade='item' then 1 else 0 end,0
 from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='servico' and c.ativo;
 insert into public.tarefas(evento_id,salao_id,catalogo_id,titulo)
 select new.id,new.salao_id,c.id,c.nome from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='tarefa' and c.ativo;
 return new;
end $$;
create trigger evento_catalogos after insert on public.eventos for each row execute function public.preparar_evento();
-- Eventos de teste anteriores recebem os padrões faltantes, sem apagar lançamentos.
-- Nomes já existentes são preservados, sem criar outro item com o mesmo nome.
insert into public.itens_evento(evento_id,salao_id,catalogo_id,descricao,categoria,quantidade,valor_unitario)
select e.id,e.salao_id,c.id,c.nome,c.categoria,case when c.unidade='item' then 1 else 0 end,0
from public.eventos e join public.catalogo_salao c on c.salao_id=e.salao_id and c.tipo='servico' and c.ativo
where not exists(select 1 from public.itens_evento i where i.evento_id=e.id and lower(trim(i.descricao))=lower(trim(c.nome)));
insert into public.tarefas(evento_id,salao_id,catalogo_id,titulo)
select e.id,e.salao_id,c.id,c.nome from public.eventos e join public.catalogo_salao c on c.salao_id=e.salao_id and c.tipo='tarefa' and c.ativo
where not exists(select 1 from public.tarefas t where t.evento_id=e.id and lower(trim(t.titulo))=lower(trim(c.nome)));
revoke all on function public.validar_item_catalogo(),public.preparar_evento() from public;
commit;
