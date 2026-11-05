# Guia para estudantes — FiscalizaLixo IA

## 1. Como a aplicação inicia

Execute `npm ci` e `npm run dev` na pasta do aplicativo. `index.html` carrega `src/main.js` como módulo; ele importa os estilos e inicia `src/app.js`. O Vite resolve os imports e gera os arquivos de produção em `dist/` com `npm run build`. Comece por `src/config.js`, depois siga os imports da entrada. Cada arquivo tem uma responsabilidade pequena.

## 2. Como a navegação funciona

Links usam a parte da URL depois de `#`. O servidor continua entregando `index.html`; o JavaScript escolhe a tela. Assim é possível atualizar uma rota no GitHub Pages. As nove telas formam um fluxo: antes de persistir, a pessoa revisa o resultado; depois, os detalhes apresentam o registro salvo e seu acompanhamento.

## 3. Onde ficam as regras

Leia `src/services/classificationService.js`. `classify` usa os campos informados e devolve categoria, pontos, nível, orientação e parcelas da soma. Ele não interpreta os pixels da imagem. A pessoa pode corrigir categoria/recipiente e recalcular antes de salvar.

| Categoria      | Pontos |
| -------------- | -----: |
| Entulho        |     25 |
| Lixo doméstico |     20 |
| Reciclável     |     10 |
| Eletrônico     |     30 |
| Poda/Galhos    |     15 |
| Pneu           |     30 |
| Outro          |     10 |

Volume: Pequeno = 5, Médio = 15, Grande = 25. Área sensível = 20. Reincidência = 25.

Total máximo: 100. Faixas 0–30, 31–60, 61–80 e 81–100 correspondem a Baixo, Médio, Alto e Crítico. Testes verificam exatamente 0, 30, 31, 60, 61, 80, 81 e 100. O limite zero é válido para a função de faixa mesmo que os campos obrigatórios do formulário produzam um mínimo maior. O trigger SQL repete a regra para impedir fraude pelo cliente.

## 4. Como o repositório troca de implementação

A fábrica `src/repositories/index.js` usa `LocalOccurrenceRepository` quando faltam as variáveis de configuração. Os exemplos fictícios e novos registros ficam no `localStorage`. Com URL e chave pública, usa `SupabaseOccurrenceRepository` e uma sessão Auth anônima. As páginas usam o mesmo contrato `list`, `get`, `create`, `updateStatus` sem conhecer SQL ou o armazenamento.

Erros precisam chegar à UI; uma falha remota não pode produzir sucesso local falso. A chave pública é visível no JavaScript: a segurança vem de RLS, grants e `auth.uid()`, nunca de esconder essa chave. Não coloque credenciais de servidor no navegador.

No banco, aplique as migrações `001 → 002 → 003`, somente se ainda faltarem no projeto, seguindo o preflight do README. A `001` define estrutura e acesso; a `002` impede repetir o mesmo caminho de foto; a `003` exige o upload no bucket correto e protege a foto já vinculada. Ela consulta apenas metadados com as policies SELECT. Um upload órfão continua removível para compensar uma rejeição definitiva. Não apague metadados de `storage.objects` manualmente: use a API do Storage para a limpeza autorizada.

## 5. Como formulário, mapa e dashboard usam dados

O formulário coleta valores, valida a foto e aproxima coordenadas. A classificação explica os pontos. O envio só ocorre depois da revisão humana e bloqueia duplicidades enquanto aguarda o repositório. Em falha recuperável, os campos permanecem disponíveis para corrigir e tentar novamente.

A revisão guarda uma chave da tentativa no rascunho da aba. Se a resposta do banco se perder, uma nova tentativa com essa chave procura o registro já criado antes de enviar novamente. A chave não é uma coluna nem um dado do cidadão. Alterar o formulário inicia uma tentativa nova; aplique também a migração `002`, que impede repetir o mesmo caminho de foto no banco. Uma resposta incerta preserva a foto até que seja possível conferir o resultado.

O adaptador remoto percorre páginas com contagem exata e ordenação estável. Assim, indicadores não usam apenas a primeira resposta limitada da API. Se a contagem mudar durante a leitura, o app pede nova tentativa para evitar totais parciais. No modo local, uma validação de integridade detecta registros malformados sem apagar o JSON original.

O mapa aplica filtros à lista do repositório e mostra marcadores com atribuição OpenStreetMap. O dashboard agrega a mesma lista por categoria/recipiente, bairro, status, nível e período. Confira qualquer gráfico pela contagem de registros que o gerou. Após um salvamento ou mudança de status, as telas leem dados atualizados.

Detalhes próprios mostram foto, descrição e histórico; detalhes comunitários mostram apenas os campos seguros da RPC. Somente o autor altera status nas transições permitidas. Isso representa seu acompanhamento e não atendimento oficial.

## 6. Executar e interpretar os testes

```sh
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:visual
```

No PowerShell com scripts bloqueados, use `npm.cmd` e `npx.cmd`. Leia o primeiro erro e o arquivo indicado antes de alterar um teste.

- Vitest/jsdom verifica regras puras, validação, status, filtros, agregações, contrato local, adaptador Supabase mockado, erros e duplicidade. A meta mínima de cobertura é 80% em linhas, funções, branches e statements dos módulos selecionados. Cobertura não prova ausência total de erros.
- Playwright percorre formulários, revisão, salvamento, detalhes, status, filtros e recarregamento em navegador real. Não exige Supabase configurado.
- Axe verifica problemas automatizáveis de acessibilidade nas telas principais; complemente com teclado, foco e leitura dos textos.
- Snapshots comparam a aparência em três resoluções. A CI usa Windows, como as baselines entregues. Os nomes distinguem plataforma; fonte e rasterização podem variar. Só atualize referências após abrir e revisar as imagens, sem esconder falhas.

`coverage/` e `test-results/` são saídas locais ignoradas pelo Git. As referências revisadas ficam em `tests/visual/`. `npm run check` executa as verificações integradas; o relatório desta entrega informa somente comandos realmente executados.

O Playwright inicia seu próprio servidor e confere o nome do produto e o título esperado de cada tela. O Fiscaliza usa as portas de teste 4173/4174 e o Radar usa 4273/4274; é possível verificar os dois ao mesmo tempo. Uma porta ocupada causa erro em vez de reutilizar um app diferente. Essas portas de teste são independentes das portas escolhidas para `npm run dev`.

Os resultados de Supabase real são distintos dos mocks e dos testes PGlite. Em 04/11, o smoke real passou em 26 checks, com quatro registros e fotos sintéticos; nenhum seed remoto foi aplicado. A `003` passou em 49 checks PGlite e foi aplicada no projeto. Em 05/11, uma rodada instrumentada posterior passou em 28 checks reais, 14 por app, com dois novos registros e fotos sintéticos preservados; o total passou a seis registros de teste, três por app. A primeira tentativa parcial não foi considerada aprovada; seu possível upload órfão ainda aguarda conferência e não integra os quatro órfãos removidos e verificados pela rodada posterior. Consulte [o estado da verificação](verification.md) antes de declarar uma etapa pronta.

`EXISTS` não é uma chave estrangeira e não verifica o significado da foto. Uma inserção e uma exclusão concorrentes ainda podem deixar uma referência sem arquivo. Moderação, retenção e proteção contra abuso/CAPTCHA são decisões futuras para uso público. CSP e cabeçalhos de defesa dependem da hospedagem e podem ser avaliados antes de publicar.

## 7. Exercícios seguros

1. Escreva um teste de uma combinação de pontos antes de alterar a função; explique a soma.
2. Crie um filtro e verifique que mapa, lista e total representam o mesmo conjunto.
3. Melhore um estado vazio e teste a tela por teclado em 320 px.
4. Simule erro de rede no mock e confira que não aparece sucesso e os dados permanecem no formulário.
5. Em uma cópia de estudo, altere um peso, atualize os testes e escreva uma nova migração. Não edite uma migração já aplicada num banco compartilhado.
6. Proponha um contrato para uma API real de classificação. Preserve revisão humana e mantenha chaves privadas no servidor; não invente resultados de um modelo não chamado.

Use dados e fotografias fictícios nos exercícios. O projeto mantém “IA” no nome, mas a versão atual usa regras transparentes e não interpreta a foto. Uma API real de visão computacional é uma evolução futura.
