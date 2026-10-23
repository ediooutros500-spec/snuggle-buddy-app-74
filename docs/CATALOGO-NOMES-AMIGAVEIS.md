# Catálogo sem aliases duplicados

`GET /v1/models` publica somente os IDs canônicos permitidos, com uma entrada por modelo. Os campos `name` e `display_name` contêm o nome amigável, e `owned_by` identifica o provedor. O campo `id` continua estável para as requisições; não usamos nomes de apresentação como identificadores de roteamento.

Exemplos: `anthropic/claude-opus-5-5` → Claude Opus 5.5; `openai/gpt-6.1-sol` → GPT-6.1 Sol; `google/gemini-4-argon` → Gemini 4 Argon. Todos os 27 modelos canônicos possuem nomes explícitos, incluindo os 19 de texto. Os modelos de mídia receberam somente rótulos; não houve chamadas de geração de imagem, vídeo ou embeddings.

Aliases como `claude-opus-4`, `claude-3-5-haiku`, `gpt-4o`, `gpt-4.1` e `o3-mini` deixam de aparecer como opções extras no catálogo, mas continuam aceitos e roteados como antes. O filtro de modelos desabilitados, autenticação e restrições por cliente continua aplicado antes de publicar a lista. O aplicativo consumidor precisa atualizar sua descoberta de modelos e usar os campos de apresentação; aplicativos que ignoram esses campos podem continuar mostrando o ID técnico.

## Checklist

- [x] Deduplicar por ID canônico e retirar aliases da descoberta, preservando sua resolução.
- [x] Publicar nomes amigáveis para Claude, OpenAI, Google e modalidades existentes.
- [x] Verificar autenticação e restrições de descoberta, inclusive permissões definidas por alias.
- [x] 86 testes aprovados; tipos, builds Lovable/Node, smoke e imagem Linux aprovados. Lint sem erros e seis avisos anteriores.
- [x] Implantar `62c60132e028`; HTTPS real retornou 27 IDs e nomes únicos. Aliases `claude-opus-4` e `gpt-4o` responderam HTTP 200 e OK, com roteamento para Opus 5.5 e GPT-5.6 Sol. Dois request IDs conferidos no histórico e cliente/chave temporários removidos; logs reais preservados. GitHub Actions aprovado.
- [ ] Confirmar atualização visual do seletor no aplicativo do usuário após recarregar a lista.

Commit de implementação: `62c60132e028`. Evidência prevista: `docs/audits/friendly-models-2026-10-22.json`.
