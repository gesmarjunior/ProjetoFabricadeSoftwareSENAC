# Diretório de serviços de saúde de Itumbiara

Abra **Serviços de saúde** no menu principal, no menu **Mais** do celular, no mapa de risco ambiental ou na página **Orientações**. O catálogo fica em `#/health-services`; novos cadastros e correções aguardam validação antes de aparecer para todos.

## Cadastro inicial e fontes

O catálogo inicial contém doze unidades: Núcleo Municipal de Controle de Endemias; Vigilância Sanitária Municipal; NABS; CAIS; UBS Dionária Ferreira Gomes; clínicas Luiz Gonzaga Carneiro de Moura, Mário Guedes, Reginaldo Custódio Pereira, Genésio Borges de Andrade e Antônio de Pádua Peppe; UPA Dr. Ciro Garcia; Hospital Municipal Modesto de Carvalho.

Foram consultados em 10/11/2026 o [CNES do Ministério da Saúde](https://cnes2.datasus.gov.br/Listar_Mantidas.asp?VCnpj=23455313000130&VEstado=52&VNome=SECRETARIA+MUNICIPAL+DE+SAUDE), as fichas individuais e o [comunicado municipal de mudança da Vigilância Sanitária](https://itumbiara.go.gov.br/vigilancia-sanitaria-municipal-em-novo-local/), de 19/12/2025. Cada cartão contém código CNES, fonte e data de consulta. Não foi atribuído o endereço ou telefone geral do rodapé da prefeitura a nenhuma unidade.

Há diferenças entre fontes:

- **Endemias:** o usuário informou em 10/11/2026 o endereço atual **Rua Wilson Barbosa, 325, Jardim América**, adotado no catálogo. O CNES ainda informa Rua 7 de Setembro, 136, Alto da Boa Vista. Contato e horário do CNES precisam ser confirmados com a unidade.
- **Vigilância Sanitária:** adotado o comunicado municipal com Rua Wilson Barbosa, 325, Jardim América, telefone (64) 99660-6814 e atendimento de segunda a sexta, das 7h às 11h e das 13h às 17h. O CNES ainda apresenta endereço na Rua Cruz de Malta. A divergência permanece registrada nos detalhes.
- **Hospital Municipal:** o CNES apresentou telefone com DDD divergente. O telefone não foi reproduzido para evitar direcionamento incorreto.
- **CAIS:** o cadastro do CNES e a geocodificação da rua divergem quanto à região. Seu marcador é uma referência aproximada do município e precisa ser ajustado pelo responsável.

Os demais marcadores usam referências aproximadas de bairros do OpenStreetMap/Nominatim consultadas em 10/11/2026, seguindo a preferência do usuário por posições editáveis e inicialmente aproximadas. Não representam entradas físicas. Os links externos consultam o endereço textual; coordenadas só viram destino quando a localização for explicitamente confirmada pelo responsável. Unidades na mesma referência podem ficar agrupadas; amplie e expanda o grupo ou use a lista.

## Vacinação e atendimento

A prefeitura relacionou oito unidades em uma [campanha de influenza de maio de 2025](https://itumbiara.go.gov.br/vacinacao-contra-a-gripe-e-ampliada-para-todos-os-publicos/). Isso não confirma vacinação em novembro de 2026 nem vacinação contra dengue. Por isso, o catálogo inicial não marca nenhuma unidade como oferta de vacinação confirmada: oito aparecem com vacinação **a confirmar**; endemias, vigilância, UPA e hospital ficam como **não informado para esta unidade**. Essa classificação não significa que um serviço foi definitivamente descartado; significa que a fonte consultada não o estabeleceu.

Atendimento médico informado no CNES não significa consulta disponível no momento, ausência de encaminhamento ou funcionamento de todos os serviços no mesmo horário. Os horários são cadastrais, com orientação de confirmação. Agenda, vacina disponível, estoque, elegibilidade e público atendido precisam de conferência com a unidade. Nenhum dado de paciente, prontuário, documento ou relato clínico deve ser cadastrado neste diretório.

## Novos cadastros e correções

O formulário permite cadastrar centros de endemias, vigilâncias sanitária e epidemiológica, unidades básicas, centros de saúde, UPA/pronto atendimento, hospitais e pontos de vacinação. Nome, tipo, endereço, bairro/região, descrição e revisão dos dados são obrigatórios. Contato institucional, CNES, horários, notas de serviço e coordenadas são opcionais. Serviços marcados como informados exigem fonte HTTPS.

As sugestões nascem `pending`, vinculadas à sessão anônima existente, e só seu autor consegue consultá-las até a revisão. O cliente não pode ler o identificador de autoria, publicar, alterar unidades oficiais ou excluir registros. Correções têm `replaces_id` e não podem ser publicadas como unidades independentes. O envio conserva sua chave nas novas tentativas do mesmo formulário para reconciliar respostas perdidas.

## Validação e ajuste pelo responsável

No Supabase, abra **Table Editor → dengue_health_facilities**, usando a conta responsável pelo projeto.

1. Para editar posições, altere `latitude` e `longitude` juntas. Mantenha `location_precision = approximate` enquanto forem referências de regiões. Use `confirmed` somente após conferir a entrada, atualizando as notas e a fonte da localização.
2. Filtre `publication_status = pending`. Verifique dados institucionais, fontes, telefone, CNES, serviços, acesso e localização. A existência da unidade não basta para declarar vacinação atual.
3. Para uma unidade nova, preencha `sources_checked_on` com a data real de conferência e altere para `published` após validar. Use `archived` para sugestões não aceitas. O banco exige data de conferência para publicar e impede CNES duplicado entre unidades publicadas.
4. Em uma correção, localize o original por `replaces_id`, aplique nele somente os campos aprovados e preserve seu ID. Depois marque a sugestão como `archived`. Atualize também a data de conferência e as notas das fontes.

O seed `005` não sobrescreve ajustes posteriores, pois usa `ON CONFLICT (catalog_key) DO NOTHING`. A demonstração contém uma cópia de referência; as alterações feitas no banco não modificam essa cópia. Para instalar em outro projeto, aplique as migrações anteriores e depois `004_health_facilities.sql` e `005_itumbiara_health_catalog.sql`, somente se ainda faltarem. Não há administrador nem credencial privilegiada no navegador.
