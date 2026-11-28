-- Corrige o cadastro da Super Vôlei gravado com acento corrompido (caractere U+FFFD "�").
-- Rode no SQL Editor do Supabase. A última consulta deve voltar vazia.
update atletas set equipe = 'Super Vôlei' where equipe like 'Super V_lei' and equipe <> 'Super Vôlei';
update atletas set nome = replace(nome, 'Gon' || chr(65533) || 'alves', 'Gonçalves') where position(chr(65533) in nome) > 0;
update atletas set nome = replace(nome, 'Andr' || chr(65533), 'André') where position(chr(65533) in nome) > 0;

select equipe, numero, nome from atletas where position(chr(65533) in equipe || nome) > 0;
