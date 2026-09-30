-- Executar uma vez, depois de 004. Preserva eventos e lançamentos existentes.
begin;
alter table public.catalogo_salao drop constraint catalogo_salao_tipo_check;
alter table public.catalogo_salao add constraint catalogo_salao_tipo_check check(tipo in ('servico','tarefa','tipo_evento','detalhe','profissional'));
create table public.configuracoes_catalogo (
 id uuid primary key default gen_random_uuid(),
 tipo text not null check(tipo in ('servico','tarefa','tipo_evento','detalhe','profissional')),
 nome text not null check(length(trim(nome))>0),
 unidade text not null default 'item' check(unidade in ('item','litros','pessoas')),
 campo_tipo text not null default 'texto' check(campo_tipo in ('texto','checkbox')),
 servicos text[] not null default '{}', ordem integer not null default 100,
 obrigatorio boolean not null default false, excluido boolean not null default false
);
alter table public.catalogo_salao add column configuracao_id uuid references public.configuracoes_catalogo(id),
 add column campo_tipo text not null default 'texto', add column servicos text[] not null default '{}';
create unique index catalogo_configuracao_salao on public.catalogo_salao(configuracao_id,salao_id);
-- Cadastros idênticos passam a compartilhar a mesma configuração geral.
insert into public.configuracoes_catalogo(tipo,nome,unidade,ordem,obrigatorio)
select tipo,nome,unidade,min(ordem),bool_or(categoria='pacote' and tipo='servico')
from public.catalogo_salao group by tipo,nome,unidade;
update public.catalogo_salao c set configuracao_id=g.id from public.configuracoes_catalogo g
where c.tipo=g.tipo and c.nome=g.nome and c.unidade=g.unidade;
with detalhes_iniciais(salao,nome,campo_tipo,ordem) as (values
('Exxcelência','Horário','texto',0),
('Exxcelência','Cor do vestido','texto',1),
('Exxcelência','Clip','texto',2),
('Exxcelência','Retrospectiva','texto',3),
('Exxcelência','Toalhas','texto',4),
('Exxcelência','Guardanapos','texto',5),
('Exxcelência','Tapete','texto',6),
('Exxcelência','Luz da parede','texto',7),
('Exxcelência','Nhoque','texto',8),
('Exxcelência','Massas','texto',9),
('Exxcelência','Arroz','texto',10),
('Exxcelência','Madruga','texto',11),
('Exxcelência','Sabor do bolo','texto',12),
('Exxcelência','Bolo fake','texto',13),
('Exxcelência','Espumante','texto',14),
('Exxcelência','Terá Itens para balada','checkbox',15),
('Exxcelência','Lembrancinha','texto',16),
('Exxcelência','Terá Decoração para estante','checkbox',17),
('Exxcelência','Terá Fotos para a estante','checkbox',18),
('Exxcelência','Bar','texto',19),
('Exxcelência','Banner','texto',20),
('Exxcelência','Espelho','texto',21),
('Exxcelência','Túnel: sim','checkbox',22),
('Exxcelência','Plataforma: sim','checkbox',23),
('Exxcelência','Fogos','texto',24),
('Exxcelência','Robô','texto',25),
('Exxcelência','Bazuca: sim','checkbox',26),
('Exxcelência','Homem tocha: sim','checkbox',27),
('Exxcelência','Borboletas','texto',28),
('Exxcelência','Quadro','texto',29),
('Exxcelência','Chopp','texto',30),
('Exxcelência','Insta','texto',31),
('Exxcelência','Informações','texto',32),
('Exxcelência','OBS*','texto',33),
('Exxplêndido','Horário','texto',0),
('Exxplêndido','Cor do vestido','texto',1),
('Exxplêndido','Clip','texto',2),
('Exxplêndido','Retrospectiva','texto',3),
('Exxplêndido','Toalhas','texto',4),
('Exxplêndido','Guardanapos','texto',5),
('Exxplêndido','Luz da parede','texto',6),
('Exxplêndido','Nhoque','texto',7),
('Exxplêndido','Massas','texto',8),
('Exxplêndido','Arroz','texto',9),
('Exxplêndido','Sabor do bolo','texto',10),
('Exxplêndido','Bolo fake','texto',11),
('Exxplêndido','Espumante','texto',12),
('Exxplêndido','Terá Itens para balada','checkbox',13),
('Exxplêndido','Lembrancinha','texto',14),
('Exxplêndido','Terá decoração para estante','checkbox',15),
('Exxplêndido','Terá fotos para a estante','checkbox',16),
('Exxplêndido','Bar','texto',17),
('Exxplêndido','Espelho','texto',18),
('Exxplêndido','Túnel','texto',19),
('Exxplêndido','Plataforma','texto',20),
('Exxplêndido','Fogos','texto',21),
('Exxplêndido','Robô','texto',22),
('Exxplêndido','Bazuca','texto',23),
('Exxplêndido','Tocha','texto',24),
('Exxplêndido','Borboletas','texto',25),
('Exxplêndido','Quadro','texto',26),
('Exxplêndido','Chopp','texto',27),
('Exxplêndido','Insta','texto',28),
('Exxplêndido','Informações','texto',29),
('Exxplêndido','OBS*','texto',30)
), novos_detalhes as (
 insert into public.configuracoes_catalogo(tipo,nome,campo_tipo,ordem)
 select 'detalhe',nome,campo_tipo,min(ordem) from detalhes_iniciais group by nome,campo_tipo
 returning id,nome,campo_tipo
)
insert into public.catalogo_salao(salao_id,tipo,nome,configuracao_id,campo_tipo,ordem)
select s.id,'detalhe',d.nome,g.id,d.campo_tipo,d.ordem from detalhes_iniciais d
join public.saloes s on s.nome=d.salao join novos_detalhes g on g.nome=d.nome and g.campo_tipo=d.campo_tipo;
update public.catalogo_salao set ativo=true where tipo='servico' and categoria='pacote';
alter table public.configuracoes_catalogo enable row level security;
revoke all on public.configuracoes_catalogo from anon,authenticated;
grant select on public.configuracoes_catalogo to authenticated;
create policy configuracoes_leitura on public.configuracoes_catalogo for select to authenticated using(
 not excluido and exists(select 1 from public.catalogo_salao c where c.configuracao_id=configuracoes_catalogo.id and public.tem_acesso(c.salao_id,array['gerente']))
);
-- Toda alteração do catálogo passa pelas funções, para manter os salões sincronizados.
revoke insert,update on public.catalogo_salao from authenticated;
create function public.salvar_configuracao(p_id uuid,p_tipo text,p_nome text,p_unidade text,p_campo_tipo text,p_servicos text[],p_saloes uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; unidade uuid; g public.configuracoes_catalogo;
begin
 if auth.uid() is null or coalesce(cardinality(p_saloes),0)=0 then raise exception 'Selecione pelo menos um salão';end if;
 foreach unidade in array p_saloes loop
  if not public.tem_acesso(unidade,array['gerente']) then raise exception 'Acesso negado ao salão';end if;
 end loop;
 if p_tipo not in ('servico','tarefa','tipo_evento','detalhe','profissional') or nullif(trim(p_nome),'') is null then raise exception 'Cadastro inválido';end if;
 if p_tipo='servico' and lower(trim(p_nome))='pacote' then raise exception 'Pacote já é obrigatório';end if;
 if p_tipo='profissional' and (coalesce(cardinality(p_servicos),0)=0 or not p_servicos <@ array['Fotos','Filmagem']) then raise exception 'Selecione Fotos ou Filmagem';end if;
 if p_tipo='profissional' and lower(trim(p_nome))='particular' then raise exception 'Particular já está disponível';end if;
 if p_id is not null then
  select * into g from public.configuracoes_catalogo where id=p_id and not excluido for update;
  if not found or g.obrigatorio or g.tipo<>p_tipo then raise exception 'Cadastro não pode ser alterado';end if;
  if exists(select 1 from public.catalogo_salao c where c.configuracao_id=p_id and not public.tem_acesso(c.salao_id,array['gerente'])) then raise exception 'Acesso negado';end if;
  update public.configuracoes_catalogo set nome=trim(p_nome),unidade=p_unidade,campo_tipo=p_campo_tipo,servicos=coalesce(p_servicos,'{}') where id=p_id;
  gid:=p_id;
 else
  insert into public.configuracoes_catalogo(tipo,nome,unidade,campo_tipo,servicos)
  values(p_tipo,trim(p_nome),p_unidade,p_campo_tipo,coalesce(p_servicos,'{}')) returning id into gid;
 end if;
 update public.catalogo_salao set ativo=false where configuracao_id=gid;
 foreach unidade in array p_saloes loop
  insert into public.catalogo_salao(salao_id,tipo,nome,unidade,configuracao_id,campo_tipo,servicos,ativo)
  values(unidade,p_tipo,trim(p_nome),p_unidade,gid,p_campo_tipo,coalesce(p_servicos,'{}'),true)
  on conflict(configuracao_id,salao_id) do update set nome=excluded.nome,unidade=excluded.unidade,campo_tipo=excluded.campo_tipo,servicos=excluded.servicos,ativo=true;
 end loop;
 return gid;
end $$;
create function public.excluir_configuracao(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.configuracoes_catalogo;
begin
 select * into g from public.configuracoes_catalogo where id=p_id and not excluido for update;
 if not found or g.obrigatorio or auth.uid() is null then raise exception 'Cadastro não pode ser excluído';end if;
 if not exists(select 1 from public.catalogo_salao where configuracao_id=p_id) or exists(select 1 from public.catalogo_salao c where c.configuracao_id=p_id and not public.tem_acesso(c.salao_id,array['gerente'])) then raise exception 'Acesso negado';end if;
 update public.configuracoes_catalogo set excluido=true where id=p_id;
 update public.catalogo_salao set ativo=false where configuracao_id=p_id;
end $$;
create table public.detalhes_evento (
 id uuid primary key default gen_random_uuid(), evento_id uuid not null, salao_id uuid not null,
 catalogo_id uuid not null, nome text not null, campo_tipo text not null check(campo_tipo in ('texto','checkbox')),
 valor_texto text not null default '', marcado boolean not null default false, ordem integer not null default 100,
 foreign key(evento_id,salao_id) references public.eventos(id,salao_id),
 foreign key(catalogo_id,salao_id) references public.catalogo_salao(id,salao_id), unique(evento_id,catalogo_id)
);
create index detalhes_evento_evento on public.detalhes_evento(evento_id);
alter table public.detalhes_evento enable row level security;
revoke all on public.detalhes_evento from anon,authenticated;
grant select,insert,update on public.detalhes_evento to authenticated;
create policy detalhes_leitura on public.detalhes_evento for select to authenticated using(public.tem_acesso(salao_id,array['gerente','dono','secretaria']));
create policy detalhes_criacao on public.detalhes_evento for insert to authenticated with check(public.tem_acesso(salao_id,array['gerente']));
create policy detalhes_edicao on public.detalhes_evento for update to authenticated using(public.tem_acesso(salao_id,array['gerente'])) with check(public.tem_acesso(salao_id,array['gerente']));
create function public.validar_detalhe() returns trigger language plpgsql set search_path='' as $$
declare c public.catalogo_salao;
begin
 if TG_OP='INSERT' then
  select * into c from public.catalogo_salao where id=new.catalogo_id and salao_id=new.salao_id and tipo='detalhe' and ativo;
  if not found then raise exception 'Detalhe inválido';end if;
  new.nome:=c.nome;new.campo_tipo:=c.campo_tipo;new.ordem:=c.ordem;
 else
  if new.evento_id<>old.evento_id or new.salao_id<>old.salao_id or new.catalogo_id<>old.catalogo_id then raise exception 'Vínculo inválido';end if;
  new.nome:=old.nome;new.campo_tipo:=old.campo_tipo;new.ordem:=old.ordem;
 end if;
 return new;
end $$;
create trigger detalhe_validacao before insert or update on public.detalhes_evento for each row execute function public.validar_detalhe();
create or replace function public.preparar_evento() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.itens_evento(evento_id,salao_id,catalogo_id,descricao,categoria,quantidade,valor_unitario)
 select new.id,new.salao_id,c.id,c.nome,c.categoria,case when c.unidade='item' then 1 else 0 end,0 from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='servico' and c.ativo;
 insert into public.tarefas(evento_id,salao_id,catalogo_id,titulo)
 select new.id,new.salao_id,c.id,c.nome from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='tarefa' and c.ativo;
 insert into public.detalhes_evento(evento_id,salao_id,catalogo_id,nome,campo_tipo)
 select new.id,new.salao_id,c.id,c.nome,c.campo_tipo from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='detalhe' and c.ativo;
 return new;
end $$;
insert into public.detalhes_evento(evento_id,salao_id,catalogo_id,nome,campo_tipo,valor_texto,marcado)
select e.id,e.salao_id,c.id,c.nome,c.campo_tipo,coalesce(e.detalhes->>c.nome,''),coalesce(e.detalhes->>c.nome,'') in ('true','Sim','sim')
from public.eventos e join public.catalogo_salao c on c.salao_id=e.salao_id and c.tipo='detalhe' and c.ativo;
create function public.validar_profissionais() returns trigger language plpgsql set search_path='' as $$
declare v_campo text; v_nome text;
begin
 foreach v_campo in array array['Fotos','Filmagem'] loop
  v_nome:=coalesce(new.detalhes->>v_campo,'');
  if TG_OP='UPDATE' then
   if v_nome=coalesce(old.detalhes->>v_campo,'') and new.salao_id=old.salao_id then continue;end if;
  end if;
  if v_nome not in ('','Particular') and not exists(select 1 from public.catalogo_salao c where c.salao_id=new.salao_id and c.tipo='profissional' and c.ativo and c.nome=v_nome and v_campo=any(c.servicos)) then raise exception 'Selecione um profissional cadastrado para este serviço';end if;
 end loop;
 return new;
end $$;
create trigger evento_profissionais before insert or update on public.eventos for each row execute function public.validar_profissionais();
create function public.salvar_servicos_evento(p_evento uuid,p_itens jsonb) returns void language plpgsql set search_path='' as $$
declare v jsonb;
begin
 if not exists(select 1 from public.eventos where id=p_evento and public.tem_acesso(salao_id,array['gerente'])) then raise exception 'Acesso negado';end if;
 for v in select * from jsonb_array_elements(p_itens) loop
  update public.itens_evento set quantidade=(v->>'quantidade')::numeric,valor_unitario=(v->>'valor_unitario')::numeric where id=(v->>'id')::uuid and evento_id=p_evento;
  if not found then raise exception 'Serviço inválido';end if;
 end loop;
end $$;
create function public.salvar_detalhes_evento(p_evento uuid,p_itens jsonb) returns void language plpgsql set search_path='' as $$
declare v jsonb;
begin
 if not exists(select 1 from public.eventos where id=p_evento and public.tem_acesso(salao_id,array['gerente'])) then raise exception 'Acesso negado';end if;
 for v in select * from jsonb_array_elements(p_itens) loop
  update public.detalhes_evento set valor_texto=coalesce(v->>'valor_texto',''),marcado=coalesce((v->>'marcado')::boolean,false) where id=(v->>'id')::uuid and evento_id=p_evento;
  if not found then raise exception 'Detalhe inválido';end if;
 end loop;
end $$;
create or replace function public.excluir_evento(evento_alvo uuid) returns void language plpgsql security definer set search_path='' as $$
declare unidade uuid;
begin
 select salao_id into unidade from public.eventos where id=evento_alvo for update;
 if not found or not public.tem_acesso(unidade,array['gerente']) then raise exception 'Evento inexistente ou acesso negado';end if;
 delete from public.detalhes_evento where evento_id=evento_alvo;
 delete from public.pagamentos where evento_id=evento_alvo;
 delete from public.itens_evento where evento_id=evento_alvo;
 delete from public.tarefas where evento_id=evento_alvo;
 delete from public.eventos where id=evento_alvo;
end $$;
revoke all on function public.salvar_configuracao(uuid,text,text,text,text,text[],uuid[]),public.excluir_configuracao(uuid),public.validar_detalhe(),public.validar_profissionais(),public.salvar_servicos_evento(uuid,jsonb),public.salvar_detalhes_evento(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.salvar_configuracao(uuid,text,text,text,text,text[],uuid[]),public.excluir_configuracao(uuid),public.salvar_servicos_evento(uuid,jsonb),public.salvar_detalhes_evento(uuid,jsonb) to authenticated;
commit;
