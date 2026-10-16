-- Etapa 2: log de desfazer + idempotência de lotes. Rode no SQL Editor.
alter table partidas add column if not exists log jsonb not null default '[]';

create table if not exists lotes (
  partida_id text not null, lote_id text not null,
  criado_em timestamptz default now(),
  primary key (partida_id, lote_id)
);
alter table lotes enable row level security;   -- sem policy: só a função (service role) acessa

-- Quem escreve é só a função "api" (service role); anon só lê partidas.
-- A leitura pública não deve expor o log interno de desfazer:
revoke select (log) on partidas from anon, authenticated;
-- (o revoke de coluna só vale se o privilégio de tabela for removido antes)
revoke select on partidas from anon, authenticated;
grant select (id, aba, linha, equipe_casa, equipe_visitante, elenco_casa, elenco_visitante, arbitro1, arbitro2, apontador,
              estado, status, link_pdf, versao, criado_em, atualizado_em) on partidas to anon, authenticated;
