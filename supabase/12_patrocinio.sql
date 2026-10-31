-- Contagem de vezes que os logos dos patrocinadores foram exibidos (site e app). Rode no SQL Editor do Supabase.
create table if not exists patrocinio_diario (
  dia date not null,
  plataforma text not null,          -- 'site' | 'app'
  local text not null,               -- 'home' | 'patrocinadores' | 'pedidos'
  patrocinador text not null,        -- nome do arquivo do logo, ex.: 'coroa-instituto'
  n bigint not null default 0,
  primary key (dia, plataforma, local, patrocinador)
);
alter table patrocinio_diario enable row level security;   -- só a função "api" acessa

create or replace function registrar_patrocinio(p_dia date, p_plat text, p_local text, p_slugs text[])
returns void language plpgsql security definer as $$
declare s text;
begin
  foreach s in array p_slugs loop
    insert into patrocinio_diario (dia, plataforma, local, patrocinador, n) values (p_dia, p_plat, p_local, s, 1)
    on conflict (dia, plataforma, local, patrocinador) do update set n = patrocinio_diario.n + 1;
  end loop;
end $$;

create or replace function patrocinio_resumo()
returns json language sql security definer as $$
  select json_build_object(
    'total', coalesce((select sum(n) from patrocinio_diario), 0),
    'desde', (select min(dia) from patrocinio_diario),
    'porPatrocinador', coalesce((select json_agg(x order by x.n desc) from (select patrocinador, sum(n)::bigint as n from patrocinio_diario group by 1) x), '[]'::json),
    'porPlataforma', coalesce((select json_agg(x) from (select plataforma, sum(n)::bigint as n from patrocinio_diario group by 1) x), '[]'::json),
    'porLocal', coalesce((select json_agg(x) from (select local, sum(n)::bigint as n from patrocinio_diario group by 1) x), '[]'::json),
    'porDia', coalesce((select json_agg(x order by x.dia) from (select dia, sum(n)::bigint as n from patrocinio_diario group by 1) x), '[]'::json)
  );
$$;
