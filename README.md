# Aplicativos comunitários — Fábrica de Software

Dois projetos independentes, implementados a partir dos protótipos e da memória do projeto e versionados juntos neste repositório. Cada pasta é autocontida e contém código, dependências, imagens, banco, documentação e testes próprios.

| Projeto                     | Pasta e instruções                                                       |
| --------------------------- | ------------------------------------------------------------------------ |
| FiscalizaLixo IA            | [fiscaliza-lixo-ia/README.md](fiscaliza-lixo-ia/README.md)               |
| Radar da Dengue Inteligente | [radar-dengue-inteligente/README.md](radar-dengue-inteligente/README.md) |

Com Node.js 24 instalado, entre na pasta escolhida e execute:

```powershell
npm.cmd ci
npm.cmd run dev
```

Para abrir os dois ao mesmo tempo, use dois terminais e uma porta diferente no segundo:

```powershell
# Terminal 1, dentro de fiscaliza-lixo-ia
npm.cmd run dev -- --port 5173

# Terminal 2, dentro de radar-dengue-inteligente
npm.cmd run dev -- --port 5174
```

Sem variáveis de ambiente, os aplicativos funcionam em **Demonstração**, com ocorrências fictícias, catálogos de referência de locais reais e novas informações persistidas somente no navegador. Nesta cópia de trabalho, os dois apps já usam o projeto Supabase `webapp-fs`, com autenticação anônima, tabelas protegidas por RLS e buckets privados. Os arquivos `.env.local` contêm somente a URL e a chave publicável e são ignorados pelo Git. Quem copiar os projetos deve configurar seu próprio ambiente conforme os READMEs.

O FiscalizaLixo inclui [ecopontos e locais de coleta de Itumbiara](fiscaliza-lixo-ia/docs/collection-points.md). O Radar inclui [endemias, vigilância sanitária e unidades de saúde](radar-dengue-inteligente/docs/health-services.md). Os catálogos têm mapas com posições inicialmente aproximadas, busca e sugestões sujeitas a validação. A presença de uma unidade de saúde no catálogo não confirma vacinação, agenda ou atendimento disponível no momento.

A classificação atual usa regras explicadas e revisão humana. Não há IA visual real nem envio automático para órgãos públicos. O Radar apoia a prevenção ambiental e não substitui equipes de saúde ou vigilância.

O projeto Supabase foi criado pelo usuário no plano Free e configurado durante esta colaboração. Os resultados e os limites das verificações estão em `docs/verification.md` de cada aplicativo.

## GitHub Pages

A publicação reúne uma página inicial e os dois aplicativos:

- [Página inicial](https://gesmarjunior.github.io/ProjetoFabricadeSoftwareSENAC/)
- [FiscalizaLixo IA](https://gesmarjunior.github.io/ProjetoFabricadeSoftwareSENAC/fiscaliza-lixo-ia/)
- [Radar da Dengue Inteligente](https://gesmarjunior.github.io/ProjetoFabricadeSoftwareSENAC/radar-dengue-inteligente/)

O workflow ativo fica em `.github/workflows/pages.yml`, na raiz deste repositório. Em **Settings → Pages**, a fonte é **GitHub Actions**. Em **Settings → Secrets and variables → Actions → Variables**, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. As duas variáveis são públicas no JavaScript gerado; nunca use chaves de servidor. A publicação falha se faltar a configuração publicável, para evitar publicar acidentalmente a demonstração.

Em **Actions → Publicar aplicativos no GitHub Pages → Run workflow**, execute a publicação da branch `main`. Ela instala as dependências, gera os dois builds e executa `scripts/assemble-pages.mjs`, que monta somente os arquivos públicos em `_site/`. O envio do código por push não publica automaticamente. Os workflows dentro das pastas dos aplicativos são modelos para uso dessas pastas como repositórios independentes.

Para conferir o mesmo pacote localmente:

```powershell
npm.cmd run build --prefix fiscaliza-lixo-ia
npm.cmd run build --prefix radar-dengue-inteligente
node scripts/assemble-pages.mjs
```
