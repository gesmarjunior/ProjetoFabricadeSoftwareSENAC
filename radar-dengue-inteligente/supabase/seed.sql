-- Dados fictícios para estudo, sem contas Auth ou fotografias reais.
-- Execute após a migração, pelo SQL Editor privilegiado.
begin;
insert into public.dengue_occurrences (
  id, user_id, created_at, image_path, description, latitude, longitude, district,
  status, risk_score, risk_level, guidance, classification, classification_reviewed,
  container_type, standing_water, outdoor_area, recurrent, is_demo
) values
  ('20000000-0000-4000-8000-000000000001', null, '2026-10-01T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.679, -49.256, 'Centro', 'Recebido', 0, 'Baixo', '', 'Pneu', true, 'Pneu', false, true, false, true),
  ('20000000-0000-4000-8000-000000000002', null, '2026-10-05T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.683, -49.261, 'Setor Oeste', 'Em análise', 0, 'Baixo', '', 'Balde/Vaso/Recipiente', true, 'Balde/Vaso/Recipiente', true, true, false, true),
  ('20000000-0000-4000-8000-000000000003', null, '2026-10-09T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.687, -49.266, 'Jardim América', 'Orientação enviada', 0, 'Baixo', '', 'Caixa d’água/Reservatório', true, 'Caixa d’água/Reservatório', false, true, false, true),
  ('20000000-0000-4000-8000-000000000004', null, '2026-10-13T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.691, -49.271, 'Setor Leste', 'Resolvido', 0, 'Baixo', '', 'Lixo/Garrafa/Lata', true, 'Lixo/Garrafa/Lata', true, true, true, true),
  ('20000000-0000-4000-8000-000000000005', null, '2026-10-17T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.695, -49.276, 'Centro', 'Recebido', 0, 'Baixo', '', 'Calha/Laje', true, 'Calha/Laje', false, true, true, true),
  ('20000000-0000-4000-8000-000000000006', null, '2026-10-21T12:00:00Z', null, 'EXEMPLO FICTÍCIO: condição ambiental usada somente em exercício pedagógico.', -16.699, -49.281, 'Setor Oeste', 'Descartado', 0, 'Baixo', '', 'Outro', true, 'Outro', true, true, true, true)
on conflict (id) do nothing;
commit;
-- O trigger calcula pontos e orientação. A origem is_demo impede edição por cidadãos.
