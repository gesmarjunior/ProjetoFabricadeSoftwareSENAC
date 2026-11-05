# Orientações para manutenção

Este aplicativo é autocontido. Não importe código ou recursos da pasta irmã ou de diretórios superiores.

- Preserve JavaScript com módulos ES e Vite vanilla, conforme o pedido.
- Interface, mensagens e documentação pedagógica em português do Brasil.
- Separe regras puras, repositórios e apresentação. Use JSDoc e comentários para explicar decisões.
- Nunca inclua credenciais reais, chaves de servidor ou dados pessoais. Preserve RLS, Auth anônimo e buckets privados.
- A classificação atual usa regras transparentes e não interpreta a fotografia por IA. Exija revisão humana antes de salvar.
- Não crie administrador ou bypass de policies no cliente.
- Alterações de pontos ou status exigem sincronizar regra, testes e uma nova migração para bancos existentes.
- Execute verificações apropriadas à alteração. Para mudanças visuais ou de interação, use Playwright e revise as imagens antes de atualizar snapshots.
- Não publique ou crie serviços externos sem instrução do usuário. O workflow Pages é manual.

Consulte `README.md`, `docs/architecture.md` e `docs/student-guide.md`.
