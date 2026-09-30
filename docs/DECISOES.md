# Decisões técnicas

Resumo das escolhas do projeto e do porquê, para servir de roteiro em entrevistas.

## Um serviço só em produção
O FastAPI serve a API (`/api/*`) e o build estático do Angular (com *fallback* para `index.html`). Isso evita CORS, dois deploys e dois domínios, e cabe em um único Web Service do Render. Em desenvolvimento, o `ng serve` usa um proxy (`proxy.conf.json`) para `/api`.

## Camadas no backend
`routers → services → repositories → models`. Routers só lidam com HTTP; regras ficam nos services (fáceis de testar); repositories concentram o SQLAlchemy e **sempre** filtram por `user_id`. Dependências são fornecidas via `Depends`, o que permite trocar o provedor de IA nos testes sem *mock* global.

## Isolamento por usuário
A identidade vem do `sub` do JWT. Recursos de outros usuários respondem `404` (e não `403`) para não revelar que o ID existe. Há testes para leitura, edição e exclusão cruzadas, e também para vinculação de gerações.

## Limite diário de IA
Cada chamada cria uma linha em `ai_generations` antes de chamar o provedor (status `pending`), sob `SELECT ... FOR UPDATE` da linha do usuário, então requisições concorrentes não furam o limite. Sucesso vira `success`; falha do provedor vira `failed` e **não conta**. O "dia" usa o fuso `USAGE_TIMEZONE`.

## Abstração do provedor de IA
`AIProvider` é um `Protocol` com um único método. A implementação padrão usa o formato *chat completions*, aceito por vários provedores. Erros são mapeados para exceções de domínio (timeout, autenticação, limite, resposta inválida) que viram respostas HTTP controladas, sem vazar detalhes.

## Migrations em vez de `create_all()`
O esquema evolui só por Alembic. `alembic check` confirma que models e migration inicial estão em sincronia; o `start.sh` aplica `upgrade head` a cada início. Os testes usam `create_all()` apenas para montar um banco descartável.

## Frontend sem biblioteca de UI
Componentes standalone, *signals* e CSS próprio: bundle pequeno, menos dependências e controle total de acessibilidade e responsividade. O gráfico do dashboard é CSS puro.

## Token no `localStorage`
Escolha simples para uma SPA servida da mesma origem. A alternativa mais segura (cookie `HttpOnly` + CSRF/refresh token) está no roadmap.

## Testes
Backend: pytest + HTTPX (via `TestClient`), SQLite em memória por padrão e opção de rodar contra PostgreSQL real com `TEST_DATABASE_URL`. Frontend: Vitest com `HttpTestingController` para validar os contratos com a API.
