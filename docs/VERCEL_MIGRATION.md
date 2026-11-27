# Plano de migração para Vercel

## Estado atual
- [x] Auditoria inicial da arquitetura e dos arquivos de configuração.
- [x] Criar branch isolada `chore/vercel-migration`.
- [x] Criar `vercel.json` com serviços separados para Angular e FastAPI no mesmo projeto Vercel.
- [x] Criar `backend/main.py` como entrypoint ASGI da Vercel.
- [ ] Obter autorização da equipe/conta Vercel para criar o projeto.
- [ ] Confirmar que o recurso Vercel Services está disponível no plano Hobby antes de publicar.
- [ ] Validar build Angular e runtime FastAPI em preview.
- [ ] Confirmar conectividade externa e backup do PostgreSQL atual.
- [ ] Configurar variáveis secretas no painel da Vercel; nunca gravá-las no Git.
- [ ] Executar migrations uma única vez, de forma controlada e após backup.
- [ ] Testar autenticação, CRUD, dashboard e geração via Groq.
- [ ] Validar rotas profundas do Angular, API e health check.
- [ ] Só depois da validação, decidir se o link público será atualizado.

## Arquitetura identificada
O deploy atual usa um único Dockerfile: compila o Angular e copia o build para o backend; o FastAPI atende tanto `/api/*` quanto os arquivos da SPA. O frontend usa `API_URL = '/api'`, portanto as duas partes podem continuar sob a mesma origem pública.

A branch de migração contém uma configuração Vercel Services com um único projeto e dois serviços:
1. **Frontend**: raiz `frontend/`; a Vercel deve detectar Angular pelo `angular.json` e `package.json`.
2. **Backend**: raiz `backend/`; `requirements.txt` já está nessa pasta e `main.py` expõe `app` importando a aplicação existente de `app.main`.

O `vercel.json` roteia `/api/*` e `/health` para o serviço backend e o restante para o frontend. Isso mantém a API em `/api` na mesma origem e evita introduzir CORS entre dois domínios. A configuração segue o padrão de múltiplos serviços documentado pela Vercel; a disponibilidade do recurso no plano Hobby ainda precisa ser confirmada na conta antes de depender dele.

## Banco de dados e segurança
- O PostgreSQL atual no Render está disponível, no plano gratuito, com expiração informada para **26/12/2026**. Isso torna a migração de banco um item prioritário; não significa que os dados já foram copiados.
- Manter o banco original intacto. Não executar migrations, alterações de schema, cópia ou exclusão até confirmar backup, URL externa e destino.
- O banco está na região Oregon. Precisamos validar conexão externa a partir da Vercel e latência; a URL interna do Render não deve ser presumida acessível fora do Render.
- Não executar `alembic upgrade head` a cada inicialização de Function. As migrations devem ser executadas uma única vez, após backup e validação do alvo.
- Configurar `DATABASE_URL`, `SECRET_KEY`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` e, se necessário, `CORS_ORIGINS` no painel da Vercel; nunca versionar valores secretos.
- A aplicação exige `SECRET_KEY` com pelo menos 32 caracteres e `DATABASE_URL` em produção. As variáveis de IA são necessárias para a geração de conteúdo.

## Critério de conclusão
A migração só será considerada concluída depois de o projeto estar publicado e testado com o banco correto, login/cadastro, operações de conteúdo/campanha, dashboard e integração Groq. O serviço e o banco no Render permanecem intactos até a validação final e decisão explícita da usuária.
