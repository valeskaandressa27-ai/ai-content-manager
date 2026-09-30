# AI Content Manager

Aplicação **full stack** para pequenos negócios criarem, organizarem e reutilizarem conteúdos de marketing com **inteligência artificial**. Projeto de portfólio com autenticação, isolamento de dados por usuário, integração com IA no backend, limite diário de gerações, testes automatizados, Docker e deploy em um único serviço no Render.

## Sumário

- [Sobre o projeto](#sobre-o-projeto) · [Funcionalidades](#funcionalidades) · [Tecnologias](#tecnologias) · [Arquitetura](#arquitetura) · [Estrutura de pastas](#estrutura-de-pastas)
- [Requisitos](#requisitos) · [Instalação local](#instalação-local) · [Configuração do .env](#configuração-do-env) · [Banco de dados e Alembic](#banco-de-dados) · [Docker](#docker) · [Testes](#testes)
- [API e Swagger](#api) · [Autenticação](#autenticação) · [Integração com IA](#integração-com-ia) · [Limite de gerações](#limite-de-gerações)
- [Deploy no Render](#deploy-no-render) · [Variáveis de ambiente](#variáveis-de-ambiente) · [Segurança](#segurança) · [Screenshots](#screenshots) · [Roadmap](#roadmap)

## Sobre o projeto

O usuário cria uma conta, cadastra os dados da empresa (segmento, público, tom de comunicação), gera conteúdos e campanhas com IA, edita, salva e consulta tudo em uma biblioteca com busca, filtros e paginação. Um dashboard mostra indicadores reais do banco. **Cada usuário enxerga somente os próprios dados.**

## Funcionalidades

- Landing page pública, cadastro, login (JWT), logout, proteção de rotas e tratamento de sessão expirada.
- Perfil da empresa, reaproveitado como contexto em todas as gerações de IA.
- Gerador de conteúdo: legenda para Instagram, descrição de produto, anúncio, e-mail, texto para site, título, CTA promocional, post de blog, mensagem de WhatsApp e roteiro de vídeo. Resultado pode ser **visualizado, copiado, editado, salvo, regenerado e excluído**.
- Campanhas geradas por IA (conceito, ideias de posts, legendas, CTAs, hashtags, formatos e calendário básico), com edição posterior.
- Biblioteca de conteúdos: listagem paginada no backend, busca, filtro por tipo e status, visualização individual, edição, exclusão e cópia.
- Dashboard com dados reais: totais, conteúdos por tipo, uso de IA nos últimos 14 dias, gerações e atividades recentes, com estados vazios.
- Limite diário de gerações por usuário, controlado no backend, exibido como `Gerações utilizadas hoje: X / 20`.
- Perfil do usuário: alterar nome e senha (o e-mail, usado no login, não é editável).
- Interface responsiva (320 px até desktop), acessível (labels, foco visível, erros ligados aos campos via `aria-describedby`), com estados de loading, vazios, erros amigáveis e confirmação para ações destrutivas.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | Angular 21 (componentes standalone, signals), TypeScript, Angular Router, Reactive Forms, HttpClient, guards, `HttpInterceptor`, CSS próprio responsivo, Vitest |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PyJWT, bcrypt, HTTPX, pytest |
| Banco | PostgreSQL |
| Infra | Docker (multi-stage), Docker Compose, Render (1 Web Service + PostgreSQL) |

Não foi usada biblioteca de UI nem de gráficos: componentes e gráficos são CSS/HTML próprios, mantendo o bundle inicial pequeno (~85 kB transferidos).

## Arquitetura

```
Navegador ── Angular (SPA) ──► FastAPI /api/* ──► Services ──► Repositories ──► PostgreSQL
                                   │
                                   └─► AIService ─► AIProvider ─► API do provedor de IA
```

- **Um único serviço em produção:** o FastAPI serve a API em `/api/*`, `GET /health`, a documentação em `/api/docs` e os arquivos estáticos do build do Angular, com *fallback* para `index.html` (rotas da SPA como `/dashboard` funcionam ao recarregar a página).
- **Camadas do backend:** `routers` (HTTP) → `services` (regras de negócio) → `repositories` (SQLAlchemy) → `models`. Schemas Pydantic validam entrada e saída.
- **IA isolada:** `AIService` orquestra limite diário, contexto da empresa e registro; `AIProvider` é uma interface (`Protocol`). A implementação `OpenAICompatibleProvider` fala com qualquer API no formato *chat completions*. Trocar de provedor não exige mexer no restante. **A chave nunca sai do backend.**
- **Isolamento de dados:** a identidade vem **somente do JWT**. Todo acesso a recurso privado passa por consultas que filtram `id` **e** `user_id`; recurso de outro usuário responde `404` (não vaza a existência do registro).

Decisões pensadas para explicar em entrevista estão em [`docs/DECISOES.md`](docs/DECISOES.md).

## Estrutura de pastas

```
ai-content-manager/
├── backend/
│   ├── app/
│   │   ├── main.py              # fábrica da aplicação (create_app)
│   │   ├── spa.py               # serve o build do Angular + fallback SPA
│   │   ├── core/                # config (env), segurança (JWT/bcrypt), erros
│   │   ├── database/            # engine, sessão, Base
│   │   ├── models/              # users, companies, contents, campaigns, ai_generations
│   │   ├── schemas/             # validação Pydantic
│   │   ├── repositories/        # acesso a dados (sempre filtrando por dono)
│   │   ├── services/            # regras de negócio (+ services/ai/: provider, prompts, service)
│   │   ├── dependencies/        # usuário autenticado, fábricas de serviços
│   │   └── routers/             # endpoints por domínio
│   ├── alembic/                 # migrations
│   ├── scripts/                 # start.sh (produção) e seed_dev.py (dados locais)
│   └── tests/                   # pytest
├── frontend/
│   └── src/app/
│       ├── core/                # guards, interceptors, services, models
│       ├── features/            # landing, auth, dashboard, content-generator, contents, campaigns, company, profile
│       ├── layout/              # shell (sidebar + header)
│       └── shared/              # componentes, validadores, constantes
├── docs/
├── Dockerfile · docker-compose.yml · .dockerignore · .gitignore · .env.example · render.yaml
└── README.md
```

## Requisitos

- **Com Docker:** Docker e Docker Compose v2.
- **Sem Docker:** Python 3.12+, Node.js 20.19+ / 22.12+ / 24+ (exigência do Angular 21) e PostgreSQL 14+.
- Uma chave de API de um provedor de IA compatível (só para gerar conteúdo; o restante funciona sem ela).

## Instalação local

### Opção A — Docker (mais simples)

```bash
cp .env.example .env        # defina SECRET_KEY e as variáveis AI_* (veja abaixo)
docker compose up --build
```

Acesse **http://localhost:8000** (app) e **http://localhost:8000/api/docs** (Swagger). O Compose sobe a aplicação e um PostgreSQL, aplica as migrations automaticamente e persiste os dados no volume `pgdata`.

### Opção B — sem Docker

Crie o banco (exemplo): `createdb ai_content_manager`, e configure o `.env` na raiz (ou em `backend/`) a partir do `.env.example`, com `DATABASE_URL=postgresql://usuario:senha@localhost:5432/ai_content_manager`.

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head                 # cria as tabelas
uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm ci
npm start                            # http://localhost:4200 (proxy de /api para localhost:8000)
```

Para simular a produção localmente (um só servidor): `cd frontend && npm run build`, depois `uvicorn app.main:app --port 8000` dentro de `backend/` e abra http://localhost:8000.

**Dados de demonstração (opcional, só local):** `cd backend && python -m scripts.seed_dev` cria `demo@example.com` / `Demo1234` com uma empresa, um conteúdo e uma campanha de exemplo (textos escritos à mão, **não** gerados por IA). O script recusa rodar com `ENVIRONMENT=production` e nada é criado automaticamente.

## Configuração do .env

Copie `.env.example` para `.env`. Nunca versione o `.env` (já está no `.gitignore`).

```bash
# gerar uma SECRET_KEY segura
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Em `ENVIRONMENT=development`, se `SECRET_KEY` estiver vazia, uma chave temporária é gerada a cada início (você será deslogado ao reiniciar). Em `production`, `SECRET_KEY` (32+ caracteres) e `DATABASE_URL` são **obrigatórias** e `CORS_ORIGINS` não aceita `*` — a aplicação se recusa a iniciar caso contrário.

## Banco de dados

Tabelas: `users`, `companies` (1 por usuário), `contents`, `campaigns` e `ai_generations` (cada chamada à IA, base do limite diário e do dashboard). Todas as tabelas privadas têm `user_id` com `ON DELETE CASCADE`, e há índices em `users.email` (único), `(user_id, created_at)`, `(user_id, type)` e `(user_id, status)`.

### Alembic

O esquema é criado **somente por migrations** (a aplicação nunca chama `create_all()`).

```bash
cd backend
alembic upgrade head        # aplica todas as migrations
alembic current             # versão atual
alembic downgrade -1        # desfaz a última
alembic check               # confirma que models e migrations estão em sincronia
alembic revision --autogenerate -m "descrição"   # nova migration após alterar models
```

A URL vem de `DATABASE_URL` (formatos `postgres://` e `postgresql://` são adaptados para o driver `psycopg 3`). No container, `scripts/start.sh` roda `alembic upgrade head` antes de iniciar o Uvicorn.

## Docker

```bash
docker compose up --build      # app + PostgreSQL
docker compose down            # para os serviços (dados mantidos)
docker compose down -v         # para e apaga o volume do banco
```

O `Dockerfile` é multi-stage: um estágio Node compila o Angular; o estágio final (Python slim, usuário não-root) instala as dependências, copia o backend e o build do Angular para `/app/static`, e inicia `scripts/start.sh`, que respeita a variável `PORT`. O `HEALTHCHECK` consulta `/health`.

## Testes

**Backend** (pytest + HTTPX; usa SQLite em memória por padrão):

```bash
cd backend
pytest
# rodar contra PostgreSQL real (as tabelas do banco de teste são recriadas!):
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco_de_teste pytest
```

Cobre: autenticação (cadastro, e-mail duplicado, login, senha inválida, sem token, token inválido/expirado), **autorização e isolamento entre usuários** (ler/editar/excluir recurso alheio), CRUD, filtros e paginação de conteúdos, campanhas, empresa e perfil, dashboard, IA (geração, prompt com contexto da empresa, erros do provedor, timeout, limite diário, regeneração consumindo limite, limite por usuário), validações, health check, servidor da SPA (inclusive *path traversal*), CORS e regras de configuração de produção.

**Frontend** (Vitest via Angular CLI):

```bash
cd frontend
npm test -- --watch=false
```

Cobre: `AuthService`, `HttpInterceptor` (token, 401/sessão expirada), guards, validadores de senha, tradução de erros da API, componentes de login, cadastro, gerador de conteúdo (limite, regeneração, salvar, erros) e medidor de uso.

## API

Documentação interativa (Swagger UI): **`/api/docs`** (ReDoc em `/api/redoc`, esquema em `/api/openapi.json`). As rotas estão organizadas pelas tags *Authentication, Users, Company, Contents, Campaigns, AI, Dashboard* e *Health*. Para testar rotas protegidas no Swagger, faça login, copie o `access_token` e use o botão **Authorize**.

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register` · `/api/auth/login` | Cadastro · login (retorna JWT) |
| GET | `/api/auth/me` | Usuário autenticado |
| GET · PATCH | `/api/users/me` | Ver · editar nome |
| PUT | `/api/users/me/password` | Alterar senha |
| GET · PUT | `/api/company` | Ver (ou `null`) · criar/atualizar empresa |
| GET · POST | `/api/contents` | Listar (paginado, `search`, `type`, `status`) · salvar |
| GET · PATCH · DELETE | `/api/contents/{id}` | Detalhar · editar · excluir |
| GET · POST | `/api/campaigns` | Listar (paginado, `search`) · salvar |
| GET · PATCH · DELETE | `/api/campaigns/{id}` | Detalhar · editar · excluir |
| POST | `/api/ai/generate` · `/api/ai/generate-campaign` | Gerar conteúdo · campanha (consomem 1 geração) |
| GET | `/api/ai/usage` | Consumo diário do usuário |
| GET | `/api/dashboard` | Indicadores do usuário |
| GET | `/health` | Health check |

### Exemplos

```bash
BASE=http://localhost:8000

# Cadastro
curl -X POST $BASE/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ana Souza","email":"ana@example.com","password":"Senha1234","password_confirm":"Senha1234"}'

# Login (guarde o token)
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"Senha1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Empresa (contexto para a IA)
curl -X PUT $BASE/api/company -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Studio Bela","segment":"Salão de beleza","communication_tone":"Acolhedor"}'

# Gerar conteúdo com IA
curl -X POST $BASE/api/ai/generate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content_type":"instagram_caption","product_or_service":"Esmalte vegano","tone":"Descontraído","length":"short"}'
# -> {"generation_id":1,"generated_content":"...","usage":{"used_today":1,"limit":20,"remaining":19,"resets_at":"..."}}

# Salvar o conteúdo (vinculando à geração)
curl -X POST $BASE/api/contents -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"instagram_caption","title":"Legenda do esmalte","generated_content":"Texto...","generation_id":1}'

# Listar com filtros e paginação
curl "$BASE/api/contents?page=1&page_size=10&type=instagram_caption&search=esmalte" -H "Authorization: Bearer $TOKEN"
```

**Formato de erro** (sempre JSON, sem *stack trace*): `{"detail": "mensagem em português", "code": "CODIGO"}`. Erros de validação (`422`) incluem `errors: [{field, message}]`. Códigos usados: `400, 401, 404, 409, 422, 429` (limite de IA), `502/503/504` (provedor de IA) e `500`.

## Autenticação

- Senhas com **bcrypt** (mínimo de 8 caracteres, com letras e números; máximo de 72 bytes por limitação do algoritmo).
- Login retorna um **JWT** (HS256, expira em `ACCESS_TOKEN_EXPIRE_MINUTES`, padrão 60). O backend identifica o usuário **apenas** pelo `sub` do token.
- O Angular guarda o token em `localStorage`; o `HttpInterceptor` o anexa às chamadas de `/api` (exceto login/cadastro) e, ao receber `401`, limpa a sessão e redireciona para `/login` com aviso de sessão expirada. O `authGuard` também confere a expiração do token antes de abrir rotas privadas.
- O login usa a mesma mensagem para e-mail inexistente e senha errada e gasta o mesmo tempo de verificação, dificultando a descoberta de e-mails cadastrados.

## Integração com IA

Configure três variáveis (somente no backend / painel do Render):

```
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=...
AI_MODEL=nome-do-modelo
```

Qualquer provedor que aceite o formato *chat completions* funciona (por exemplo OpenAI, Groq, OpenRouter e o endpoint de compatibilidade do Gemini) — confira na documentação do provedor a URL completa e o nome do modelo. Para um provedor com formato diferente, implemente `AIProvider.generate(system_prompt, user_prompt) -> str` e troque em `app/services/ai/provider.py::build_provider`.

O backend monta o prompt (instruções de sistema + tipo de conteúdo + dados do formulário + contexto da empresa, quando habilitado). O prompt instrui a IA a não inventar preços, prazos ou números. Nada é gerado automaticamente: só quando o usuário clica.

**Tratamento de falhas:** timeout (`AI_TIMEOUT_SECONDS`), erro de rede, `401/403` do provedor (chave inválida), `429`, `5xx` e respostas inválidas/vazias viram erros controlados (`503/504/502`) com mensagem amigável. **Nunca é devolvido conteúdo inventado** e falhas **não consomem** o limite do usuário, que pode tentar de novo. Detalhes técnicos ficam apenas nos logs (sem a chave). Sem `AI_*` configuradas, a API responde `503 AI_NOT_CONFIGURED`.

## Limite de gerações

- `AI_DAILY_GENERATION_LIMIT` (padrão `20`) por usuário e por dia. O "dia" vira à meia-noite no fuso `USAGE_TIMEZONE` (padrão `America/Sao_Paulo`).
- Contabilizado na tabela `ai_generations`, **no backend**: o cliente não envia nem altera o limite. Gerar e **regenerar** são a mesma operação e cada uma consome 1.
- A vaga é **reservada antes** de chamar o provedor, sob *lock* da linha do usuário no PostgreSQL. Requisições simultâneas não conseguem ultrapassar o limite (validado com 10 requisições paralelas contra o PostgreSQL). Se o provedor falhar, a reserva é marcada como `failed` e devolvida.
- Ao exceder: `429` com `code: AI_LIMIT_REACHED` e mensagem `Limite diário de IA atingido`. O frontend exibe `Gerações utilizadas hoje: X / N` e `Gerações restantes: Y` com valores vindos de `GET /api/ai/usage` e das respostas de geração.

## Deploy no Render

Arquitetura: **1 repositório GitHub → 1 Web Service (Docker) → FastAPI servindo o Angular**, mais um **PostgreSQL** do Render. Não há segundo serviço de frontend.

1. **Criar o repositório no GitHub.** Extraia o projeto, crie um repositório vazio e envie:
   ```bash
   git init && git add . && git commit -m "AI Content Manager"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/ai-content-manager.git
   git push -u origin main
   ```
   Confira que o `.env` **não** foi enviado (o `.gitignore` já o exclui).
2. **Criar o PostgreSQL no Render:** *New +* → *PostgreSQL*. Escolha nome e região e crie. Quando ficar disponível, copie a **Internal Database URL** (o serviço e o banco devem estar na mesma região). O plano gratuito de banco tem prazo de validade: consulte as regras atuais do Render.
3. **Criar o Web Service:** *New +* → *Web Service* → conecte o repositório do GitHub.
4. **Configurar o build:** em *Language/Runtime* escolha **Docker**. O Render usa o `Dockerfile` da raiz (compila o Angular e monta a imagem do FastAPI). Não é preciso *Build Command*.
5. **Start command:** deixe **vazio** — o `CMD` do Dockerfile (`sh scripts/start.sh`) já aplica as migrations e inicia o servidor. Não fixe porta: o app usa a variável `PORT` fornecida pelo Render.
6. **Variáveis de ambiente** (*Environment*):

   | Variável | Valor |
   | --- | --- |
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | a Internal Database URL do passo 2 |
   | `SECRET_KEY` | uma chave aleatória de 32+ caracteres (`python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
   | `AI_API_URL` · `AI_API_KEY` · `AI_MODEL` | dados do seu provedor de IA |
   | `AI_DAILY_GENERATION_LIMIT` | `20` (ou o valor desejado) |

   `CORS_ORIGINS` é opcional: como o Angular e a API são servidos pela mesma origem, não há chamadas *cross-origin*.
7. **Conexão com o PostgreSQL:** basta o `DATABASE_URL` acima; o app converte `postgres://`/`postgresql://` para o driver e não guarda credenciais no código.
8. **Migrations:** rodam automaticamente a cada início (`alembic upgrade head` em `scripts/start.sh`). Para rodar manualmente, use o *Shell* do serviço: `alembic upgrade head`.
9. **Health check:** em *Settings → Health Check Path* informe **`/health`**.
10. **Deploy:** clique em *Create Web Service* (ou *Manual Deploy → Deploy latest commit*) e acompanhe os logs.
11. **Verificar:** abra `https://SEU-SERVICO.onrender.com/health` (deve retornar `{"status":"ok"}`), depois a página inicial, crie uma conta e gere um conteúdo. A documentação fica em `/api/docs`.

**Alternativa:** o arquivo `render.yaml` é um *Blueprint* opcional que cria banco e serviço de uma vez (*New +* → *Blueprint*). Confira os nomes de plano no painel do Render, pois podem mudar. Em planos gratuitos o serviço pode "dormir" por inatividade e a primeira requisição demora mais.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `ENVIRONMENT` | não | `development` | `development`, `test` ou `production` |
| `DATABASE_URL` | produção | — | URL do PostgreSQL (`postgres://` ou `postgresql://`) |
| `SECRET_KEY` | produção | efêmera (dev) | Assina os JWTs (32+ caracteres em produção) |
| `CORS_ORIGINS` | não | `http://localhost:4200` (dev) / vazio (prod) | Origens permitidas, separadas por vírgula; `*` é recusado em produção |
| `AI_API_URL` | para gerar | — | Endpoint completo *chat completions* |
| `AI_API_KEY` | para gerar | — | Chave do provedor (somente backend) |
| `AI_MODEL` | para gerar | — | Nome do modelo |
| `AI_DAILY_GENERATION_LIMIT` | não | `20` | Gerações por usuário por dia |
| `AI_TIMEOUT_SECONDS` | não | `30` | Timeout da chamada ao provedor |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | não | `60` | Validade do JWT |
| `USAGE_TIMEZONE` | não | `America/Sao_Paulo` | Fuso do "dia" do limite |
| `FRONTEND_DIST_DIR` | não | `frontend/dist/frontend/browser` (`/app/static` no Docker) | Onde está o build do Angular |
| `PORT` | não | `8000` | Porta do servidor (definida pelo Render) |

## Segurança

- Senhas com bcrypt; JWT com expiração; identidade **somente** pelo token.
- **Autorização por usuário** em todos os recursos privados (consultas com `id` + `user_id`), com testes específicos.
- Validação de entrada com Pydantic (tamanhos máximos, tipos, e-mail); ORM/SQL parametrizado; busca com curingas de `LIKE` escapados.
- Chave da IA e demais segredos apenas em variáveis de ambiente; nada no frontend, no Git ou no README; `.env` ignorado no Git e na imagem Docker.
- CORS configurável, sem `*` em produção; produção sem `debug`; erros sem detalhes internos (o `500` é genérico e o detalhe vai só para o log).
- Servidor de arquivos estáticos protegido contra *path traversal*; contêiner roda com usuário não-root.
- Limitações conhecidas: o JWT fica em `localStorage` (padrão comum em SPAs, mas sujeito a roubo em caso de XSS; o Angular escapa o conteúdo por padrão e o app não usa `innerHTML`), e não há *rate limit* de tentativas de login (ver Roadmap).

## Screenshots

Este repositório não inclui capturas de tela. Depois de rodar o projeto, salve as imagens em `docs/screenshots/` (sugestão: `landing.png`, `dashboard.png`, `gerador.png`, `biblioteca.png`, `campanha.png`) e referencie-as aqui, por exemplo: `![Dashboard](docs/screenshots/dashboard.png)`.

## Roadmap

- Rate limit de tentativas de login e refresh token com cookie `HttpOnly`.
- Recuperação de senha por e-mail e confirmação de e-mail.
- Exportação de conteúdos e campanhas (PDF/CSV) e agendamento de publicações.
- Respostas da IA em *streaming* e templates de prompt por segmento.
- Integração contínua (GitHub Actions) rodando testes e build a cada push.
