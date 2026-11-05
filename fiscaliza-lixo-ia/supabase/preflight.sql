-- Somente leitura: execute no SQL Editor para reconhecer uma instalação existente.
-- Não reaplique a migração 001 se já houver objetos com o prefixo fiscaliza.
select
  to_regclass('public.fiscaliza_occurrences') is not null as table_exists,
  (select relrowsecurity from pg_class
   where oid = to_regclass('public.fiscaliza_occurrences')) as rls_enabled,
  to_regprocedure('public.fiscaliza_validate_occurrence()') is not null as trigger_function,
  to_regprocedure('public.get_fiscaliza_community_occurrences()') is not null as community_rpc,
  to_regclass('public.fiscaliza_unique_photo_submission_idx') is not null as unique_photo_index;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'fiscaliza_occurrences')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'fiscaliza-photos';

select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'fiscaliza_occurrences'
order by indexname;

select grantee, privilege_type,
       string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'fiscaliza_occurrences'
  and grantee in ('authenticated', 'anon', 'PUBLIC')
group by grantee, privilege_type order by grantee, privilege_type;

-- Esperado após 001 + 002: os cinco indicadores iniciais são true;
-- três policies próprias na tabela e três no Storage; bucket privado de 5 MiB;
-- authenticated pode ler, inserir o payload e atualizar somente status.
-- Policies gerais de Storage também precisam ser revistas: combinam permissões por OR.
-- Anonymous Sign-Ins é uma configuração separada do painel Auth.
