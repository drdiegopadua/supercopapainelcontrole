-- Etapa 13: chat ao vivo do site e do app. Rode no SQL Editor do Supabase.
create table if not exists chat_mensagens (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  apelido text not null,
  texto text not null,
  device_id text not null,
  oficial boolean not null default false,   -- mensagem da organização
  apagada boolean not null default false,
  teste boolean not null default false
);
create index if not exists ix_chat_lista on chat_mensagens(teste, apagada, id desc);
create index if not exists ix_chat_device on chat_mensagens(device_id, id desc);
create table if not exists chat_bloqueados (
  device_id text primary key,
  apelido text,
  bloqueado_em timestamptz not null default now()
);
alter table chat_mensagens enable row level security;    -- só a função "api" lê e grava
alter table chat_bloqueados enable row level security;
