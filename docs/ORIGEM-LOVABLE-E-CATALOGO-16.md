# Projeto de origem Lovable e catálogo solicitado

## Organização definida

O projeto Lovable é a origem remixável e mostra um painel de conexão. A central continua na VPS, com administração em `https://secretsof.delvertokens.store/admin/overview` e API em `https://api.delvertokens.store/v1`.

O mesmo código identifica o papel no servidor: `GATEWAY_ROLE=central` conserva o painel administrativo na VPS; sem essa configuração, a raiz apresenta o painel do projeto/remix. Ele mostra a origem, destino, presença da credencial no servidor e resultado real do cadastro. Nunca retorna a chave ao navegador nem pede a chave administrativa da central.

Na primeira abertura do projeto publicado, o gatilho envia diretamente do backend a `LOVABLE_API_KEY`, a origem do projeto e os rótulos opcionais de conta/workspace para `https://api.delvertokens.store/api/public/v1/workers/register`. O receptor existente valida a chave no provedor e salva pela RPC de cifra. O modo automático não exige segredo compartilhado nem GitHub em cada remix.

Remixar não executa código por si só. O novo projeto precisa ter backend, sua própria credencial provisionada pelo Lovable, código atualizado, publicação e primeira execução. A origem não pode criar uma credencial Lovable por conta própria. A [documentação oficial de IA](https://docs.lovable.dev/features/ai) descreve o backend e o gerenciamento da chave pelo Lovable.

O cadastro confirma a inclusão da credencial na central; não confirma saldo, todos os modelos ou compatibilidade de ferramentas. O remetente mantém cache de confirmação por dez minutos. Reinício perde esse cache, mas a deduplicação do receptor continua sendo a proteção persistente.

## Catálogo de destino: os 16 modelos solicitados

Esta tabela é o contrato desejado, não uma declaração de que os 16 já funcionam na versão publicada. Os IDs exatos, endpoints upstream e formatos devem ser testados com uma credencial real antes da ativação. A documentação confirma as famílias de modelos, mas isso não prova o acesso de uma conta ou a integração deste gateway.

Todos os caminhos abaixo são relativos à base pública **https://api.delvertokens.store**. Os endereços reais do provedor continuam apenas no backend. Trocar o hostname do provedor pelo nosso não cria automaticamente um adaptador.

| Modelo solicitado | Entrada pública planejada | Encaminhamento a implementar/validar |
|---|---|---|
| `anthropic/claude-opus-5-5` | `/v1/messages` | Anthropic Messages nativo, SSE e tools |
| `anthropic/claude-opus-5` | `/v1/messages` | Anthropic Messages nativo, SSE e tools |
| `anthropic/claude-sonnet-5` | `/v1/messages` | Anthropic Messages nativo, SSE e tools |
| `anthropic/claude-haiku-4-5` | `/v1/messages` | Anthropic Messages nativo, SSE e tools |
| `anthropic/claude-fable-5-1` | `/v1/messages` | Anthropic Messages nativo, blocos de raciocínio e tools |
| `openai/gpt-6-astra` | `/v1/chat/completions`; `/v1/responses` futuro | Responses upstream; converter somente quando o cliente usar outro formato |
| `openai/gpt-6.1-sol` | `/v1/chat/completions`; `/v1/responses` futuro | Responses upstream, ferramentas e streaming |
| `google/gemini-4-argon` | `/v1/chat/completions` | Chat Completions upstream, ferramentas e entrada multimodal validada |
| `openai/gpt-image-2.5-sunburst` | `/v1/images/generations` | Imagem, resposta URL/Base64 conforme contrato real |
| `openai/gpt-image-2.5-flare` | `/v1/images/generations` | Imagem, resposta URL/Base64 conforme contrato real |
| `google/veo-3.1` | `/v1/videos/generations` | Job assíncrono com consulta autenticada de estado |
| `google/veo-3.1-fast` | `/v1/videos/generations` | Job assíncrono com consulta autenticada de estado |
| `google/veo-3.1-lite` | `/v1/videos/generations` | Job assíncrono com consulta autenticada de estado |
| `google/gemini-omni-1.1-flash` | `/v1/videos/generations` | Vídeo, não classificar como chat genérico de áudio/texto |
| `openai/text-embedding-3-large` | `/v1/embeddings` | Embeddings e dimensão retornada pelo provedor |
| `openai/text-embedding-3-small` | `/v1/embeddings` | Embeddings e dimensão retornada pelo provedor |

A [documentação Lovable de chat](https://docs.lovable.dev/features/ai-chat) lista Claude para projetos TanStack Start recentes, além de GPT-6 Astra, GPT-6.1 Sol e Gemini 4 Argon. Este projeto é TanStack Start. A [documentação de vídeo](https://docs.lovable.dev/features/ai-video) classifica Gemini Omni 1.1 Flash junto dos modelos de vídeo e descreve geração assíncrona. [Imagens](https://docs.lovable.dev/features/ai-images) e [embeddings](https://docs.lovable.dev/features/ai-search) têm seus catálogos próprios.

O catálogo atual da central continua com 19 IDs configurados, identificados como disponibilidade não verificada. Não foi substituído pela tabela desejada nesta etapa: faltam adaptadores e teste real. A rota `/v1/responses` pública e a consulta de jobs de vídeo ainda precisam ser implementadas, inclusive no proxy; não são rotas prontas. A API pública `/v1/models` e o painel devem consumir a mesma configuração e respeitar bloqueios/permissões quando o novo catálogo for ativado.

## Aliases desejados

- `claude-3-5-sonnet` e `claude-sonnet-4` → `anthropic/claude-sonnet-5`.
- `claude-3-5-haiku` → `anthropic/claude-haiku-4-5`.
- `claude-opus-4` → `anthropic/claude-opus-5-5`.

Esses são alvos da próxima implementação, ainda não ativados. A versão atual usa compatibilidade com conversão para Google/OpenAI. Não apresentar essa conversão como Claude nativo. Um fallback de Claude para GPT deve ser uma opção explícita e rastreável no painel, com modelo solicitado e resolvido; não uma troca silenciosa.

"Sem conversão" só se aplica ao encaminhamento Messages → Messages de um modelo Anthropic. Clientes OpenAI Chat Completions que pedirem Claude precisam de adaptador; clientes Messages que pedirem GPT também. Preservar tools, tool results, raciocínio, erros, cancelamento e formato SSE exige testes específicos.

## Checklist desta etapa

- [x] Separar a raiz da central administrativa e do projeto remixável pelo papel informado pelo servidor.
- [x] Painel de origem com diagnóstico real e tentativa automática/manual de cadastro.
- [x] Diagnóstico público não serializa credencial, segredo compartilhado ou rótulos privados.
- [x] Manter envio servidor → central no nosso subdomínio HTTPS e modo automático existente.
- [x] 62 testes, tipos e build Lovable aprovados; lint sem erros e seis avisos anteriores.
- [x] Registrar os 16 modelos desejados, contratos, aliases e diferenças da versão publicada.
- [x] Sincronizar os 40 commits com GitHub: em 22/10/2026, após nova autenticação `gh`, `gh auth setup-git` corrigiu o helper e `git fetch origin main` confirmou 0 atrás/40 à frente, com fast-forward seguro. `git push origin main` concluiu (exit 0), de `f0d5b508aaa76089e3e97d1c22d0452ffae328cc` para `c186100ef632bb6b0a5de70417a66474a0055cd1`. `git ls-remote origin refs/heads/main` confirmou o SHA; GitHub Actions workflow `Validate gateway` concluiu `success` nesse SHA (criado em 2026-10-23T00:14:47Z). Alterações locais não commitadas preservadas; nenhum force push ou reset.
- [x] Evidência pública parcial da origem Lovable em 22/10/2026: `GET https://snuggle-buddy-app-74.lovable.app/` respondeu HTTP 200 com `Lovable Gateway`; `GET /api/public/v1/workers/announce` respondeu HTTP 200 com `role=child`, `keyAvailable=true`, `centralOrigin=https://api.delvertokens.store`, `reason=ready` e `registered=false`. O handler GET foi introduzido no commit `c186100`, portanto há evidência de código novo na origem publicada, mas não identificação exata do SHA publicado.
- [ ] Confirmar estado de sincronização no editor Lovable e publicação da versão completa: não houve acesso autenticado ao projeto/editor nesta sessão. Push GitHub e resposta da origem não comprovam o SHA sincronizado nem a ação Publish. GitHub API `deployments` retornou lista vazia, insuficiente para aferir deploy hospedado pelo Lovable.
- [ ] Corrigir/confirmar cadastro de origem e remix real: `POST` no backend publicado `/api/public/v1/workers/announce`, com header de auto-dispatch, respondeu HTTP 200, `attempted=true`, `registered=false`, mensagem `Falha ao contatar o Gator.`. O mesmo host central respondeu HTTP 400 a POST vazio de diagnóstico em `/api/public/v1/workers/register` a partir do PC, indicando rota alcançável da rede local, mas não conectividade originada na execução Lovable. Não houve acesso ao segredo; investigar rede/DNS/TLS/egress no ambiente Lovable sem logar `LOVABLE_API_KEY`. Não marcar gatilho como funcional antes de remix real aparecer na central.
- [x] Validar cópia isolada do commit `c186100` em worktree destacado: `npm test` 62/62; `npm run typecheck`, `npm run build` (Lovable/Vite) e `npm run build:parent` (Node) com exit 0. Na pasta original não limpa, `npm test` resultou 59/62, indicando interferência das alterações não commitadas; preservadas sem `git add .`.
- [ ] Validar um remix real com chave própria, confirmação na central e teste de geração.
- [ ] Implementar e testar Anthropic nativo e os modelos novos; depois ativar catálogo/aliases no painel e `/v1/models`.
- [ ] Implementar `/v1/responses` público e ciclo completo de jobs de vídeo, com propriedade do job, consulta e expiração.
- [ ] Validar tools, SSE, cancelamento, erros, uso e dimensões de embeddings com provedor real.

A central na VPS não precisa ser reiniciada para preparar esta origem. Alterações de UI/catálogo no código local não atualizam projetos já publicados nem remixes antigos automaticamente.
