-- Dados fictícios para estudo, sem contas Auth ou fotografias reais.
-- Execute após a migração, pelo SQL Editor privilegiado.
begin;
insert into public.fiscaliza_occurrences (
  id, user_id, created_at, image_path, description, latitude, longitude, district,
  status, risk_score, risk_level, guidance, classification, classification_reviewed,
  category, volume, sensitive_area, recurrent, is_demo
) values
  ('10000000-0000-4000-8000-000000000001', null, '2026-10-01T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.679, -49.256, 'Centro', 'Recebido', 0, 'Baixo', '', 'Entulho', true, 'Entulho', 'Pequeno', false, false, true),
  ('10000000-0000-4000-8000-000000000002', null, '2026-10-05T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.683, -49.261, 'Setor Oeste', 'Em análise', 0, 'Baixo', '', 'Lixo doméstico', true, 'Lixo doméstico', 'Médio', true, false, true),
  ('10000000-0000-4000-8000-000000000003', null, '2026-10-09T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.687, -49.266, 'Jardim América', 'Encaminhado', 0, 'Baixo', '', 'Reciclável', true, 'Reciclável', 'Grande', false, false, true),
  ('10000000-0000-4000-8000-000000000004', null, '2026-10-13T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.691, -49.271, 'Setor Leste', 'Resolvido', 0, 'Baixo', '', 'Eletrônico', true, 'Eletrônico', 'Pequeno', true, true, true),
  ('10000000-0000-4000-8000-000000000005', null, '2026-10-17T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.695, -49.276, 'Centro', 'Recebido', 0, 'Baixo', '', 'Poda/Galhos', true, 'Poda/Galhos', 'Médio', false, true, true),
  ('10000000-0000-4000-8000-000000000006', null, '2026-10-21T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.699, -49.281, 'Setor Oeste', 'Descartado', 0, 'Baixo', '', 'Pneu', true, 'Pneu', 'Grande', true, true, true),
  ('10000000-0000-4000-8000-000000000007', null, '2026-10-25T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.703, -49.286, 'Jardim América', 'Em análise', 0, 'Baixo', '', 'Outro', true, 'Outro', 'Pequeno', false, true, true)
on conflict (id) do nothing;
commit;
-- O trigger calcula pontos e orientação. A origem is_demo impede edição por cidadãos.
