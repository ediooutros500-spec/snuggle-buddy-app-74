# Remix automático: remixar, publicar e aparecer no pai (sem preencher nada)

## Objetivo
Você clica em **Remix**, depois em **Publicar**, e o remix aparece sozinho no painel do pai com a chave de IA dele pronta para uso. Nenhum segredo, formulário ou URL digitada no remix.

## Por que hoje não aparece (diagnóstico confirmado no código)
1. O remix só envia a chave se tiver o segredo `REMIX_SYNC_SECRET`. A Lovable **não copia segredos** no remix, então ele sempre desiste em silêncio.
2. O pai guarda os remixes num banco externo que precisa de `POOL_SUPABASE_SERVICE_ROLE_KEY`. Esse segredo não existe, então o pai não tem onde salvar e o painel fica vazio.
3. A tabela do pool e as funções de banco não estão criadas.
4. O envio só acontece quando alguém abre o site publicado do remix, e a cada 10 minutos no máximo. Se falha, ninguém fica sabendo.
5. O remix anterior falhou na cópia do banco (incidente da Lovable). Ele pode ter ficado sem a chave de IA.

## A ideia central: trocar "senha compartilhada" por "prova pela própria chave"
Hoje o pai confia no remix porque ele conhece uma senha. Como o remix nunca recebe senhas, trocamos a regra:

- O remix envia **a chave dele + o endereço dele**.
- O pai **testa a chave na própria Lovable**. Se a Lovable aceita, a chave é real. Uma chave falsa é recusada.
- Ninguém ganha nada mandando chave para o pai: o pior caso é alguém "doar" créditos. Por isso não precisa de senha.
- O pai só aceita endereços `https://*.lovable.app` (e domínios próprios que você liberar no painel), com limite de tentativas.

Assim o remix não precisa de nenhum dado: o endereço do pai já vem escrito no código, e a chave de IA a Lovable cria sozinha no remix.

## Fluxo completo

```text
Você: Remix -> Publicar -> abre o site do remix (ou só publica)
        |
Remix (servidor) acorda na primeira visita
  - vê que o endereço dele NÃO é o do pai  -> "eu sou filho"
  - lê a própria chave de IA (criada pela Lovable)
  - envia ao pai: endereço + chave, por conexão segura
        |
Pai
  - confere endereço (*.lovable.app), limite de tentativas
  - testa a chave na Lovable (1 chamada mínima)
  - guarda a chave CIFRADA no próprio banco do pai
  - responde só "registrado" (nunca devolve a chave)
        |
Painel do pai mostra: Remix #N, endereço, final da chave, status
        |
Chats no pai passam a revezar entre as chaves dos remixes;
se uma esgota (402/429), pula para a próxima por 15 min.
```

## Garantir o disparo sem ninguém abrir o remix
Publicar sozinho não executa código. Para não depender de visita:
1. **Visita automática pelo pai:** o painel do pai tem "Descobrir remixes". Você não digita nada: o pai lista os projetos da sua conta que são remix deste (via conector da Lovable/GitHub já conectado) e chama o endereço de cada um. Se a listagem automática não for possível, fica um campo de colar endereço como plano B.
2. **Disparo na primeira página:** quando qualquer pessoa abre o remix, a página chama o servidor do próprio remix, que avisa o pai. A chave nunca vai para o navegador.
3. **Nova tentativa automática:** se o pai estiver fora, o remix tenta de novo na próxima visita (sem a trava de 10 min quando falhou).

## Etapas de implementação

### Etapa 1 — Banco do pool no próprio pai (sem segredo para digitar)
- Usar o banco que o pai já tem (Lovable Cloud) em vez do banco externo. Isso elimina `POOL_SUPABASE_SERVICE_ROLE_KEY`.
- Criar a tabela `gateway_key_pool`: id, endereço do remix (único), chave cifrada, final da chave, status (ativo/esgotado/inválido), contadores, último erro, datas.
- Funções atômicas: registrar (cria ou atualiza pelo endereço), pegar próxima chave (revezamento, pula esgotadas em cooldown), marcar status.
- Acesso só pelo servidor; ninguém lê pelo navegador.
- Observação: contas/clientes no seu Supabase próprio continuam no plano maior; o pool fica no pai para funcionar sem configuração.

### Etapa 2 — Cifra da chave
- O pai gera sozinho uma chave mestra secreta (eu crio, você não vê nem digita).
- As chaves dos remixes são cifradas antes de ir para o banco e decifradas só na hora do uso.

### Etapa 3 — Novo registro sem senha no pai
- `register` deixa de exigir `x-remix-sync-token`.
- Validações: endereço HTTPS permitido, corpo pequeno, limite por endereço e por IP, chave testada na Lovable.
- Resultado da validação: aceita = ativo; 402/429 = guardada como esgotada; 401/403 = recusada; erro de rede = tenta depois.
- Registrar de novo o mesmo remix só atualiza (não duplica).

### Etapa 4 — Remix detecta que é filho e envia sozinho
- Endereço do pai fixo no código (já existe).
- Sem exigir `REMIX_SYNC_SECRET`.
- Disparo no servidor a cada requisição (com trava de 10 min só após sucesso) + disparo na abertura da página.
- No pai, o código nunca dispara (detecta que é o próprio pai).

### Etapa 5 — Painel do pai
- Lista de remixes: endereço, final da chave, status, uso de hoje, último erro.
- Botões: "Descobrir remixes", "Testar de novo", "Pausar", "Remover".
- Aviso claro quando não há nenhum remix e por quê.

### Etapa 6 — Diagnóstico
- Endereço `/api/public/v1/workers/announce` do remix responde o motivo real: "registrado", "sem chave de IA neste remix", "pai recusou: motivo", "pai fora do ar".
- O pai registra cada tentativa recusada com o motivo (sem expor chave).

### Etapa 7 — Teste ponta a ponta
1. Publicar o pai com as mudanças.
2. Fazer um remix novo (o antigo pode estar quebrado pelo incidente).
3. Publicar o remix, abrir uma vez.
4. Ver o remix no painel do pai com status "ativo".
5. Fazer um chat no pai e confirmar no log que usou a chave do remix.

## Limites que não dá para contornar
- A Lovable não executa nada só por publicar: é preciso uma visita (sua, do pai via "Descobrir" ou de qualquer pessoa).
- O remix precisa ter a IA habilitada para a Lovable criar a chave dele. Remixes com nuvem ativa normalmente já têm.
- Remixes no mesmo workspace dividem os mesmos créditos; o ganho real vem de remixes em workspaces diferentes.
- Usar créditos de vários workspaces juntos pode esbarrar nos termos de uso da Lovable; vale conferir antes de uso comercial.

## Detalhes técnicos
- Migration: `gateway_key_pool` + RLS ligada sem políticas públicas + funções `register_worker_key`, `get_next_api_key` (`FOR UPDATE SKIP LOCKED`), `mark_key_status`; grants só para service role.
- `src/lib/key-pool.server.ts`: `getPoolAdmin` passa a usar `supabaseAdmin` (import dinâmico de `client.server`); remove `POOL_SUPABASE_*` e dependência de `REMIX_SYNC_SECRET`; `maybeAutoRegisterChild` retorna motivo; trava de 10 min só após sucesso.
- Novo `src/lib/key-crypto.server.ts`: AES-256-GCM via Web Crypto com segredo gerado `POOL_ENCRYPTION_KEY`.
- `src/routes/api/public/v1/workers/register.ts`: POST sem token, allowlist de origem, rate limit, validação upstream; GET/PATCH continuam exigindo o token do painel.
- `src/routes/api/public/v1/workers/announce.ts`: aceita chamada da própria página e do pai; devolve motivo.
- `src/routes/index.tsx`: disparo na montagem (só chama endpoint local) + seção de workers com descoberta.
- `src/server.ts`: mantém gatilho SSR.
- Gator local (`gator/`) recebe a mesma regra depois, em etapa separada.
