-- Etapa 10b: a trava de 1 voto agora vale também para os votos de teste (permite testar de verdade). Rode no SQL Editor.
drop index if exists ux_voto_tel;
drop index if exists ux_voto_device;
create unique index ux_voto_tel on votos_destaque(tel_hash, teste);
create unique index ux_voto_device on votos_destaque(device_id, teste) where device_id is not null and device_id <> '';
