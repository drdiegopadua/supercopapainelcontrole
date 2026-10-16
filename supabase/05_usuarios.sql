-- Etapa 5: usuários do painel e senha de liberação no Supabase (senhas só como hash). Rode no SQL Editor.
create table if not exists usuarios_painel (
  chave text primary key,                    -- usuário em minúsculas
  usuario text not null,
  papel text not null check (papel in ('admin','organizacao','mesa','juiz')),
  sal text not null, hash text not null,     -- PBKDF2-SHA256 (100 mil iterações)
  falhas int not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);
create table if not exists config (
  chave text primary key, valor jsonb not null, atualizado_em timestamptz not null default now()
);
alter table usuarios_painel enable row level security;   -- sem policy: só a função "api" acessa
alter table config enable row level security;
