-- Etapa 4: avisos, presenças (QR), W.O., premiação, destaques e votos da galera. Rode no SQL Editor.
create table if not exists presencas (
  id bigserial primary key, registrado_em timestamptz not null default now(),
  jogo text not null default '', equipe text not null, numero text not null default '', nome text not null, tipo text not null default 'Atleta',
  unique (jogo, equipe, numero, nome)
);
create table if not exists wo_registros (
  id bigserial primary key, registrado_em timestamptz not null default now(),
  jogo text, equipe_faltou text, adversario text, motivo text, registrado_por text
);
create table if not exists premiacao (
  categoria text primary key, nome text not null, equipe text default '', atualizado text
);
create table if not exists destaques (
  id bigserial primary key, modalidade text, jogo text, nome text, equipe text, observacao text, data_hora text
);
create table if not exists galera_votos (
  id bigserial primary key, atleta text not null, time text default '', criado_em timestamptz not null default now()
);
create index if not exists ix_galera_atleta on galera_votos(atleta);

alter table presencas enable row level security;
alter table wo_registros enable row level security;
alter table premiacao enable row level security;
alter table destaques enable row level security;
alter table galera_votos enable row level security;   -- tudo só pela função "api"
