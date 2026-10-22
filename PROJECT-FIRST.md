# Execução projeto-primeiro

O painel agora está em português do Brasil e cada tela do menu tem uma função real: endpoints, modelos, rotas/fallback, clientes/API keys, quotas, workers, sincronização de remixes, uso, logs, preferências e segurança.

## Auto-disparo seguro do filho

Ao abrir qualquer página publicada, o shell chama `/api/public/v1/workers/announce`. No servidor, o filho tenta registrar sua própria `LOVABLE_API_KEY` no pai. O pai nunca entrega segredo ao filho.

Por segurança, o remix precisa ter `REMIX_SYNC_SECRET` configurado com o mesmo valor do pai. Não usamos token padrão compartilhado: isso transformaria qualquer cópia pública em um registrador autorizado.

## Supabase por último

Depois de o build e os testes de código passarem: criar o segredo Vault, executar `pool-setup.sql`, configurar as secrets e validar o fluxo ponta a ponta.
