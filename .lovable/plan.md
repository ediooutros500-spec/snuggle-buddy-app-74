# Fazer o remix aparecer no painel do pai

## Por que não apareceu
O remix só se registra se tudo abaixo existir. Hoje faltam peças nos dois lados:

1. **Senha de sincronização ausente no remix.** O remix só avisa o pai se tiver o segredo `REMIX_SYNC_SECRET`. A Lovable não copia segredos no remix, então ele "acorda" sem ele e desiste sem avisar.
2. **Chave de IA do remix.** O remix precisa da sua própria `LOVABLE_API_KEY` (gerada no workspace dele). Sem ela, não tem o que enviar.
3. **O pai não tem onde guardar.** O pai procura um banco externo (`POOL_SUPABASE_URL` + `POOL_SUPABASE_SERVICE_ROLE_KEY`). Sem esse segredo, o painel mostra lista vazia e o registro falha.
4. **Tabela e funções não criadas** nesse banco (`gateway_key_pool`, `register_worker_key`, `get_next_api_key`, `mark_key_status`).
5. **O aviso só sai quando alguém abre o remix publicado.** Se o remix não foi publicado e aberto, nada é disparado.
6. Remix que falhou na cópia do banco (o erro de antes) pode estar quebrado e precisa ser refeito.

## Plano de ação

### Lado do pai (este projeto)
1. Você me passa a URL e a chave de serviço do seu Supabase próprio. Eu salvo como segredos `POOL_SUPABASE_URL` e `POOL_SUPABASE_SERVICE_ROLE_KEY`.
2. Rodar o `pool-setup.sql` no seu Supabase (SQL Editor) para criar a tabela e as funções. Eu reviso o arquivo antes.
3. Definir um `REMIX_SYNC_SECRET` forte no pai.
4. Mostrar no painel um aviso claro: "Banco do pool não configurado" em vez de lista vazia silenciosa.
5. Adicionar ao painel um campo "Registrar remix manualmente" usando o botão de disparo já existente.

### Lado do remix (cada filho)
6. No remix: adicionar o segredo `REMIX_SYNC_SECRET` com o mesmo valor do pai.
7. Confirmar que o remix tem `LOVABLE_API_KEY` (habilitar IA no remix, se preciso).
8. Publicar o remix e abrir a URL publicada uma vez.
9. Opcional: abrir `/api/public/v1/workers/announce` pelo painel do pai (disparo manual) para forçar.

### Diagnóstico melhor
10. A rota `announce` do remix passa a responder exatamente o que falta (sem segredo, sem chave, pai recusou, pai fora do ar), em vez de "ok".
11. Registrar no log do pai cada tentativa recusada com o motivo (sem mostrar chave).

### Teste ponta a ponta
12. Remix publicado → aberto → aparece no painel do pai com o final da chave (`key_hint`) e status "ativo".
13. Uma chamada de chat no pai usa a chave do remix (confirmado pelo log).

## O que preciso de você
- URL e chave de serviço (service_role) do seu Supabase.
- URL publicada do remix que você criou.

## Detalhes técnicos
- `src/lib/key-pool.server.ts`: `maybeAutoRegisterChild` retorna motivo em vez de `void`; `getPoolAdmin` sem URL padrão embutida.
- `src/routes/api/public/v1/workers/announce.ts`: devolve o motivo real.
- `src/routes/api/public/v1/workers/register.ts`: GET informa `configured:false` com motivo; POST loga motivo de recusa.
- `src/routes/index.tsx`: aviso de pool não configurado + campo de disparo manual.
- Nenhuma chave vai para o navegador.
