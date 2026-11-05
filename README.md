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

Sem variáveis de ambiente, os aplicativos funcionam em **Demonstração**, com dados fictícios e persistência somente no navegador. Nesta cópia de trabalho, os dois apps já usam o projeto Supabase `webapp-fs`, com autenticação anônima, tabelas protegidas por RLS e buckets privados. Os arquivos `.env.local` contêm somente a URL e a chave publicável e são ignorados pelo Git. Quem copiar os projetos deve configurar seu próprio ambiente conforme os READMEs.

A classificação atual usa regras explicadas e revisão humana. Não há IA visual real nem envio automático para órgãos públicos. O Radar apoia a prevenção ambiental e não substitui equipes de saúde ou vigilância.

O projeto Supabase foi criado pelo usuário no plano Free e configurado durante esta colaboração. O envio do código ao GitHub não publica os aplicativos. Os modelos de workflows em cada pasta precisam ser configurados na raiz do repositório antes de usar o GitHub Actions; os de publicação no GitHub Pages são manuais. Os resultados e os limites das verificações estão em `docs/verification.md` de cada aplicativo.
