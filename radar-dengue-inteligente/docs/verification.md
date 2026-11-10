# Verificação da entrega — Radar da Dengue Inteligente

Atualização documental: 10/11/2026. Última verificação do diretório de saúde: 10/11/2026. Ambiente: Windows, Node.js 24.16.0, npm 11.13.0 e Chromium do Playwright 1.64.1. O plugin Browser não estava disponível; foi usado Playwright diretamente. As seções de 03 a 05/11 abaixo são históricas, inclusive suas observações sobre ausência de publicação naquele momento.

## Diretório de saúde — 10/11/2026

Implementadas consulta, mapa, filtros, cadastro e sugestões de correção de unidades de Itumbiara. O catálogo contém doze locais reais de referência, todos com posição aproximada identificada. O endereço informado pelo usuário para Endemias foi adotado, com a divergência do CNES registrada. Fontes, limites e aprovação pelo responsável estão em [health-services.md](health-services.md).

- Lint, formatação e build aprovados. Vitest: **243 testes aprovados em 10 arquivos**, com 99,12% de linhas, 100% de funções, 95,52% de branches e 98,85% de statements nos módulos selecionados.
- Playwright: **47 testes aprovados**, incluindo os 41 anteriores e seis do diretório: catálogo/filtros, sugestão privada pendente, correção com fonte obrigatória, duas verificações Axe em celular e uso dos filtros recolhidos. As duas referências móveis alteradas pelos atalhos foram abertas e revisadas antes de atualizadas; a execução final comparou todos os snapshots sem atualização automática.
- As migrações `004_health_facilities.sql` e `005_itumbiara_health_catalog.sql` passaram em **21 verificações PGlite**, incluindo seed idempotente, preservação de ajustes, RLS, grants, publicação com data de conferência, fonte para serviço declarado e CNES publicado único.
- Após preflight, ambas as migrações foram aplicadas ao Supabase `webapp-fs`, com sucesso. A tabela está com RLS, doze unidades publicadas e aproximadas, nenhuma sugestão pendente e nenhuma vacinação inicial marcada como informada/confirmada.
- Testes transacionais no banco real confirmaram envio pendente, leitura própria, ausência de autoria na projeção, bloqueio de publicação/UPDATE/DELETE pelo cliente, bloqueio de data de conferência forjada e de serviço declarado sem fonte, ocultação entre visitantes e catálogo público de doze linhas. Foi executado ROLLBACK; nenhum registro de teste persistiu.
- A inspeção do build de produção com Supabase e tiles reais passou em **20 verificações**: HTTP 200, catálogo de doze, filtros com 2 vigilâncias/endemias, 8 vacinações a confirmar e 0 informadas, endereço de Endemias, ícone vetorial, formulário/correção, recarregamento e ausência de overflow em 320, 390, 768 e 1440 px. Nenhuma sugestão foi enviada nessa inspeção; não houve erro relevante de console, página ou HTTP. Capturas foram abertas e revisadas, incluindo cartão de fontes e campos de serviços.

Os relatórios desta atualização e as capturas de inspeção estão fora do código, em `%TEMP%/senac-saude-20261110/`. A consulta ao advisor de segurança não indicou problema específico na nova tabela; ainda apresentou avisos nas funções `SECURITY DEFINER` preexistentes, nas policies de sessão anônima e na configuração de proteção de senhas. Esses avisos não foram ocultados nem tratados como uma auditoria de segurança aprovada. Referências: [funções públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funções de usuários autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [policies anônimas](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

O diretório não armazena dados de pacientes nem confirma oferta atual de vacina, estoque ou elegibilidade. A aprovação institucional ocorre pelo responsável no Supabase; não existe administração privilegiada no navegador. A sessão anônima continua sem recuperação após sua perda.

## Histórico de verificação até 05/11/2026

Os resultados atuais incluem a revisão concluída em 05/11, com as etapas de verificação aprovadas nos dois apps e inspeção visual com Supabase e mapas reais. As etapas anteriores e a inspeção do build em subcaminho estão identificadas por data. As 16 baselines de cada app foram comparadas na execução final. A primeira revisão atualizou 19 imagens; a segunda revisão de linguagem atualizou as 32, após inspeção das capturas.

## Configuração hospedada — 04/11/2026; acompanhamento em 05/11/2026

**Backend, revisão de interface e checks completos aprovados nos testes descritos em 05/11/2026.** O usuário criou a organização **ProjetoFabricadeSoftwareSENAC** e o projeto **webapp-fs**, no plano **FREE**, com instância **Nano** na região **São Paulo**.

- Em 04/11, o preflight remoto confirmou a ausência inicial dos objetos, buckets e policies dos dois aplicativos. As migrações `001_initial_schema.sql` e `002_unique_photo_submission.sql` foram aplicadas nos dois apps, com retorno **Success**.
- A conferência de `001` e `002` confirmou, em cada app: RLS habilitado; três policies na tabela e três no Storage; bucket privado limitado a 5 MiB; índice único do caminho da foto presente; grants de registros próprios, atualização somente de status e execução da RPC por `authenticated` coerentes com as migrações.
- A autenticação anônima foi autorizada pelo usuário e salva no painel. A solicitação anterior de confirmação deixou de ser uma pendência.
- O smoke real de 04/11, executado por SDK/repositório, passou em **26 verificações**: quatro sessões anônimas, quatro registros e quatro fotos JPEG sintéticos. Foram conferidos criação e retry sem duplicação, leitura própria e cruzada, projeção comunitária sem campos privados, URLs assinadas, restrições de upload/sobrescrita, status/histórico e bloqueio de alteração direta da pontuação. Uma tentativa anterior falhou na validação da configuração, sem criar sessões, registros ou fotos; a execução posterior foi aprovada, sem fotos de probe remanescentes.
- Nenhum `seed.sql` foi executado no Supabase hospedado. Os quatro registros desse smoke são dados sintéticos de teste, não os exemplos de seed nem dados de cidadãos.
- Os arquivos `.env.local` dos dois apps contêm somente as duas variáveis públicas de conexão e estão cobertos pelo `.gitignore`. Seus valores não são reproduzidos neste relatório. Nenhum segredo de servidor foi configurado nos apps. Os builds posteriores a essa configuração passaram.
- Ainda em 04/11, após conferir as quatro policies a alterar, a migração `003_require_uploaded_photo.sql` dos dois apps foi aplicada remotamente em uma transação, com retorno **Success**. Ela exige metadados de foto no bucket correto antes do INSERT e restringe a exclusão de uploads referenciados. Em 05/11, o pós-check confirmou `photo_protection_present = true` nas quatro policies alteradas: duas de INSERT e duas de DELETE. A rodada real instrumentada da `003` passou em 28 checks, detalhados ao final.

A revisão de interface foi concluída em 05/11. O smoke de 26 checks de 04/11 e a regressão de 28 checks da `003` de 05/11 são evidências distintas; não são uma única execução. Não houve push, execução remota de GitHub Actions ou publicação.

## Resultados locais confirmados em 05/11/2026

As etapas de lint, formatação, testes unitários, build e navegador foram aprovadas nos dois apps. A revisão de linguagem teve uma repetição direcionada do teste de exemplo após corrigir sua expectativa de texto, detalhada ao final.

| Verificação                    | Resultado                                                   |
| ------------------------------ | ----------------------------------------------------------- |
| Vitest + jsdom                 | 209 testes aprovados em 9 arquivos                          |
| Fluxos E2E                     | 20 testes aprovados por app                                 |
| Acessibilidade                 | 5 testes Axe aprovados, sem violações nas telas verificadas |
| Regressão visual               | 16 snapshots, revisados com `view_image`                    |
| Lint e formatação              | Aprovados                                                   |
| Build de produção              | Aprovado                                                    |
| Etapas de verificação de 05/11 | Lint, formatação, Vitest, build e Playwright aprovados      |

Cobertura final dos serviços, regras, utilitários e repositórios selecionados: linhas **99,71%**, funções **100%**, branches **95,81%** e statements **99,52%**. Os quatro limites configurados são de 80%; arquivos apenas declarativos de apresentação não são incluídos para inflar a meta.

Os **41 testes de navegador por app, 82 no total**, consistem em 20 fluxos, 5 verificações Axe e 16 comparações visuais. Não são somados novamente quando a mesma suíte é executada para conferência. Além do Axe, o mapa tem verificações explícitas de contraste dos números dos agrupamentos (mínimo 4,5:1) e controles de zoom (mínimo 44×44 px).

## Comandos executados

A instalação e criação das baselines ocorreram em 03/11. Em 05/11, após revisar os textos e as capturas alteradas, o check completo foi repetido e passou nos dois aplicativos; a formatação documental foi conferida novamente ao final. Em 04/11 foram executados os testes direcionados de persistência e navegação, formatação, lint e `npm.cmd run check` completo nos dois apps em paralelo. Ambos terminaram com código de saída 0, incluindo as 32 comparações visuais existentes. As auditorias foram consultadas novamente com cache temporário em `%TEMP%/WebApp_FS-npm-cache`; nenhuma dependência foi atualizada.

- `npm.cmd install --offline=false --cache ../.npm-cache --save-exact --fetch-retries=1`: instalação concluída. O cache utilizado durante a implementação é temporário e não é dependência do projeto.
- `npm.cmd install --package-lock-only --offline=true --cache ../.npm-cache`: lockfile sincronizado após fixar as versões exatas instaladas.
- `npm.cmd run format`, `npm.cmd run lint` e `npm.cmd run format:check`: formatação e análise estática.
- `npm.cmd run test`: Vitest com cobertura V8 e os limites obrigatórios.
- `npm.cmd run build`: arquivos de produção em `dist/`.
- `npx.cmd playwright install chromium`: navegador de teste instalado.
- `npm.cmd run test:e2e`: suíte completa, incluindo Axe e os visuais.
- A CLI local Playwright também foi executada com `--update-snapshots` e `--update-snapshots=all` para criar as referências iniciais e registrar as correções revisadas. A conferência final compara imagens sem aceitar alterações automaticamente.
- `npm.cmd run check`: comando integrado de lint, formatação, cobertura, build e todos os testes de navegador.
- `npm.cmd audit --json --offline=false --cache ../.npm-cache` e `npm.cmd audit --omit=dev --offline=false --cache ../.npm-cache`: auditorias consultadas online.

Os scripts documentados no README funcionam sem o cache temporário. No PowerShell com bloqueio de scripts, o sufixo `.cmd` evita executar o wrapper `npm.ps1`.

## Evidências e ambiente

Os fluxos cobrem as nove telas, validação, cálculo, correção e confirmação humana, persistência, recarregamento, status e histórico, atualização do dashboard, cinco filtros de mapa/lista, rejeição de arquivo inválido, armazenamento cheio com nova tentativa, envio duplicado, geolocalização negada e erro remoto Supabase simulado sem falso sucesso local. Há regressões unitárias para respostas de rede que chegam depois de a pessoa sair da tela e iniciar outro rascunho.

As nove telas foram verificadas contra overflow em **320×720**, **390×844**, **768×1024** e **1440×900**. Os snapshots contêm as nove telas no celular, cinco no desktop e duas no tablet. Datas e IDs dinâmicos são mascarados; animações ficam desativadas; a tolerância é de 0,2% para pequenas diferenças de rasterização. As baselines são Windows e a CI usa Windows.

Nos testes determinísticos, somente os tiles externos do OpenStreetMap são substituídos por uma imagem local; marcadores, filtros, agrupamentos, zoom e atribuição são reais. A inspeção adicional abriu os dois aplicativos com tiles reais, nas três resoluções solicitadas, sem erros de console ou overflow na Home e no formulário. As capturas locais e todas as baselines foram abertas e revisadas.

Uma verificação suplementar temporária em PostgreSQL/PGlite executou **48 verificações para as duas migrações juntas**, com schemas Auth/Storage simulados: instalação compartilhada, seed idempotente, RLS por autor, projeção comunitária sem dados privados, grants, upload/leitura por pasta própria, recálculo de pontuação adulterada, coordenadas aproximadas, histórico e transições. Isso não é um teste dos serviços Supabase hospedados.

## Ocorrências resolvidas durante a execução

- `npm` tentou executar `npm.ps1` e falhou com “running scripts is disabled on this system”. Foi usado `npm.cmd`, sem alterar a política do computador.
- O registro npm inicialmente retornou `ENOTCACHED` porque `NPM_CONFIG_OFFLINE=true`; ao liberar o modo offline dentro do sandbox, retornou `ECONNREFUSED 127.0.0.1:9`. Instalação e auditorias foram repetidas com acesso de rede autorizado e concluídas.
- Vite/Vitest inicialmente falharam com `Error: spawn EPERM`. A execução autorizada dos subprocessos fora do sandbox concluiu os comandos.
- A instalação Chromium inicialmente falhou com `EPERM mkdir .../ms-playwright`; a repetição autorizada concluiu a instalação.
- A revisão corrigiu o skip link, respostas assíncronas após navegação, foto selecionada fora de ordem, seletor de foto em inglês, contraste dos agrupamentos e dimensões dos controles do mapa. As verificações correspondentes foram repetidas.

## Limites restantes e passos manuais

Na entrega local inicial, ainda não havia projeto Supabase nem conexão configurada. Essa condição é histórica: o backend foi configurado e os 26 checks reais passaram em 04/11. Em 05/11, o pós-check e os 28 checks instrumentados da `003` também passaram. A revisão de interface e os checks completos foram concluídos. Resta conferir o possível upload órfão de uma tentativa anterior, uma pendência de higiene dos testes. Não houve execução remota de GitHub Actions, push ou publicação.

As migrações `001`, `002` e `003` já foram aplicadas neste projeto hospedado. Para outra instalação, execute as três em ordem e somente as que ainda faltarem, após o preflight; não reaplique a `001`. A `002` exige caminhos de foto não duplicados e a `003` não apaga nem corrige registros antigos. Os seeds seguem opcionais e não foram aplicados no projeto hospedado.

As auditorias online foram repetidas em **05/11/2026**, sem alterar dependências. Nos dois apps, o audit completo terminou com código de saída 1 por **quatro avisos moderados na cadeia de desenvolvimento ESLint/minimatch**, associados ao aviso GHSA-g3hv-75wg-m249, sem avisos altos ou críticos. O audit com `--omit=dev` terminou com código de saída 0 e **zero avisos em dependências de produção em ambos os aplicativos**. Não foi aplicado downgrade para ESLint 9, que encerrou o suporte em 06/08/2026, nem override de versão major para ocultar o aviso. Consulte o [suporte oficial de versões do ESLint](https://eslint.org/version-support/) e revise a ferramenta quando houver correção compatível.

A pasta inicial não era um repositório Git; `git status` e `git diff` não tinham base de comparação. Os arquivos novos, imports, imagens, configurações e padrões de credenciais foram revisados diretamente. Os protótipos e documentos originais fora desta pasta foram preservados.

Permanecem os limites funcionais documentados: IA visual real, moderação, recuperação de sessão anônima, filtros e agregações no servidor para volumes maiores e integração com órgãos públicos são evoluções futuras. A pontuação é um risco ambiental estimado e não confirma a presença de mosquito ou doença.

## Primeira continuação local — 04/11/2026

- Paginação de registros próprios e comunitários, com contagem exata e ordenação por data/ID. Testes percorrem 1.207 linhas com limite de 37 por resposta e detectam mudanças de contagem, páginas vazias e IDs repetidos. Os detalhes consultam o ID diretamente.
- Chave de envio persistida no rascunho, com testes de resposta perdida, recarregamento, nova tentativa e nova intenção com conteúdo idêntico. O banco tem índice único no caminho da foto. Respostas incertas são reconciliadas e não autorizam apagar fotos; rejeições definitivas mantêm a compensação.
- Validação da integridade local sem substituir JSON corrompido por exemplos. Os testes conferem tipos, datas, classificação, coordenadas, histórico e preservação do conteúdo original.
- Playwright com portas exclusivas por app, sem reutilizar servidores existentes. Os helpers verificam identidade do produto, título exato da tela e ausência de alertas preenchidos; o fluxo inteiro acompanha erros de console.
- Sete arquivos unitários por app: 160 testes neste projeto e 166 no FiscalizaLixo. Ambos os checks completos passaram com 40 testes de navegador por app: 19 E2E, 5 Axe e 16 visuais. Não foi necessário regenerar capturas.
- Mais 12 verificações SQL das migrações `002` passaram em PGlite, com Auth/Storage simulados. Foram verificados unicidade, reaplicação, caminhos nulos e preservação de linhas e autoria. Somam-se às 48 verificações iniciais. Naquele momento ainda não havia execução hospedada; a aplicação posterior das migrações está registrada na seção de configuração hospedada e não substitui as verificações hospedadas posteriores.

Os READMEs, arquitetura e guia para estudantes foram atualizados. Até o encerramento dessa etapa local, não houve criação de serviço ou configuração real de conexão. A etapa hospedada posterior não alterou os pesos de risco e permanece sem push ou publicação.

## Revisão de validação e segurança — 04/11/2026

Após os ajustes de validação e dados, o check completo foi aprovado com **206 testes unitários neste app** e **40 testes de navegador**: 19 fluxos, 5 Axe e 16 visuais. Esses são resultados históricos de 04/11; o quadro atual acima registra a aprovação final de 05/11.

A auditoria estática verificou RLS, grants, projeção das RPCs, triggers, tratamento de dados nas telas e limites do Storage. A lacuna de INSERT com caminho de foto inexistente motivou a migração `003`. Antes de aplicá-la no Supabase, **49 verificações locais em PGlite** passaram nos dois apps juntos: ausência/bucket incorreto de foto, preservação de dados e autoria, policies sem recursão, projeção comunitária, exclusão de foto referenciada bloqueada e compensação de upload órfão permitida. Auth e Storage foram simulados; esses 49 checks não são testes do serviço hospedado.

A `003` consulta metadados por `EXISTS`, usando as policies SELECT e concessão explícita de leitura de `bucket_id` e `name`. Isso não remove grants gerenciados já existentes do Storage nem valida os pixels ou o significado de uma imagem. Sem locks ou transação compartilhada com o Storage físico, INSERT e DELETE concorrentes ainda podem deixar uma referência sem arquivo. Registros anteriores não são auditados nem reparados automaticamente.

Moderação, política de retenção, recuperação de sessão e proteção contra abuso/CAPTCHA continuam como evolução para uso público. Uma CSP própria e outros cabeçalhos de defesa ainda não foram configurados; são defesa adicional a avaliar na hospedagem antes da publicação. Nenhuma auditoria aqui equivale a garantia de segurança completa.

## Acompanhamento de 05/11/2026

A primeira rodada dirigida da `003` em 05/11 foi interrompida com **2 checks aprovados e 1 falha** no check combinado de bucket incorreto/compensação do Fiscaliza. O relatório registrou uma sessão e nenhum novo registro ou foto referenciada; o Radar não chegou a ser executado. A rodada não é considerada aprovada, nem sua falha foi atribuída de forma conclusiva à policy. Um possível upload órfão dessa tentativa anterior ainda aguarda conferência e não foi tocado pela rodada posterior.

A conferência desse artefato pela interface foi impedida pela indisponibilidade do componente nativo do Windows, com erro que incluiu `Computer Use native pipe is unavailable` e `os error 2`. Na nova tentativa, o inventário de abas e a abertura do app no Chrome também retornaram `The browser access host is unavailable`. Os dois servidores locais responderam HTTP 200 nas portas 5173 e 5174, mas não foi possível verificar a abertura de abas nesta sessão. Não houve nova mutação remota nessa tentativa de consulta. A contagem global de órfãos permanece desconhecida; essa pendência de higiene de teste é separada dos 28 checks aprovados da `003` e da confirmação das quatro policies.

A rodada instrumentada posterior passou em **28 checks reais, 14 por app, sem falhas**. Foram usadas duas novas sessões e preservados dois novos registros e duas fotos referenciadas de teste. A RPC confirmou **seis registros sintéticos no total, três por app**, incluindo os quatro do smoke anterior. INSERT sem foto ou com foto no bucket incorreto foi negado com HTTP 403/SQLSTATE 42501. DELETE de foto referenciada foi recusado e o JPEG continuou íntegro para o autor. Quatro novos uploads órfãos próprios foram removidos pela API do Storage; listagem vazia e download fresco com 404 confirmaram a ausência, sem observação de resposta em cache. Isso não comprova a ausência do possível órfão da tentativa anterior.

O pós-check de catálogo de 05/11 confirmou a presença da proteção de foto nas quatro policies alteradas pela `003`. O teste não avaliou concorrência entre INSERT e DELETE, significado da foto, moderação ou política de retenção.

A revisão final comparou as telas com os conceitos visuais originais, preservando identidade, navegação e fluxo das nove telas. Os textos explicam as funções disponíveis, a privacidade e os limites reais, sem prometer IA visual ou atendimento oficial. Foram corrigidas a distinção entre dados fictícios e comunitários reais e uma referência incorreta a casos de doença no Fiscaliza. Uma regressão reproduziu o erro Leaflet ao sair do mapa com frames pendentes; a correção cancela os callbacks antes da remoção do mapa. O teste falhou antes e passou após a correção.

A inspeção final com Supabase real gerou **56 capturas entre os dois apps**: nove telas em celular, tablet e desktop, mais revisão em 320 px. Não houve erros relevantes de console, página ou HTTP, nem overflow horizontal. Nenhum registro foi salvo nessa inspeção. As **19 baselines alteradas** (9 Fiscaliza e 10 Radar) foram inspecionadas antes da atualização. As capturas finais da Home estão em `screenshots/home.png`; mostram três registros sintéticos por app, e não dados de cidadãos. As evidências completas permanecem fora do código, em `%TEMP%/senac-ui-copy-review/real/`.

## Build em subcaminho — inspeção de 03/11/2026

A inspeção adicional executou o script temporário `node .subpath-qa.mjs` sobre os dois builds finais, servidos em `/repositorio-exemplo/`. Home, formulário, mapa e dashboard carregaram e foram recarregados com sucesso em ambos, incluindo os imports dinâmicos de Leaflet e Chart.js. As duas Homes carregaram seis tiles reais do OpenStreetMap, com zero erros de console. As capturas finais foram abertas para inspeção. Os scripts temporários de inspeção foram removidos ao concluir; não são necessários para executar o aplicativo ou seus testes.

## Revisão de linguagem e uso — 05/11/2026

A segunda revisão de interface removeu a faixa de Modo comunitário, os avisos globais de acesso e as explicações repetidas de implementação. Indicadores, formulário, confirmação, detalhes e notificações usam linguagem de tarefa. Privacidade, vínculo ao navegador e método de classificação ficam na página Sobre; as permissões e policies continuam ativas. Os detalhes públicos não exibem painéis vazios de foto ou histórico nem solicitam URLs de fotos privadas. O número visível do registro usa uma referência curta. Erros remotos mostram mensagens em português e preservam o erro original em cause, sem exibir respostas SQL ou orientações de configuração ao usuário.

Na versão conectada, Descarte correto oferece orientações por material. Endereços e rotas fictícios ficam restritos à demonstração local. Não foram cadastrados pontos de coleta reais nem alterados pesos, tabelas, Auth ou policies do Supabase.

A nova inspeção real passou com 56 capturas e 18 interações entre os dois apps em 390×844, 768×1024 e 1440×900, com verificação adicional em 320 px. Foram confirmadas a ausência da faixa e dos textos técnicos, a navegação das nove telas, a revisão e correção antes de salvar, filtros e menu móvel. Não houve erros relevantes de console, página ou HTTP, overflow ou novos registros salvos. Evidências desta rodada: %TEMP%/senac-production-copy-20261105/real/. As 32 baselines foram atualizadas após inspeção das capturas correspondentes, salvas fora do código.

Resultado da segunda revisão: lint, formatação, 215 testes unitários do Fiscaliza e 209 do Radar, e os dois builds passaram. Na execução completa de navegador, 40 testes por app passaram; uma expectativa do caso de registro fictício ficou incorreta durante a atualização dos textos. A expectativa foi corrigida e o caso passou nos dois apps com `npm.cmd run test:e2e -- --last-failed`, código de saída 0. Assim, os 41 casos por app foram aprovados, incluindo os 16 snapshots e 5 verificações Axe de cada um. O último relatório Playwright contém somente o caso repetido; a contagem de 82 casos distintos considera os 80 aprovados na execução completa mais os dois casos repetidos.

Uma captura da Home do Radar foi repetida após aguardar a decodificação completa da imagem ilustrativa. A imagem final foi inspecionada e substituída na documentação. A expansão da explicação de risco na página Sobre também foi exercitada com sucesso. Nenhuma dessas conferências salvou registros no backend.
