# Plano de migração para Vercel

## Estado
- [x] Auditoria inicial do repositório e da arquitetura atual
- [x] Criar branch isolada `chore/vercel-migration`
- [ ] Validar configuração do frontend Angular como projeto estático
- [ ] Validar FastAPI no runtime Python da Vercel
- [ ] Confirmar URL e política de conexão do PostgreSQL atual
- [ ] Configurar variáveis secretas sem gravá-las no Git
- [ ] Executar migrations de forma controlada, fora do ciclo de inicialização das Functions
- [ ] Testar autenticação, CRUD, dashboard e geração via Groq
- [ ] Validar rotas profundas do Angular e chamadas da API
- [ ] Publicar e só então atualizar os links públicos

## Arquitetura identificada
O deploy atual usa um único Dockerfile: compila o Angular e copia o build para o backend; o FastAPI atende tanto `/api/*` quanto os arquivos da SPA. O frontend usa `API_URL = '/api'`, portanto depende de frontend e API na mesma origem.

A migração prevista usa dois projetos Vercel ligados ao mesmo repositório:
1. **Frontend**: diretório raiz `frontend`, build `npm run build`, saída Angular `dist/frontend/browser`.
2. **Backend**: diretório raiz `backend`, dependências em `requirements.txt`; o FastAPI exporta `app` em `app/main.py`, caminho reconhecido pelo runtime Python da Vercel.

A separação exige configurar a URL pública da API no build Angular e liberar a origem do frontend em `CORS_ORIGINS`. A API não deve tentar servir os arquivos estáticos do Angular no novo arranjo.

## Banco de dados e segurança
- Manter o PostgreSQL atual durante a primeira etapa; não criar nem apagar banco sem verificar provedor, plano, expiração, backup e URL de conexão.
- Não executar `alembic upgrade head` automaticamente a cada inicialização de Function. As migrations devem ser executadas uma única vez, após backup e validação do alvo.
- Configurar `DATABASE_URL`, `SECRET_KEY`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` e `CORS_ORIGINS` no painel da Vercel; nunca versionar valores secretos.
- Verificar suporte a conexões externas e, se necessário, usar a URL/pooler recomendado pelo provedor do PostgreSQL.

## Critério de conclusão
A migração só será considerada concluída depois de os dois projetos estarem publicados e testados com o banco correto, login/cadastro, operações de conteúdo/campanha, dashboard e integração Groq. O serviço do Render permanece intacto até a validação final.
