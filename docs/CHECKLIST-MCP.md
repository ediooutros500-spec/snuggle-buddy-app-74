# Conectores MCP — checklist

Atualizado em 23/10/2026. Arquitetura: cliente configura MCP na própria IDE/CLI; gateway atende chamadas ao modelo. Sem área de cliente ou armazenamento central de credenciais MCP.

- [x] Catálogo inicial com 30 conectores, categorias e pesquisa.
- [x] Prompt específico por conector, adaptado ao aplicativo escolhido.
- [x] Guia compartilhável sem login em `/mcp/guias.md`.
- [x] Preservar configuração existente da IDE e separar chave do gateway de credenciais MCP.
- [x] Cada prompt contém documentação do mantenedor e um teste concreto.
- [x] Identificar servidores de referência e validações pendentes.
- [x] Auditar encaminhamento nativo Anthropic: corpo preservado por spread; campos de ferramentas não removidos.
- [x] 91 regressões passaram, incluindo preservação de campos MCP no caminho nativo Anthropic.
- [x] Publicado na VPS em 23/10/2026: /admin/mcp e /mcp/guias.md retornam HTTP 200; 30 prompts conferidos.
- [x] TypeScript e lint dos novos módulos aprovados; compilação Node e imagem Linux aprovadas.
- [x] Três serviços do gateway saudáveis, 26 outros contêineres preservados e StarChef HTTP 200.
- [ ] Validar cada um dos 30 serviços em IDE real, com credenciais próprias autorizadas para esse teste.
- [ ] Validar ciclo completo por família/modelo (Claude, OpenAI, Gemini), streaming, chamadas paralelas e erros.
- [ ] Validar suporte upstream a busca dinâmica de ferramentas do Claude Code (`defer_loading`, `tool_reference`). Preservar campos no gateway não comprova aceitação pelo provedor.

## Critério de aceite por conector

Registrar aplicativo e versão, modelo, data, conexão estabelecida, ferramentas descobertas, execução e resposta final do modelo após o resultado. Configuração salva não é prova de execução. Não ativar todos os conectores automaticamente. Custos e requisitos seguem cada fornecedor. O catálogo não representa ranking universal de uso.

## Limites de observabilidade

A API observa as requisições ao modelo. Não identifica com certeza se uma ferramenta veio de MCP nem acompanha diretamente a sessão entre IDE e servidor MCP. Remover um guia do catálogo não revoga conexões já configuradas nos aplicativos.

## Piloto Claude Desktop com gateway — 23/10/2026

- [x] Identificar perfil ativo e mecanismo managedMcpServers.
- [x] Testar os dez endpoints sem credenciais: três listam ferramentas, sete exigem autenticação.
- [x] Context7 visível no aplicativo e duas ferramentas carregadas, confirmado por imagem do usuário.
- [x] Acrescentar Notion com OAuth individual preservando Context7 e a chave do gateway.
- [x] Usuário confirmou por imagem a conclusão do login Notion.
- [ ] Confirmar descoberta de ferramentas e execução de consulta Notion pelo modelo.
- [ ] Validar demais conectores no aplicativo e suas autorizações.
- [ ] Distribuir configuração para outros clientes via perfil/bootstrap.
- [x] Publicado painel sem o guia de prompts, com acompanhamento manual do piloto. Imagem parent add3611d4d99 saudável; API e Gator preservados.
- [x] 92 testes, TypeScript, lint do componente e compilação Node aprovados; 26 outros contêineres preservados, StarChef HTTP 200.

A página final OAuth em localhost é gerada pelo Claude Desktop e não é controlada pela nossa API.

## Ampliação e retirada do painel — 23/10/2026

- [x] 56 serviços registrados no backend, com deduplicação.
- [x] 32 endpoints sondados: 4 listam ferramentas, 26 pedem autenticação, 2 recusam acesso.
- [x] Remover aba, componente e guia público MCP; redirecionar link antigo.
- [x] Aplicadas 30 definições remotas no perfil ativo: 28 novas, Context7 e Notion preservados.
- [x] Retirada publicada na VPS: /admin/mcp → /admin/overview (307), guia público 404, dashboard 200. Três serviços saudáveis e 26 contêineres preservados.
- [ ] Validar visibilidade, logins e execução de ferramentas dos novos conectores.
- [ ] Completar dados/instalações dos 26 pendentes; ver MCP-BACKEND.md.

## Aceite do usuário — 23/10/2026

- [x] Usuário confirmou que os novos nomes apareceram e relatou teste funcional.
- [x] Usuário deu OK geral para prosseguir com o lote.
- [ ] Execução individual dos 30: não foram informados quais conectores tiveram ferramentas executadas; o aceite geral não substitui evidência técnica por conector.

## Google, Supabase, Lovable e Atlassian — 23/10/2026

- [x] Confirmado no perfil ativo: Supabase e Lovable já presentes; sem duplicação.
- [x] Atlassian v2 sondado (401) e acrescentado ao perfil; total atual 31 definições.
- [x] Configurador dos seis serviços Google implementado com arquivo OAuth local, validação e backup.
- [x] Regressões do perfil e validação Google aprovadas.
- [ ] Google: usuário informou não ter OAuth App; criar projeto/app e confirmar acesso ao Developer Preview antes da ativação. Ver GOOGLE-MCP-ATIVACAO.md.
- [ ] Google: autorizar seis contas/serviços e testar ferramentas depois de atender aos requisitos.

## Configuração Google aplicada — 23/10/2026

- [x] JSON OAuth fornecido pelo usuário validado localmente; seis callbacks web conferidos.
- [x] Seis conectores acrescentados ao perfil ativo: Gmail, Drive, Calendar, Docs, Sheets, Slides. Total: 37 definições.
- [x] Reaplicação confirmou que todos já estão presentes, sem duplicação.
- [ ] Login individual e execução de ferramenta por serviço; APIs e acesso ao preview ainda dependem da validação no Google.
- [x] Credenciais mantidas apenas nos arquivos privados locais; não incluídas no repositório.


## Páginas públicas OAuth — 23/10/2026

- [x] Publicadas app.html, privacy.html e terms.html em secretsof.delvertokens.store, sem login.
- [x] Conteúdo explica o fluxo atual e informa contato, tratamento de dados, revogação e condições de uso.
- [x] HTTP 200, links entre páginas e CSS conferidos; navegação visual aprovada.
- [x] Imagem parent 65b96fc6e837 saudável. API, Gator e 26 outros contêineres preservados; StarChef 200.
- [ ] Preencher Branding no Google e comprovar domínio no Search Console; publicação das páginas não confirma aprovação OAuth ou dos escopos Google.

## Aviso Google e próxima etapa — 23/10/2026

- [x] Usuário informou publicação do aplicativo OAuth e funcionamento da conexão; aceite informado pelo usuário, sem comprovação individual dos seis serviços.
- [x] Acrescentar aviso de aplicativo ainda não verificado na página pública de informações e acessos (`/app.html`), com links para privacidade, termos e revogação.
- [x] Aviso publicado na VPS: conteúdo confirmado por HTTP 200; páginas públicas e CSS 200. Parent `7f8d7c1fc1b7` saudável, API/Gator saudáveis, 26 outros contêineres preservados e StarChef 200.
- [ ] Aprovação OAuth pelo Google: permanece pendente; aviso próprio não remove a tela do Google.
- [ ] Próxima etapa: validar uma consulta somente leitura por serviço (Drive, Docs, Agenda, Gmail, Sheets e Slides), seguida do ciclo ferramenta → modelo nas famílias Claude, OpenAI e Gemini. Não marcar aprovação individual sem resposta observada.
- [ ] Distribuição para outros clientes: preparar configuração por cliente sem credenciais pessoais do administrador; instalação neste computador não equivale a distribuição pela VPS.

## Diagnóstico Google Drive — 23/10/2026

- [x] Conferir log local do Claude: login Drive em 11:25:53 concluiu e salvou tokens; em 11:25:54, conexão autenticada ao MCP retornou HTTP 403. Valores privados omitidos.
- [x] Sondagem sem credenciais: initialize e tools/list retornaram 200, com oito ferramentas anunciadas. Descoberta pública não comprova acesso autenticado aos dados.
- [ ] Confirmar no projeto `gateway-mcp-512513` as APIs `drive.googleapis.com` e `drivemcp.googleapis.com` habilitadas e o acesso ao Google Workspace Developer Preview. Não foi possível confirmar essa configuração pela conta proprietária nesta sessão.
- [ ] Repetir conexão e consulta somente leitura depois de confirmar os requisitos. O motivo específico do 403 não veio no registro observado; habilitação e preview são hipóteses a verificar, não causa comprovada.

## Próximo lote: Shopify e GitHub — 23/10/2026

- [x] Usuário confirmou que o problema do Drive era a habilitação indicada. Não houve nova consulta observada pelo agente.
- [x] Corrigir omissão do Shopify das imagens originais: endereço oficial `https://setup.shopify.com/mcp`, initialize e tools/list HTTP 200, 37 ferramentas anunciadas sem login.
- [x] Shopify acrescentado ao perfil ativo: 38 definições no total; repetição sem duplicação. Reabrir Claude para carregar. Acesso à loja ainda não validado.
- [x] Configurador GitHub nativo implementado, sem tokens/segredos no registro. Correção da comparação entre conectores sem URL.
- [x] Três testes focados passaram; lint dos dois scripts aprovado.
- [x] Instruções e prompt somente leitura em GITHUB-MCP-ATIVACAO.md e MCP-BACKEND.md.
- [ ] Usuário criar OAuth App GitHub e fornecer Client ID público (informou ainda não ter aplicativo).
- [ ] Aplicar GitHub real, concluir autorização e executar leitura do README.
- [ ] Shopify: aparecer no Claude, autorizar loja própria e executar consulta somente leitura.
- [ ] Próximos serviços com credenciais externas: Microsoft 365, Asana e Salesforce; Adobe/QuickBooks continuam com recusa no teste anterior.

## GitHub aplicado — 23/10/2026

- [x] Usuário forneceu Client ID público do aplicativo GitHub; não foi solicitado segredo ou token.
- [x] Configurador aplicado ao perfil ativo: 38 → 39 definições; backup privado criado e repetição confirmou ausência de duplicação.
- [ ] Reabrir o Claude e confirmar GitHub na seção Conectores.
- [ ] Concluir autorização por Device Flow e executar o prompt somente leitura em GITHUB-MCP-ATIVACAO.md. Receber o Client ID não comprova que o Device Flow foi habilitado no GitHub.

