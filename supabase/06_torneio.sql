-- Etapa 6: torneio (equipes por grupo, jogos, mata-mata). A classificação é calculada pela função "api" a partir daqui.
-- Rode no SQL Editor.
create table if not exists torneio_equipes (
  modalidade text not null default 'volei',
  nome text not null,
  grupo text,                         -- 'A'..'D' (vazio = ainda sem grupo)
  ordem int not null default 0,       -- posição dentro do grupo (sorteio da chave)
  sorteio_ordem int,                  -- desempate por sorteio (menor = melhor); só usado se todo o resto empatar
  escudo text,
  atualizado_em timestamptz not null default now(),
  primary key (modalidade, nome)
);
create table if not exists jogos (
  modalidade text not null default 'volei',
  id text not null,                   -- A1, B2, Q1, SF1, FINAL (mesmos IDs da súmula)
  fase text not null check (fase in ('grupos','quartas','semifinal','final')),
  grupo text,
  rodada int,
  ordem int not null default 0,       -- ordem de exibição
  casa text, visitante text,          -- nomes explícitos (grupos) ou vazio no mata-mata (usa origem)
  origem_casa text, origem_visitante text,   -- mata-mata: '1A' (1º do grupo A), '2B', 'V:Q1' (vencedor do Q1)
  data date, hora time, quadra text,
  status text not null default 'agendado' check (status in ('agendado','ao_vivo','finalizado','wo')),
  sets_casa int not null default 0, sets_visitante int not null default 0,
  parciais jsonb not null default '[]',   -- [{"a":25,"b":22}, ...]
  wo text check (wo in ('casa','visitante','ambos')),   -- quem FALTOU (ambos = as duas incompletas)
  versao int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (modalidade, id)
);
create index if not exists ix_jogos_fase on jogos(modalidade, fase, ordem);

-- leitura pública permitida (o site/app/TV leem direto também, como fallback); escrita só pela função "api".
alter table torneio_equipes enable row level security;
alter table jogos enable row level security;
drop policy if exists "leitura publica torneio_equipes" on torneio_equipes;
drop policy if exists "leitura publica jogos" on jogos;
create policy "leitura publica torneio_equipes" on torneio_equipes for select using (true);
create policy "leitura publica jogos" on jogos for select using (true);
alter publication supabase_realtime add table jogos;
