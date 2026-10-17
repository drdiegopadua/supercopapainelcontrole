-- ============================================================
-- SUPERCOPA AFC 2026 — Schema Supabase (Fase 1: Vôlei ao vivo)
--
-- Substitui apps-script-volei-apoio.js, EXCETO as ações
-- 'inscrever'/'inscricoes' (formulário público de inscrição de
-- equipes), que continuam em Apps Script/Sheets por decisão do
-- usuário.
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do seu
-- projeto Supabase (supabase.com → seu projeto → SQL Editor → New
-- query) e rode uma vez. Depois, em Project Settings → API, pegue a
-- "Project URL" e a "anon public" key e me mande — são elas que
-- entram no lugar da URL do Apps Script no código.
-- ============================================================

-- ── PARTIDAS (súmula ao vivo) ──────────────────────────────
-- Tabela larga, equivalente à antiga aba "Partidas". Estruturas
-- aninhadas (elenco, rotação, sets, cartões, substituições, tempos)
-- continuam como JSONB — são objetos que o frontend já trata como
-- JS puro, não precisam virar tabelas relacionais separadas.
create table if not exists partidas (
  id text primary key,
  aba text,
  equipe_casa text not null,
  equipe_visitante text not null,
  elenco_casa jsonb not null default '{}'::jsonb,
  elenco_visitante jsonb not null default '{}'::jsonb,
  arbitro1 text,
  arbitro2 text,
  apontador text,
  set_atual int not null default 1,
  pontos_casa int not null default 0,
  pontos_visitante int not null default 0,
  sets_casa int not null default 0,
  sets_visitante int not null default 0,
  sacando text,
  rotacao_casa jsonb not null default '[]'::jsonb,
  rotacao_visitante jsonb not null default '[]'::jsonb,
  primeiro_saque_set text,
  historico_sets jsonb not null default '[]'::jsonb,
  timeouts jsonb not null default '[]'::jsonb,
  cartoes jsonb not null default '[]'::jsonb,
  substituicoes jsonb not null default '[]'::jsonb,
  status text not null default 'em_andamento',
  link_pdf text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  capitao_casa text,
  capitao_visitante text,
  capitao_quadra_casa text,
  capitao_quadra_visitante text,
  observacoes text,
  rotacao_confirmada_set int not null default 1
);

-- ── PONTOS_PARTIDA (histórico de pontos, um por linha) ─────
-- Antes era um array JSON dentro de uma célula (historicoPontos) e
-- tinha também um log de snapshots pra "desfazer" (eventosLog) que
-- já estourou o limite de 50.000 caracteres de uma célula do Sheets
-- uma vez. Como tabela normal, "desfazer último ponto" vira
-- simplesmente apagar a última linha — sem limite de tamanho, e cada
-- INSERT já dispara Realtime pra quem estiver com a tela aberta.
create table if not exists pontos_partida (
  id bigserial primary key,
  partida_id text not null references partidas(id) on delete cascade,
  set_num int not null,
  equipe text not null check (equipe in ('A', 'B')),
  hora timestamptz not null default now(),
  pontos_casa int not null,
  pontos_visitante int not null
);
create index if not exists idx_pontos_partida_partida on pontos_partida (partida_id, id);

-- ── ATLETAS e PIN DA EQUIPE ─────────────────────────────────
create table if not exists atletas (
  id bigserial primary key,
  equipe text not null,
  numero text,
  nome text not null,
  tipo text not null default 'Atleta', -- 'Atleta' ou 'Comissão Técnica'
  cadastrado_em timestamptz not null default now()
);
create index if not exists idx_atletas_equipe on atletas (equipe);

create table if not exists equipes_pin (
  equipe text primary key,
  pin text not null,
  gerado_em timestamptz not null default now()
);

-- ── DESTAQUE / PREMIAÇÃO / GALERA (vôlei) ──────────────────
create table if not exists destaque_volei (
  id bigserial primary key,
  modalidade text,
  jogo text,
  nome text,
  equipe text,
  observacao text,
  criado_em timestamptz not null default now()
);

create table if not exists premiacao_volei (
  categoria text primary key, -- 'MVP', 'Melhor Levantador', 'Melhor Ponteiro', 'Melhor Líbero'
  nome text,
  equipe text,
  atualizado_em timestamptz not null default now()
);

create table if not exists galera_votos_volei (
  id bigserial primary key,
  atleta text not null,
  time text,
  criado_em timestamptz not null default now()
);

-- ── RLS (Row Level Security) ───────────────────────────────
-- Mesmo modelo de confiança que a URL do Apps Script já tinha (sem
-- autenticação real): leitura e escrita liberadas pela chave anônima.
-- Autenticação de verdade pro painel é um endurecimento futuro, não
-- bloqueia esta migração.
do $$
declare
  tabela text;
begin
  foreach tabela in array array['partidas', 'pontos_partida', 'atletas', 'equipes_pin', 'destaque_volei', 'premiacao_volei', 'galera_votos_volei']
  loop
    execute format('alter table %I enable row level security', tabela);
    execute format('drop policy if exists "public_select" on %I', tabela);
    execute format('create policy "public_select" on %I for select using (true)', tabela);
    execute format('drop policy if exists "public_insert" on %I', tabela);
    execute format('create policy "public_insert" on %I for insert with check (true)', tabela);
    execute format('drop policy if exists "public_update" on %I', tabela);
    execute format('create policy "public_update" on %I for update using (true)', tabela);
    execute format('drop policy if exists "public_delete" on %I', tabela);
    execute format('create policy "public_delete" on %I for delete using (true)', tabela);
  end loop;
end $$;

-- ── REALTIME ────────────────────────────────────────────────
-- Habilita as atualizações em tempo real nas duas tabelas que o
-- console ao vivo (painel, Modo Mesa, 2º árbitro) escuta — substitui
-- o polling de 4 em 4 segundos que causava a corrida "sobe, desce,
-- sobe de novo" no placar.
alter publication supabase_realtime add table partidas;
alter publication supabase_realtime add table pontos_partida;
