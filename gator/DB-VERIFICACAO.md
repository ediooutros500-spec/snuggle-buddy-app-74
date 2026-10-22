# Verificação do Supabase central

Execute dentro de `gator/`:

```powershell
npm run db:check
npm run db:selftest
```

O primeiro comando consulta o contrato REST, tabelas, catálogo de RPCs, presença do segredo no Vault e negação de acesso anônimo ao segredo. Não escreve em clientes ou workers existentes. As saídas são nomes de verificações e booleanos, sem credenciais ou respostas brutas.

O segundo comando também cria uma chave sintética **desabilitada**, uma origem única e um nonce de teste. Verifica o hash, a presença da cifra, o upsert idempotente e a rejeição de nonce duplicado. Ao terminar, remove somente os registros com os identificadores aleatórios desse teste. A chave nunca é ativada nem enviada ao Lovable. Falha na limpeza reprova a execução.

## Evidência em 22/10/2026

As 27 verificações passaram no projeto configurado no ambiente. O registro via RPC foi executado duas vezes e retornou a mesma referência; houve apenas um worker para a origem de teste. O Vault respondeu ao servidor e recusou o acesso anônimo. A limpeza do teste foi aprovada. Isso não substitui um teste de chamada real com uma chave Lovable válida.

## Pendências que continuam abertas

- O conector Supabase desta sessão não autoriza SQL no projeto central configurado; a conexão REST pelas credenciais locais funciona.
- Executar `db/verify-security.sql` pelo SQL Editor do projeto ou por uma conexão SQL autorizada. Respostas vazias com a chave anônima não comprovam, sozinhas, que todas as tabelas têm RLS.
- Verificar os corpos e as permissões das RPCs de quotas e telemetria no banco real. O SQL local de `consume_client_quota` consulta limites, mas não reserva consumo; não deve ser tratado como proteção concorrente completa.
- Comprovar seleção e failover de chaves reais, backup e restauração.
- Nenhuma migration ou alteração de permissões foi aplicada por estes comandos.

Referência: [proteção da Data API do Supabase](https://supabase.com/docs/guides/api/securing-your-api).
