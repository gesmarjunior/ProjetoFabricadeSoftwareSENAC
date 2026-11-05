-- Uma foto enviada identifica uma única submissão, inclusive em tentativas repetidas.
-- Os exemplos fictícios com image_path nulo continuam permitidos.
begin;

create unique index if not exists fiscaliza_unique_photo_submission_idx
  on public.fiscaliza_occurrences (image_path)
  where image_path is not null;

commit;
