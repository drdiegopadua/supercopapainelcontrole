-- Etapa 3: PINs, confirmações, atletas, termo LGPD, assinaturas e juízes. Rode no SQL Editor.
-- (tabelas ainda vazias: podem ser recriadas com segurança)
drop table if exists equipes_pin cascade;
drop table if exists assinaturas cascade;

create table equipes_pin (
  chave text primary key,                  -- nome da equipe em minúsculas, sem espaços nas pontas
  equipe text not null, pin text not null,
  gerado_em timestamptz not null default now()
);
create table confirmacoes (
  chave text primary key, equipe text not null,
  confirmado_em timestamptz not null default now(), termo text default 'Sim'
);
create table consentimentos (
  id bigserial primary key, chave text not null, equipe text not null,
  responsavel text not null, aceito_em timestamptz not null default now(), versao text not null
);
create index ix_consent_chave on consentimentos(chave);
create table assinaturas (
  chave text not null, equipe text not null, papel text not null check (papel in ('tecnico','capitao')),
  assinatura text not null, atualizado_em timestamptz not null default now(),
  primary key (chave, papel)
);

create unique index if not exists ux_atletas_numero on atletas(lower(equipe), numero) where numero <> '';
create index if not exists ix_atletas_chave on atletas(lower(equipe));

-- Segurança: nada disso é legível direto pela chave pública (PIN, assinaturas e termos só pela função "api").
alter table equipes_pin enable row level security;
alter table confirmacoes enable row level security;
alter table consentimentos enable row level security;
alter table assinaturas enable row level security;
drop policy if exists "leitura publica atletas" on atletas;
drop policy if exists "leitura publica juizes" on juizes;
