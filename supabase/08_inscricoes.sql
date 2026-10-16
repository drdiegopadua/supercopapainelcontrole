-- Etapa 8: inscrições das equipes + bucket público para os escudos. Rode no SQL Editor.
create table if not exists inscricoes (
  id bigserial primary key,
  carimbo timestamptz not null default now(),
  modalidade text not null default '',
  nome_equipe text not null,
  responsavel text default '', instagram text default '', telefone text default '', cidade text default '',
  alojamento text default 'Não', pessoas_alojamento int,
  como_conheceu text default '', termo_aloj text default '', termo_comp text default '',
  escudo_url text default '',
  status text not null default 'Pendente'
);
create unique index if not exists ux_inscricoes_equipe on inscricoes (lower(nome_equipe), lower(modalidade));
alter table inscricoes enable row level security;     -- dados pessoais (telefone etc.): só pela função "api"

-- Escudos: bucket público (as imagens precisam abrir direto no site/app/TV); só a função grava.
insert into storage.buckets (id, name, public) values ('escudos', 'escudos', true) on conflict (id) do nothing;
