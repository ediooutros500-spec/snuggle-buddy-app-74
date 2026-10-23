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
