# Execução projeto-primeiro

O desenvolvimento do código vem antes da configuração do Supabase. Assim conseguimos validar build, rotas, autenticação, failover e contrato do gateway sem misturar erro de infraestrutura com erro de aplicação.

## Já feito no código

- Pool pai/filhos v2 commitado.
- Registro de filho com validação upstream e rate limit.
- Painel administrativo autenticado.
- Quotas diárias por filho e fallback auditado.
- Health check público em `/api/public/health`.

## Ordem atual

1. Rodar build e lint do projeto.
2. Testar o health check publicado.
3. Completar modelos, compatibilidade Claude Code e endpoints de mídia.
4. Revisar exposição de chaves e respostas de erro.
5. Só então criar o segredo do Vault, executar o SQL e configurar os secrets do pai.
6. Publicar um remix e executar o teste ponta a ponta.

O health check não expõe valores de secrets. Ele retorna apenas se cada capacidade está configurada.
