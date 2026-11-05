# Radar da Dengue Inteligente

Apoiar a prevenção de condições ambientais favoráveis a possíveis criadouros do Aedes aegypti.

O resultado é um risco ambiental estimado, sem diagnóstico ou confirmação de foco. A ferramenta não substitui equipes de saúde ou vigilância.

Aplicativo educacional mobile-first com nove telas: início, formulário, resultado revisável, mapa, detalhes, dashboard, orientação, acompanhamento e sobre/educação/privacidade. Toda a interface e a documentação estão em português do Brasil.

## Instalar e executar

Requisitos: Node.js 24 LTS e npm. Copie somente esta pasta para um repositório independente; não existem imports ou recursos de execução fora dela.

```sh
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. No PowerShell que bloqueia scripts, use `npm.cmd` e `npx.cmd`, sem alterar a política de execução. O lockfile entregue permite instalações reproduzíveis; para instalar sem lockfile pela primeira vez, use `npm install`.

Sem credenciais configuradas, o app abre em **Demonstração**. Os exemplos são fictícios. Novos registros e fotos ficam apenas no `localStorage` do navegador e dispositivo; não há sincronização remota. Limpar os dados do navegador apaga essa demonstração. Cota indisponível ou armazenamento bloqueado resulta em mensagem de erro, sem falso sucesso.

## Comandos

| Comando                           | O que executa                                   |
| --------------------------------- | ----------------------------------------------- |
| `npm run dev`                     | Servidor Vite                                   |
| `npm run build`                   | Build estático em `dist/`                       |
| `npm run preview`                 | Inspeção do build                               |
| `npm run lint`                    | ESLint                                          |
| `npm run format:check`            | Conferência Prettier                            |
| `npm run format`                  | Formatação dos arquivos                         |
| `npm test`                        | Vitest, jsdom e cobertura                       |
| `npm run test:watch`              | Unitários durante alterações                    |
| `npx playwright install chromium` | Instalação do navegador dos testes              |
| `npm run test:e2e`                | Playwright: fluxos, Axe e visuais               |
| `npm run test:visual`             | Apenas comparação de imagens                    |
| `npm run check`                   | Lint, formatação, unitários, build e Playwright |

A meta mínima é 80% de linhas, funções, branches e statements dos módulos de negócio e serviços selecionados no Vite. Veja `coverage/` após `npm test`. Os testes não dependem de um projeto Supabase real: usam o modo local e mocks determinísticos.

Os snapshots usam Chromium e animações desativadas, cobrindo 390×844, 768×1024 e 1440×900. A CI usa Windows para comparar com as baselines Windows entregues. A configuração separa referências por plataforma; fontes e rasterização diferem entre sistemas. Execute `npm run test:visual -- --update-snapshots` somente depois de abrir e revisar as imagens da alteração. A CI nunca aceita baselines novas automaticamente. Axe verifica as telas principais e reprova violações sérias ou críticas, complementado por verificação de teclado.

## Fluxo e regras

Início → Novo registro → validar foto, descrição, bairro e coordenadas aproximadas → calcular e explicar os pontos → pessoa confirma ou corrige a categoria → salvar → detalhes e orientação → acompanhar status. Mapa e dashboard leem o mesmo repositório após alterações. Rotas hash funcionam ao recarregar a página em hospedagem estática.

A tela **Orientação e encaminhamento** apresenta ações preventivas seguras: eliminar água parada quando acessível, lavar as bordas dos recipientes e manter reservatórios cobertos. Não suba em telhados ou manipule materiais perigosos; procure o setor municipal responsável para locais de difícil acesso.

Referência educativa: [orientações sobre Aedes aegypti do Ministério da Saúde](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti). A pontuação do aplicativo é uma regra pedagógica própria, não uma escala clínica ou oficial.

| Recipiente                | Pontos |
| ------------------------- | -----: |
| Pneu                      |     25 |
| Balde/Vaso/Recipiente     |     20 |
| Caixa d’água/Reservatório |     25 |
| Lixo/Garrafa/Lata         |     15 |
| Calha/Laje                |     20 |
| Outro                     |     10 |

Água parada = 35. Área externa = 15. Reincidência = 25. Os pontos são didáticos e não representam probabilidade de doença.

Total máximo: 100. Faixas inclusivas: 0–30 **Baixo**, 31–60 **Médio**, 61–80 **Alto**, 81–100 **Crítico**. Cada parcela aparece no resultado. `src/services/classificationService.js` é substituível por uma API futura, sempre mantendo revisão humana. A mesma regra existe no trigger SQL para impedir pontuações inventadas por um cliente modificado.

Transições permitidas: Recebido → Em análise ou Descartado; Em análise → Orientação enviada, Resolvido ou Descartado; Orientação enviada → Em análise, Resolvido ou Descartado; Resolvido → Em análise. Descartado é terminal. Repetir o mesmo status é inválido. Veja `src/utils/status.js`.

## Configurar Supabase

Antes de aplicar migrações em um projeto existente, execute [supabase/preflight.sql](supabase/preflight.sql) no **SQL Editor**. O arquivo contém somente consultas de leitura para conferir tabelas, RLS, funções, índices, policies, grants e buckets. Se já houver objetos deste aplicativo, confira suas definições e não reaplique a `001`.

1. Use um projeto Supabase existente ou crie-o manualmente para uma nova instalação. Os scripts do aplicativo não criam serviços externos e não incluem credenciais reais.
2. Em **Authentication → Sign In / Providers**, habilite **Anonymous Sign-Ins**. A sessão recebe um UUID Auth sem exigir nome, e-mail ou telefone. Veja [autenticação anônima](https://supabase.com/docs/guides/auth/auth-anonymous).
3. No **SQL Editor**, execute, em ordem, `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_unique_photo_submission.sql` e `supabase/migrations/003_require_uploaded_photo.sql`. Aplique somente as migrações que faltarem após o preflight; não reaplique a `001`. A primeira cria a estrutura, a segunda impede repetir o caminho da foto e a terceira exige metadados do upload no bucket correto e protege fotos referenciadas contra exclusão. As migrações não apagam registros. Se houver caminhos duplicados num banco antigo, revise-os antes da `002`; a `003` não corrige referências antigas automaticamente.
4. Opcionalmente execute `supabase/seed.sql`. O seed é idempotente por UUID e contém exemplos fictícios, sem contas Auth reais. As linhas `is_demo` são somente para leitura comunitária e não podem ser criadas ou editadas por cidadãos.
5. Confira a tabela `dengue_occurrences`, a função `get_dengue_community_occurrences()` e o bucket privado `dengue-photos`. A migração cria as policies do Storage; mantenha o bucket privado. Veja [controle de acesso](https://supabase.com/docs/guides/storage/security/access-control).
6. Em **Project Settings → API / API Keys**, copie a URL e a **publishable key**. Nunca use chave secreta ou privilegiada de servidor no navegador.
7. Copie `.env.example` para `.env.local` e preencha apenas as variáveis abaixo. Não envie `.env.local` ao Git.

   ```dotenv
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

8. Reinicie o Vite ou gere um novo build. Variáveis `VITE_` entram no JavaScript público no build; a proteção efetiva é Auth, RLS e grants, não o sigilo dessa chave pública.
9. Em dois contextos isolados do navegador, crie um registro por pessoa. Confirme leitura comunitária dos campos seguros e acesso exclusivo do autor à descrição, foto e alteração de status. Confirme que chamadas sem sessão são negadas. Este teste exige seu projeto configurado e permanece como verificação manual posterior à entrega.

Os dois apps podem compartilhar um projeto Supabase sem colisão: tabelas, funções, índices, policies e buckets usam prefixos distintos. Se o banco configurado falhar, o erro é exibido; o app não transforma falha remota em sucesso local silencioso.

O rascunho mantém uma chave de envio na aba. Repetir o mesmo envio, inclusive depois de recarregar, permite recuperar um registro já gravado sem criar outro. Corrigir os campos inicia uma nova tentativa. Quando o resultado da rede for incerto, a foto é preservada e o app consulta o banco para conferir o resultado; somente uma rejeição definitiva permite remover o upload. Confira o acompanhamento se o servidor continuar indisponível.

No modo local, registros malformados são recusados antes de montar as telas, sem substituir o JSON por exemplos. Para guardar uma cópia manual, abra as ferramentas de desenvolvedor do navegador, localize **Application/Armazenamento → Local Storage** deste endereço e copie o valor de `dengue-occurrences-v1` antes de corrigir ou limpar o armazenamento.

## Segurança e privacidade

- RLS protege linhas completas: somente o autor lê suas linhas, cria registros com seu `auth.uid()` e altera o status. Grants por coluna impedem editar autoria, datas ou histórico pelo cliente.
- A RPC comunitária tem campos explícitos e exige sessão. Ela não expõe `user_id`, descrição livre, caminho de foto ou histórico privado. Mapa, filtros e dashboard usam essa projeção segura.
- Fotos são privadas, com leitura do autor por URL assinada temporária. A pasta do upload começa com seu UUID. Storage aceita JPEG/PNG/WebP até 5 MiB; o navegador valida, mostra prévia e reduz a imagem antes do envio.
- Coordenadas são arredondadas para três casas decimais, aproximadamente uma centena de metros. Isso reduz a precisão e não garante anonimização. Não informe endereço completo, nome, telefone, e-mail ou documento no relato. Não fotografe pessoas, placas, documentos ou interiores de residências.
- O banco calcula pontos, orientação, datas e histórico. Os exemplos fictícios não são editáveis pela sessão anônima.
- A migração `003` verifica metadados do upload no bucket do app antes de inserir uma ocorrência. A exclusão de foto referenciada é bloqueada; uploads órfãos continuam removíveis pela API do Storage. Não exclua linhas de `storage.objects` manualmente para limpar arquivos.
- Não há administrador no cliente. Gestão institucional exige autenticação verificável, papéis e policies próprias. Alteração de status pelo autor representa acompanhamento do cidadão e não atendimento oficial.
- Perder a sessão anônima do navegador impede recuperar autoria antiga. Recuperação de conta, política de retenção e exclusão automatizada são evoluções futuras.

## Arquitetura e arquivos

HTML5 semântico, CSS com variáveis e ES Modules, Vite vanilla, Supabase, Leaflet/OpenStreetMap com atribuição e Chart.js. Cada aplicativo possui seu próprio `package.json`, lockfile, código e assets.

```text
.github/workflows/       CI e Pages manual
public/                  arquivos estáticos locais
src/components/          elementos reutilizados
src/pages/               nove telas
src/services/            classificação, foto e envio
src/repositories/        contrato, Local e Supabase
src/utils/               validação, status, filtros e agregações
src/styles/              tokens e estilos responsivos
src/main.js              entrada do navegador
src/app.js               composição e navegação
supabase/migrations/     schema, constraints, RLS e Storage
supabase/preflight.sql    consultas de leitura antes da instalação
supabase/seed.sql         exemplos fictícios
tests/unit/              funções e adaptadores
tests/e2e/               fluxos e Axe
tests/visual/            snapshots revisados
```

Leia [a arquitetura](docs/architecture.md) e [o guia para estudantes](docs/student-guide.md). Labels, landmarks, foco visível, mensagens acessíveis e áreas de toque de pelo menos 44 px auxiliam o uso por teclado e toque. Níveis possuem texto além de cor. O CSS respeita redução de movimento.

## Publicar depois no GitHub Pages

1. Crie um repositório separado com o **conteúdo desta pasta** na raiz. Não envie `node_modules`, `.env.local`, `coverage` ou `dist`; consulte `.gitignore`.
2. Execute as verificações e envie o código quando decidir fazê-lo. Esta implementação não enviou código nem publicou o app.
3. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
4. Em **Settings → Secrets and variables → Actions → Variables**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O workflow também aceita as duas entradas em **Secrets**, embora ambas continuem públicas no bundle. Deixe as duas ausentes para uma demonstração local. Nunca cadastre chaves de servidor com esses nomes.
5. Em **Actions**, execute **Publicar no GitHub Pages (manual)**. `pages.yml` usa somente `workflow_dispatch`; um push executa a CI sem publicar.
6. `base: './'` e hash routing permitem `https://usuario.github.io/repositorio/#/map` sem rewrite. O workflow gera `dist`, envia o artifact e só então publica a versão.

A CI executa `npm ci`, lint, formatação, cobertura, build e Playwright completo, sem credenciais. Veja [workflows personalizados do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Limitações reais e evolução

A checagem da `003` por `EXISTS` não é uma chave estrangeira e não analisa o conteúdo semântico da imagem. INSERT e DELETE concorrentes ainda podem deixar referência sem arquivo; os controles não oferecem atomicidade com o Storage físico. Uma CSP própria e cabeçalhos adicionais são defesa opcional de hospedagem a avaliar antes da publicação.

Aplicativo educacional para pequenos conjuntos de registros, sem integração com prefeitura, despacho oficial, notificações, recuperação de conta, moderação, geocodificação ou IA visual. Os tiles OpenStreetMap exigem conexão. O adaptador percorre todas as páginas do Supabase para compor mapa e indicadores. Para volumes maiores, ainda são necessárias agregações e filtros no servidor em vez de carregar tudo no navegador. Fotos e relatos completos permanecem privados por padrão. Uploads preservados após uma falha incerta podem exigir conferência e limpeza posterior pelo responsável pelo projeto.

Antes do uso público real, valide todas as migrações no projeto escolhido, defina retenção/moderação, avalie proteção contra abuso/CAPTCHA no login anônimo e valide o conteúdo com a equipe responsável. Testes com mocks não substituem a verificação do backend real; consulte [o estado verificado da entrega](docs/verification.md). O resultado é um risco ambiental estimado, sem diagnóstico ou confirmação de foco. A ferramenta não substitui equipes de saúde ou vigilância.

## Resultado da verificação

Consulte [comandos executados, cobertura, evidências e limites da entrega](docs/verification.md).

[Ver captura da interface revisada em 05/11/2026](docs/screenshots/home.png), com três registros sintéticos de teste neste aplicativo.
