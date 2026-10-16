-- Etapa 9: quiz, acessos/instalações, feedback. Rode no SQL Editor.
create table if not exists quiz_respostas (
  id bigserial primary key, criado_em timestamptz not null default now(),
  nome text not null default '', fone text not null default '', acertos int not null default 0, total int not null default 0,
  pct numeric not null default 0, tempo text not null default ''
);
create table if not exists instalacoes (
  device_id text primary key, primeira timestamptz not null default now(), ultima timestamptz not null default now(), plataforma text default ''
);
create table if not exists acessos (
  device_id text not null, plataforma text not null check (plataforma in ('app','site')),
  primeira timestamptz not null default now(), ultima timestamptz not null default now(), visitas int not null default 1,
  primary key (device_id, plataforma)
);
create table if not exists acessos_log (
  id bigserial primary key, data date not null, plataforma text not null, legado boolean not null default false
);
create index if not exists ix_acessos_log_data on acessos_log(data);
create table if not exists contadores_legados (chave text primary key, valor int not null default 0);   -- totais anteriores à migração
create table if not exists feedback (
  id bigserial primary key, criado_em timestamptz not null default now(),
  organizacao int, arbitragem int, app int, nota_geral int, recomendaria int, positivos text default '', melhorar text default '', time text default ''
);
alter table quiz_respostas enable row level security;
alter table instalacoes enable row level security;
alter table acessos enable row level security;
alter table acessos_log enable row level security;
alter table contadores_legados enable row level security;
alter table feedback enable row level security;     -- tudo só pela função "api"
