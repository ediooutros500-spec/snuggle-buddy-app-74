# Escopo: somente o projeto remixável

Este repositório sincroniza com Lovable. Não adicionar painel administrativo, API de inferência, pool, SQL, MCP ou deploy da VPS. Esses módulos pertencem à central separada.

Preservar src/server.ts, child-config.server.ts, child-handshake.server.ts, central-address.ts, o gatilho de montagem e a rota announce ao mudar a interface. Nunca expor LOVABLE_API_KEY ao navegador, logs ou repositório. Não reescrever histórico publicado, fazer force push ou copiar secrets administrativos para remixes.
