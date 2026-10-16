-- Supercopa AFC — migração para Supabase, etapa 1 (súmula/partidas/elencos)
-- Cole no Supabase: SQL Editor > New query > Run.

create table if not exists partidas (
  id text primary key,                       -- ID Jogo (ex.: A1)
  aba text, linha int,
  equipe_casa text not null, equipe_visitante text not null,
  elenco_casa jsonb default '[]', elenco_visitante jsonb default '[]',
  arbitro1 text, arbitro2 text, apontador text,
  estado jsonb not null default '{}',        -- setAtual, pontos, sets, saque, rotações, timeouts, cartões, subs, capitães, escalações
  status text not null default 'em_andamento',
  link_pdf text,
  versao int not null default 0,             -- controle de concorrência
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table if not exists partida_eventos (   -- log sem limite de tamanho (fim do bug das 50 mil células)
  id bigserial primary key,
  partida_id text not null references partidas(id) on delete cascade,
  lote_id text, tipo text not null, dados jsonb default '{}',
  criado_em timestamptz default now()
);
create unique index if not exists ux_eventos_lote on partida_eventos(partida_id, lote_id, id);
create index if not exists ix_eventos_partida on partida_eventos(partida_id, id);

create table if not exists atletas (
  id bigserial primary key,
  equipe text not null, numero text, nome text not null,
  tipo text not null default 'Atleta',       -- Atleta | Técnico | Auxiliar Técnico
  cadastrado_em timestamptz default now()
);
create index if not exists ix_atletas_equipe on atletas(lower(equipe));

create table if not exists equipes_pin (equipe text primary key, pin text not null, gerado_em timestamptz default now());
create table if not exists juizes (nome text primary key, assinatura_url text, criado_em timestamptz default now());
create table if not exists assinaturas (equipe text, papel text, assinatura_url text, atualizado_em timestamptz default now(), primary key (equipe, papel));
create table if not exists avisos (id bigserial primary key, titulo text, texto text, fixado bool default false, ativo bool default true, criado_em timestamptz default now());

-- Segurança: RLS ligado. Leitura pública só do que o app/telão precisam;
-- escrita SOMENTE por funções (RPC) que validam PIN/senha — sem policy de insert/update para anon.
alter table partidas enable row level security;
alter table partida_eventos enable row level security;
alter table atletas enable row level security;
alter table equipes_pin enable row level security;     -- sem policy: PIN nunca é legível
alter table juizes enable row level security;
alter table assinaturas enable row level security;
alter table avisos enable row level security;

create policy "leitura publica partidas" on partidas for select using (true);
create policy "leitura publica eventos" on partida_eventos for select using (true);
create policy "leitura publica atletas" on atletas for select using (true);
create policy "leitura publica juizes" on juizes for select using (true);
create policy "leitura publica avisos" on avisos for select using (ativo);

-- Tempo real para telão, app e Árbitro 2
alter publication supabase_realtime add table partidas;
