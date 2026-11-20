-- Etapa 15: voucher das pizzas (Pizzaria Express). Rode no SQL Editor do Supabase.
create table if not exists vouchers (
  id bigserial primary key,
  chave text not null,            -- chave da equipe
  equipe text not null,
  item text not null,             -- pizza1 | pizza2
  token text not null unique,     -- vai dentro do QR code
  criado_em timestamptz not null default now(),
  retirado_em timestamptz,        -- preenchido quando a pizzaria lê o QR (só uma vez)
  unique (chave, item)
);
alter table vouchers enable row level security;   -- só a função "api" lê e grava
-- PIN de acesso do app da pizzaria (troque por outro se quiser)
insert into config (chave, valor) values ('voucher_pizzaria_pin', '{"pin":"5381"}'::jsonb) on conflict (chave) do nothing;
