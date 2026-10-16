-- Etapa 10: votação do Atleta Destaque (1 voto por WhatsApp e por aparelho). Rode no SQL Editor.
create table if not exists votos_destaque (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  tel_hash text not null,            -- hash do WhatsApp (o número em si não fica guardado)
  tel_final text not null,           -- só os 4 últimos dígitos, para a organização reconhecer em caso de dúvida
  device_id text,
  nome_votante text not null,
  equipe text not null,
  atleta_numero text not null default '',
  atleta_nome text not null,
  teste boolean not null default false
);
create unique index if not exists ux_voto_tel on votos_destaque(tel_hash) where not teste;
create unique index if not exists ux_voto_device on votos_destaque(device_id) where device_id is not null and device_id <> '' and not teste;
create index if not exists ix_voto_atleta on votos_destaque(equipe, atleta_nome);
alter table votos_destaque enable row level security;    -- só a função "api" lê e grava
