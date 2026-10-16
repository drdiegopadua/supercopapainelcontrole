-- Etapa 7: notícias do app. Rode no SQL Editor.
create table if not exists noticias (
  id bigserial primary key,
  icone text not null default '📰',
  categoria text not null default 'Notícia',
  titulo text not null,
  data_txt text not null default '',      -- texto livre exibido no app (ex.: "agosto 2026")
  corpo text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table noticias enable row level security;   -- leitura e escrita só pela função "api"
