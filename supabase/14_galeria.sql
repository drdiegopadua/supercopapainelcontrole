-- Etapa 14: fotos enviadas pelo app SC Admin para a galeria do site e do app. Rode no SQL Editor do Supabase.
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;

create table if not exists galeria_fotos (
  id text primary key,
  criado_em timestamptz not null default now(),
  f text not null,            -- caminho da foto grande no bucket "galeria"
  t text not null,            -- caminho da miniatura
  w int not null default 1600,
  h int not null default 1200,
  tw int not null default 600,
  th int not null default 450,
  legenda text not null default '',
  enviado_por text
);
alter table galeria_fotos enable row level security;    -- só a função "api" lê e grava (as imagens ficam públicas no bucket)
