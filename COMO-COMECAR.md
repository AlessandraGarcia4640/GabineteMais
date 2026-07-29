# COMO COMEÇAR — Gabinete+

Guia de setup do ambiente, criação do projeto e uso dos planos com o Claude.
Pré-requisito de leitura: `ROADMAP.md` (visão geral) e `planos/fase-0-*.md` (primeira fase).

---

## 1. Setup do computador (Windows)

Instale nesta ordem. Versões: sempre a LTS/estável vigente.

### 1.1 Ferramentas base

| Ferramenta | Como instalar | Verificação |
|------------|---------------|-------------|
| **Git** | `winget install Git.Git` | `git --version` |
| **Node.js LTS** | Instale o **fnm** (`winget install Schniz.fnm`) e depois `fnm install --lts` — gerenciador de versões evita conflitos futuros | `node --version` |
| **pnpm** | `corepack enable` (vem com o Node) ou `npm install -g pnpm` | `pnpm --version` |
| **Docker Desktop** | `winget install Docker.DockerDesktop` (requer WSL2 — o instalador orienta) | `docker compose version` |
| **VS Code** | `winget install Microsoft.VisualStudioCode` | — |
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` e depois `claude` para autenticar | `claude --version` |

### 1.2 Configuração do Git (uma vez)

```bash
git config --global user.name "Alessandra Souza Garcia"
git config --global user.email "seu-email@exemplo.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input   # evita problemas de fim de linha no Windows
```

### 1.3 Extensões do VS Code

ESLint, Prettier, Prisma, Expo Tools. Ative "Format on Save" com Prettier como formatador padrão.

### 1.4 Mobile (para rodar o app)

- **Celular físico (mais simples):** instale o app **Expo Go** (Play Store/App Store). Celular e computador na mesma rede Wi-Fi.
- **Emulador Android (opcional):** instale o Android Studio e crie um AVD. Só necessário se não quiser usar o celular.
- iOS: só compila em Mac; para o TCC, Android físico + Expo Go é suficiente.

---

## 2. Criar o projeto e o repositório

### 2.1 GitHub

1. Crie uma conta em github.com (se não tiver) e um repositório **privado** chamado `gabinete-plus` (sem README — o projeto será enviado do computador).
2. Autentique o Git com o GitHub: `winget install GitHub.cli` e depois `gh auth login` (opção HTTPS + browser).

### 2.2 Estrutura inicial

```bash
mkdir gabinete-plus && cd gabinete-plus
git init
```

Copie para dentro da pasta os arquivos deste pacote de planejamento:

```
gabinete-plus/
├── CLAUDE.md          ← copie o arquivo entregue
├── ROADMAP.md         ← copie o arquivo entregue
├── COMO-COMECAR.md    ← este arquivo
└── planos/            ← copie os 7 planos de fase
```

Primeiro commit e push:

```bash
git add .
git commit -m "docs: roadmap, planos de implementação e CLAUDE.md"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gabinete-plus.git
git push -u origin main
```

> O restante da estrutura (apps/, packages/, docker-compose.yml etc.) **não é criado à mão** —
> é o trabalho da Fase 2, executado com o Claude (seção 4). A árvore-alvo está em
> `planos/fase-2-arquitetura-e-setup.md`.

### 2.3 Fluxo de trabalho com Git (durante todo o projeto)

```bash
git checkout -b feat/nome-da-tarefa   # nova branch por tarefa
# ... trabalho ...
git add . && git commit -m "feat(api): descrição curta"
git push -u origin feat/nome-da-tarefa
# abrir Pull Request no GitHub → CI verde → merge na main
```

Convenção de commits: `feat(api):`, `feat(mobile):`, `fix(...):`, `docs:`, `test(...):`, `chore:`.
Nunca commite direto na `main` após a Fase 2 ativar a proteção de branch.

---

## 3. Rodar o projeto no dia a dia (após a Fase 2 existir)

```bash
docker compose up -d                # 1. banco Postgres
pnpm install                        # 2. dependências (após qualquer pull)
pnpm -F api prisma migrate dev      # 3. migrations pendentes
pnpm -F api seed                    # 4. dados fictícios (primeira vez ou após reset)
pnpm -F api dev                     # 5. API (terminal 1)
pnpm -F mobile start                # 6. Expo (terminal 2) → QR code → Expo Go no celular
```

Antes de qualquer commit: `pnpm typecheck && pnpm lint && pnpm test` — tudo verde, zero warnings.

---

## 4. Como usar os planos com o Claude

O `CLAUDE.md` é lido automaticamente pelo Claude Code em toda sessão aberta na raiz do
repositório — ele já contém as regras de código e o fluxo de trabalho. Os planos são o roteiro;
seu papel é apontar o plano certo e revisar o resultado.

### 4.1 Princípios

1. **Uma fase por vez, na ordem do ROADMAP.** Nunca peça "implemente o projeto inteiro".
2. **Uma sessão por tarefa/módulo.** Sessões longas degradam contexto; encerre e abra outra ao trocar de módulo.
3. **Peça plano antes de código** em tarefas grandes (o modo Plan do Claude Code — `Shift+Tab` — serve para isso).
4. **Você revisa; o checklist decide.** Uma fase só termina quando todos os itens de "Revisão e critérios de saída" do plano passarem.

### 4.2 Prompts-modelo

Iniciar uma fase:

```
Leia ROADMAP.md e planos/fase-2-arquitetura-e-setup.md. Estamos iniciando a Fase 2.
Execute a Etapa 2.1 (Bootstrap) exatamente como especificada. Ao final, rode as
verificações e me mostre o resultado antes de fazer commit.
```

Continuar de onde parou:

```
Leia planos/fase-3-backend-core.md. Os módulos 1 e 2 estão prontos (veja o histórico
do git). Implemente o Módulo 3 (Routines) seguindo o ciclo definido no plano:
schemas → repository → service → router → testes → OpenAPI.
```

Encerrar uma fase:

```
Percorra a seção "Revisão e critérios de saída" de planos/fase-3-backend-core.md
item por item, verificando cada um no código real (rode os comandos, liste as rotas,
confira os testes). Reporte o que passa e o que falta — não corrija nada ainda.
```

Quando surgir ideia nova fora do escopo:

```
Registre esta ideia no backlog v2 (docs/backlog-v2.md) e NÃO a implemente agora,
conforme o fluxo do CLAUDE.md.
```

### 4.3 O que fazer você mesma (o Claude não substitui)

- Entrevistas, mapeamento de rotinas e decisões de requisito (Fase 0) — o Claude ajuda a estruturar, mas o conteúdo vem do seu conhecimento do gabinete.
- Protótipos no Figma (Fase 1) — o Claude pode criticar e sugerir, não desenha por você.
- Sessões de validação com usuários (Fase 6).
- Revisão de todo PR antes do merge: leia o diff, rode o app, confirme que entendeu o que foi feito. Código que você não entende não entra na `main`.

### 4.4 Checklist de fim de sessão com o Claude

- [ ] `pnpm typecheck && pnpm lint && pnpm test` verdes.
- [ ] App/API rodam e o fluxo alterado funciona de verdade (teste manual rápido).
- [ ] Diff revisado e compreendido.
- [ ] Commit feito em branch própria com mensagem convencional.
- [ ] Se o contrato de API mudou: `packages/shared` + OpenAPI atualizados no mesmo commit.

---

## 5. Solução de problemas comuns

| Problema | Solução |
|----------|---------|
| Docker não sobe / erro de WSL2 | Abra o Docker Desktop uma vez e siga o assistente do WSL2; reinicie o computador |
| Expo Go não conecta | Celular e PC na mesma rede; desative VPN; tente `pnpm -F mobile start --tunnel` |
| `prisma migrate dev` falha em banco sujo | `pnpm -F api prisma migrate reset` (apaga dados locais) e rode o seed de novo |
| Porta 5432 ocupada | Outro Postgres instalado — pare o serviço do Windows ou mude a porta no `docker-compose.yml` |
| Erros de fim de linha (CRLF/LF) no lint | Confirme `git config core.autocrlf input` e a extensão EditorConfig no VS Code |
