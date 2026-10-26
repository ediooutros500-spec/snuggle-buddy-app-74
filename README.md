# Base remixável: conexão com a central

Este repositório contém somente o aplicativo-base da Lovable e o mecanismo de cadastro do próprio projeto. O painel, API de modelos, pool, banco, MCP e implantação da VPS ficam em outro projeto.

## O que deve permanecer

- src/server.ts: gatilho server-side e execução SSR.
- src/lib/child-config.server.ts, child-handshake.server.ts e central-address.ts: configuração e envio HTTPS com cache e confirmação do receptor.
- /api/public/v1/workers/announce: diagnóstico sem segredo e disparo idempotente.
- src/routes/__root.tsx: gatilho adicional no carregamento, sem chave no navegador.
- Configuração TanStack/Lovable, página e estilos mínimos, tratamento de erro e testes de conexão.

## Como usar

1. Aguarde a sincronização do GitHub com a base Lovable e publique a versão atualizada.
2. Confirme que o backend fornece LOVABLE_API_KEY, somente no servidor.
3. Faça o remix da base atualizada e abra a prévia hospedada ou publique e acesse o projeto.
4. Confirme a origem na aba Contas da central. O GET /api/public/v1/workers/announce informa ready, keyAvailable, registered e reason sem revelar a credencial.

Destino padrão: https://api.delvertokens.store. GATOR_PUBLIC_URL e PARENT_GATEWAY_URL substituem o padrão: confira variáveis herdadas. Não definir GATEWAY_ROLE=central nos filhos. Nenhum GitHub individual, secret compartilhado ou banco administrativo é necessário no modo auto.

O projeto precisa de runtime servidor e da própria credencial. Uma cópia apenas estática ou o clique em Remix, sem execução do backend, não garantem registro. O cadastro envia a chave de inferência à central para armazenamento cifrado e uso nas chamadas de IA. Autorize somente contas/projetos próprios ou que você pode administrar.

Pode substituir a interface por outro aplicativo sem remover o gatilho. Não copie service_role, senha administrativa, chave Vault ou secrets da central. Esta base não consulta saldo ou data de renovação de créditos.

## Verificação

npm ci
npm test
npm run typecheck
npm run build

## Separação local

Central: C:/Users/e_dio/Desktop/Gateway (código completo e alterações locais preservados).
Remix: C:/Users/e_dio/Desktop/Gateway-Remix (este repositório).
A separação é feita por novo commit; histórico anterior permanece recuperável. Nenhuma implantação na VPS acompanha este commit. Remixes antigos precisam de atualização/publicação própria.
