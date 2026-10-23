# Projeto de origem Lovable e catálogo solicitado

## Organização definida

O projeto Lovable é a origem remixável e mostra um painel de conexão. A central continua na VPS, com administração em `https://secretsof.delvertokens.store/admin/overview` e API em `https://api.delvertokens.store/v1`.

O mesmo código identifica o papel no servidor: `GATEWAY_ROLE=central` conserva o painel administrativo na VPS; sem essa configuração, a raiz apresenta o painel do projeto/remix. Ele mostra a origem, destino, presença da credencial no servidor e resultado real do cadastro. Nunca retorna a chave ao navegador nem pede a chave administrativa da central.

Na primeira execução da prévia hospedada ou do projeto publicado, o gatilho envia diretamente do backend a `LOVABLE_API_KEY`, a origem do projeto e os rótulos opcionais de conta/workspace para `https://api.delvertokens.store/api/public/v1/workers/register`. O receptor existente valida a chave no provedor e salva pela RPC de cifra. O modo automático não exige segredo compartilhado nem GitHub em cada remix.

Remixar não executa código por si só. O novo projeto precisa ter backend, sua própria credencial provisionada pelo Lovable, código atualizado e primeira execução. Publicar não é obrigatório quando a prévia hospedada já executa esse backend em domínio Lovable permitido; localhost continua excluído. A origem não pode criar uma credencial Lovable por conta própria. A [documentação oficial de IA](https://docs.lovable.dev/features/ai) descreve o backend e o gerenciamento da chave pelo Lovable.

O cadastro confirma a inclusão da credencial na central; não confirma saldo, todos os modelos ou compatibilidade de ferramentas. O remetente mantém cache de confirmação por dez minutos. Reinício perde esse cache, mas a deduplicação do receptor continua sendo a proteção persistente.

## Catálogo de destino: os 16 modelos solicitados

Esta tabela registra o contrato desejado. Os oito modelos de texto foram configurados e testados em 22/10/2026; vídeo, imagem e embeddings não foram chamados nesta validação. O estado atual dos textos está em [CONFIGURACAO-MODELOS-TEXTO.md](CONFIGURACAO-MODELOS-TEXTO.md). A ativação de modelos de texto não comprova o ciclo de jobs de vídeo nem os demais contratos de mídia.

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

Após a entrega b83583a69548, o catálogo da central contém 27 IDs canônicos: 19 textos (11 anteriores e oito novos) e oito de outras modalidades. Painel e `/v1/models` compartilham configuração e respeitam bloqueios/permissões; os oito novos IDs foram conferidos nos dois. O indicador genérico de disponibilidade continua conservador, pois não há monitoramento contínuo por modelo/credencial. A rota `/v1/responses` pública e a consulta de jobs de vídeo ainda precisam ser implementadas, inclusive no proxy; Responses interno para modelos OpenAI não equivale à existência da rota pública.

## Aliases desejados

- `claude-3-5-sonnet` e `claude-sonnet-4` → `anthropic/claude-sonnet-5`.
- `claude-3-5-haiku` → `anthropic/claude-haiku-4-5`.
- `claude-opus-4` → `anthropic/claude-opus-5-5`.

Esses aliases foram ativados na entrega b83583a69548 e testados por HTTPS. Eles agora selecionam modelos Anthropic reais. O encaminhamento Messages → Messages é nativo; Chat Completions → Anthropic exige conversão. Nomes Claude desconhecidos são recusados. Não há fallback silencioso de Claude para GPT/Google.

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
- [x] Implementar Anthropic nativo e os oito modelos novos; ativar e testar catálogo/aliases no painel e `/v1/models`. Os 19 textos responderam em testes reais; JSON, SSE e tools conferidos em chamadas específicas.
- [ ] Implementar `/v1/responses` público e ciclo completo de jobs de vídeo, com propriedade do job, consulta e expiração.
- [ ] Validar tools, SSE, cancelamento, erros, uso e dimensões de embeddings com provedor real.

A central na VPS não precisa ser reiniciada para preparar esta origem. Alterações de UI/catálogo no código local não atualizam projetos já publicados nem remixes antigos automaticamente.

## Correção após teste do remix real — 22/10/2026

Remix informado: `https://oi-bright-idea-lab.lovable.app`. A consulta pública de diagnóstico confirmou código atualizado, papel child, credencial presente, origem permitida e destino `https://api.delvertokens.store`. O POST de anúncio retornou `attempted: true`, `registered: false`, "Falha ao contatar o Gator". A central respondeu aos testes HTTP públicos; logs não mostraram esse envio chegando à VPS. Nenhuma credencial do remix foi extraída.

Causa reproduzida no runtime workerd/Miniflare: `fetch` rejeita `redirect: "error"` com TypeError antes de executar a conexão. O mesmo teste com `redirect: "manual"` chegou ao receptor. O módulo real de handshake foi executado nesse runtime com configuração/chave sintéticas e receptor de teste: antes, zero pedidos e cadastro falso; corrigido, um pedido e cadastro confirmado. Isso comprova a regressão de runtime, não o cadastro real do remix ainda publicado com o código antigo.

Correção: usar `manual`, recusar explicitamente qualquer HTTP 3xx e nunca repetir a credencial no endereço do redirecionamento; orçamento de envio de 25 segundos e espera da interface de 35 segundos para abranger validação e banco. Erros conhecidos do receptor ganham mensagens específicas, sem refletir texto arbitrário ou segredos. 64 testes da aplicação, tipos, builds Lovable/Node passaram; lint sem erros e seis avisos anteriores.

Próxima validação: sincronizar a correção no projeto de origem e no remix existente, republicar o remix e abrir uma vez. Não é necessário criar outro remix. Só marcar concluído após `registered: true` e registro correspondente no pool central; presença de chave no diagnóstico não comprova cadastro nem saldo.

## Cadastro e inferência real confirmados — 22/10/2026

Após a correção, a origem `snuggle-buddy-app-74.lovable.app` retornou `registered:true`. A central apresentou duas conexões ativas: uma da origem e outra de `id-preview--7da2131e-22b0-45b7-8ef7-255e69ae1d54.lovable.app`. Isso confirma que uma prévia hospedada pode cadastrar antes da publicação. Não comprova, por si só, que são duas chaves distintas nem identifica qual projeto do editor pertence ao usuário sem conferir seu endereço. O usuário informou ter apagado oi-bright-idea-lab e criado outro ainda não publicado; o endereço antigo retornou 404, condizente com a exclusão.

Teste pela API pública, com cliente temporário limitado a uma tentativa e ao modelo padrão: `/v1/models` HTTP 200; `POST /v1/chat/completions`, `google/gemini-3.6-flash`, prompt "Responda somente OK.", orçamento 128 tokens, HTTP 200, resposta "OK", duração 3264 ms. Uso informado: 6 tokens de entrada, 115 de saída, 121 no total; registro de histórico com request ID `2aadce63-1782-4251-9f52-4533977814b9` conferido. Cliente/chave temporários removidos; histórico real preservado. A tentativa inicial com orçamento 8 retornou HTTP 200 e consumo informado, mas texto vazio; não foi considerada validação de resposta útil. O orçamento maior retornou o texto esperado.

Esse teste comprova inferência pela central usando uma conexão elegível do pool; não força nem identifica a conexão selecionada entre as duas. Não comprova todos os modelos, tools, SSE ou conciliação financeira. Nenhuma chave do provedor foi exibida ou extraída para o teste. Evidência: `docs/audits/live-inference-2026-10-22.json`.
