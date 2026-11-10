# Locais de coleta de Itumbiara

O catálogo fica em **Pontos de coleta**, no menu principal e no menu **Mais** do celular. O mapa de ocorrências e a página **Descarte correto** também oferecem acesso. Filtros combinam nome/endereço/bairro, tipo de estabelecimento e material recebido.

## Cadastro inicial e localização

São cinco unidades: Zenon Borges Guimarães; Nossa Senhora da Saúde / Dona Sinica; Pneus — Santa Rita; Sarandi; Santa Rosa do Meia Ponte. Endereços e materiais detalhados foram fornecidos pelo usuário. As informações foram confrontadas em 10/11/2026 com as notícias da [inauguração do quarto ecoponto](https://itumbiara.go.gov.br/4o-ecoponto-de-itumbiara-e-entregue-no-bairro-zenon-borges-guimaraes/) e do [novo endereço do ponto de pneus](https://itumbiara.go.gov.br/descarte-de-pneus-agora-no-ecoponto-do-bairro-santa-rita/).

Essas fontes não confirmam todos os detalhes: o nº 815 do ponto de pneus, a quadra/lote de Dona Sinica, a lista detalhada de recicláveis e os horários precisam de confirmação. Não foi atribuído o horário geral de atendimento da prefeitura aos ecopontos. Sarandi e Santa Rosa são povoados de Itumbiara, não municípios homônimos de outros estados.

O usuário autorizou o uso do centro aproximado de cada bairro/povoado. As referências foram obtidas do OpenStreetMap/Nominatim em 10/11/2026 e são identificadas como **aproximadas** no mapa e nos cartões. Não representam a entrada da unidade. O link externo consulta o endereço textual enquanto a localização não for confirmada; não gera rota para um centro de bairro como se fosse a entrada exata. A origem da posição fica registrada em `location_source_url` e `location_notes`.

Nenhum desses ecopontos recebe lixo doméstico comum. A unidade de Santa Rita foi cadastrada para pneus exclusivamente. Horários e condições de entrega devem ser confirmados com a unidade. A presença de um aterro sanitário no catálogo não autoriza entrega direta nem comprova licença ou acesso público.

## Sugestões de visitantes

1. Escolha **Cadastrar local** ou **Sugerir correção** em um cartão.
2. Informe nome, tipo, endereço, bairro/povoado, descrição, materiais e condições de acesso. Coordenadas e fonte HTTPS são opcionais; o mapa permite selecionar uma referência aproximada, com alternativa de digitação por teclado.
3. Confira as informações e envie. O identificador é mantido nas novas tentativas do mesmo formulário para evitar duplicação após uma resposta perdida.
4. A sugestão aparece somente para seu autor até a validação. Na demonstração, ela fica apenas no navegador. Na versão conectada, é persistida no Supabase e vinculada à sessão anônima existente.

O cliente não recebe acesso aos identificadores de autores, nem pode publicar, excluir ou editar unidades oficiais. O banco valida tipos, tamanhos, materiais, coordenadas, confirmação e estado inicial pendente, independentemente da interface. A publicação não se baseia em `user_metadata` nem em uma senha de administrador colocada no JavaScript.

## Validação e ajustes pelo responsável

No painel do projeto Supabase, abra **Table Editor → fiscaliza_collection_points**. Use a conta responsável pelo projeto; essa tarefa não está disponível para visitantes do site.

- Para ajustar um dos cinco marcadores, localize a linha por `catalog_key` ou nome e altere `latitude` e `longitude` juntas. Mantenha `location_precision = approximate` enquanto a entrada não for confirmada. Somente após conferir a entrada, use `confirmed` e atualize `location_notes`, `location_source_url` e a descrição da fonte. Não basta arrastar um marcador para declarar verificação.
- Para analisar cadastros, filtre `publication_status = pending`. Verifique endereço, materiais, acesso, fonte e localização. Em uma sugestão de unidade nova (`replaces_id` vazio), altere para `published` após a conferência ou `archived` se não for aceita. Ajuste também os textos de fonte e confirmação.
- Uma correção tem `replaces_id` com o ID da unidade original. Confira a sugestão e aplique os campos aprovados **na linha original**, preservando seu ID. Depois marque a sugestão como `archived`. O banco impede publicar uma correção como unidade independente, evitando duplicar o local.

Atualize a página do aplicativo para carregar os ajustes. A migração `005` usa `ON CONFLICT (catalog_key) DO NOTHING`, preservando correções feitas depois da instalação. Não reaplique a `004`; confira a existência da tabela antes de instalar.

Os seis registros sintéticos antigos do módulo de ocorrências não fazem parte desse catálogo. O Radar da Dengue não importa dados ou código desse módulo.
