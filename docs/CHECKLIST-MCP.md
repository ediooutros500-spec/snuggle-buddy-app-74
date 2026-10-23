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

