-- Exige os metadados da foto no bucket correto antes de criar uma ocorrência.
-- Mantém as policies SELECT existentes: o usuário continua vendo somente suas fotos.
begin;

-- A consulta EXISTS precisa somente destas colunas; RLS continua sendo aplicada.
grant select (bucket_id, name) on storage.objects to authenticated;

alter policy dengue_insert_own on public.dengue_occurrences
  with check (
    (select auth.uid()) = user_id
    and not is_demo
    and exists (
      select 1 from storage.objects photo
      where photo.bucket_id = 'dengue-photos'
        and photo.name = dengue_occurrences.image_path
    )
  );

-- A compensação de upload continua permitida enquanto nenhuma ocorrência o referencia.
alter policy dengue_photo_delete_own on storage.objects
  using (
    bucket_id = 'dengue-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.dengue_occurrences occurrence
      where occurrence.image_path = storage.objects.name
        and occurrence.user_id = (select auth.uid())
    )
  );

-- Estas verificações usam as policies SELECT, sem recursão nas policies INSERT/DELETE.
-- EXISTS verifica metadados, não a integridade ou o conteúdo semântico da imagem.
-- Sem locks, INSERT e DELETE concorrentes ainda podem deixar referência sem arquivo;
-- isto não equivale a uma chave estrangeira nem a uma transação com o Storage físico.
commit;
