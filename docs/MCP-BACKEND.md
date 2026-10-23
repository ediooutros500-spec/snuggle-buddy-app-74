# MCP no backend — 23/10/2026

A aba MCP foi removida do painel, e /admin/mcp redireciona ao dashboard. O guia público foi retirado. Registro mantido em backend/mcp/registry.json.

56 serviços cadastrados, incluindo os 30 originais e os nomes adicionais das imagens, sem duplicação. 30 definições remotas instaláveis; 26 dependem de parâmetros, instalação local ou acesso específico. Não são 56 integrações funcionais validadas.

O instalador scripts/configure-desktop-mcp.mjs --connector all --apply acrescenta apenas as definições prontas ao perfil ativo deste computador. Faz backup privado e preserva a chave da API e as conexões existentes, incluindo autorizações do Context7 e Notion. Reabrir o Claude para carregar os novos nomes. Cada cliente autoriza a própria conta; nenhuma autorização foi concedida automaticamente.

A configuração fica no computador do cliente. Apenas mudar o backend na VPS não altera outros computadores: para distribuir é necessário aplicar um perfil ou implantar bootstrap compatível com Claude Desktop. Ainda não há sincronização remota automática.

## Adicionados para teste de conexão

- Context7 — https://mcp.context7.com/mcp — HTTP 200
- Figma — https://mcp.figma.com/mcp — HTTP 401
- Supabase — https://mcp.supabase.com/mcp?read_only=true — HTTP 401
- Vercel — https://mcp.vercel.com — HTTP 401
- Cloudflare Docs — https://docs.mcp.cloudflare.com/mcp — HTTP 200
- Sentry — https://mcp.sentry.dev/mcp — HTTP 401
- Notion — https://mcp.notion.com/mcp — HTTP 401
- Linear — https://mcp.linear.app/mcp — HTTP 401
- Slack — https://mcp.slack.com/mcp — HTTP 401
- AWS Knowledge — https://knowledge-mcp.global.api.aws — HTTP 200
- Firecrawl — https://mcp.firecrawl.dev/v2/mcp-oauth — HTTP 401
- Tavily — https://mcp.tavily.com/mcp — HTTP 401
- Exa — https://mcp.exa.ai/mcp — HTTP 200
- Neon — https://mcp.neon.tech/mcp — HTTP 401
- Stripe — https://mcp.stripe.com — HTTP 401
- Miro — https://mcp.miro.com/ — HTTP 401
- Canva — https://mcp.canva.com/mcp — HTTP 401
- ClickUp — https://mcp.clickup.com/mcp — HTTP 401
- Lovable — https://mcp.lovable.dev — HTTP 401
- Postman — https://mcp.postman.com/minimal — HTTP 401
- Granola — https://mcp.granola.ai/mcp — HTTP 401
- ElevenLabs — https://api.elevenlabs.io/v1/mcp — HTTP 401
- Datadog — https://mcp.datadoghq.com/v1/mcp — HTTP 401
- Spotify — https://mcp-gateway-external-pilot.spotify.net/mcp — HTTP 401
- Wispr Flow — https://api.wisprflow.ai/connect/mcp — HTTP 401
- Indeed — https://mcp.indeed.com/claude/mcp — HTTP 401
- vidIQ — https://mcp.vidiq.com/mcp — HTTP 401
- Windsor.ai — https://mcp.windsor.ai/ — HTTP 401
- Zoom for Claude — https://mcp.zoom.us/mcp/zoom/streamable — HTTP 401
- Zapier — https://mcp.zapier.com/api/v1/connect — HTTP 401

## Pendências concretas

- GitHub: GitHub OAuth App com device flow habilitado e Client ID próprio; ou credencial individual. Não reutilizar ID de outro aplicativo. Fonte: https://github.com/github/github-mcp-server
- Playwright: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/microsoft/playwright-mcp
- Chrome DevTools: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Serena: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/oraios/serena
- Atlassian: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/
- Azure: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/microsoft/mcp
- Brave Search: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/brave/brave-search-mcp-server
- Browserbase: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/browserbase/mcp-server-browserbase
- MongoDB: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/mongodb-js/mongodb-mcp-server
- Redis: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/redis/mcp-redis
- Elasticsearch: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/elastic/mcp-server-elasticsearch
- Filesystem: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
- Git: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/modelcontextprotocol/servers/tree/main/src/git
- Memory: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- Fetch: Configuração específica do serviço: credencial, recurso ou instalação local. Fonte: https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
- Intuit QuickBooks: Fornecedor respondeu HTTP 403 ao cliente de teste. Verificar acesso e restrições do fornecedor antes de instalar. Fonte: https://claude.com/marketplace/connectors/quickbooks
- Adobe for creativity: Fornecedor respondeu HTTP 403 ao cliente de teste. Verificar acesso e restrições do fornecedor antes de instalar. Fonte: https://claude.com/marketplace/connectors/adobe
- Google Drive: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Gmail: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Google Calendar: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Google Docs: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Google Sheets: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Google Slides: OAuth Client ID e secret próprios do Google Cloud; habilitar APIs. Fonte: https://developers.google.com/workspace/guides/configure-mcp-servers
- Microsoft 365: Tenant ID e Client ID do aplicativo Microsoft Entra da organização. Fonte: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers
- Asana: OAuth App própria com client ID: v2 não suporta registro dinâmico. Fonte: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers
- Salesforce: URL do servidor e OAuth do ambiente Salesforce do cliente. Fonte: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers

## Limites dos testes

32 endpoints sondados, sem credenciais: quatro initialize/tools-list aprovados; 26 exigem login; dois negaram acesso (Adobe e QuickBooks, retirados da instalação automática). Spotify exigiu autenticação apesar da descrição do diretório. AWS e Cloudflare neste lote são servidores de documentação pública, não administração das contas. Nenhuma ferramenta de pagamento, imagem ou vídeo foi executada. Os logins devem ser testados individualmente no aplicativo.

## Atualização posterior

31 definições instaláveis após acrescentar Atlassian v2. Google tem configurador implementado, porém permanece sem ativação: ainda faltam acesso ao Developer Preview e OAuth próprio. Supabase e Lovable conferidos no perfil ativo. Os números anteriores representam a etapa anterior.

## Estado atual após Google e Shopify

57 serviços no registro: 32 definições remotas sem parâmetros locais adicionais; seis Google configurados por JSON privado; 19 restantes dependem de aplicativo OAuth, ambiente, instalação local ou liberação. Perfil deste computador: 38 definições após Shopify. Esses totais representam configuração, não execução validada de todos os serviços.

Google OAuth já foi criado e aplicado. Usuário confirmou ter identificado a pendência de habilitação do Drive após o 403; consultas individuais continuam pendentes. GitHub tem configurador com `--connector github --github-client-id CLIENT_ID_PUBLICO`; instruções completas em GITHUB-MCP-ATIVACAO.md. Nenhum identificador fictício aplicado ao perfil real.

### Shopify

Endereço confirmado no diretório oficial: https://claude.com/marketplace/connectors/shopify → `https://setup.shopify.com/mcp`. Sondagem em 23/10/2026: initialize e tools/list HTTP 200, 37 ferramentas. Entrada sem OAuth na descoberta pública, conforme o diretório; acessar uma loja existente exige login e aprovação do titular no fluxo Shopify. Isso não comprova que o fluxo de loja funcionará no cliente 3P até executá-lo. Não executar criação, alteração ou compra no teste.

Prompt de validação:

> Use o conector Shopify para identificar se existe uma loja minha vinculada. Se houver, consulte somente o nome da loja e até três produtos e mostre a ferramenta executada. Se não houver, informe como iniciar o vínculo pelo fluxo oficial. Não crie loja, produto, desconto, pedido ou qualquer alteração e não peça credenciais no chat.

Pendências restantes: GitHub, Microsoft 365, Asana e Salesforce exigem configuração própria; Adobe e QuickBooks exigem esclarecer a recusa de acesso; Playwright, Chrome DevTools, Serena, Azure, Brave Search, Browserbase, MongoDB, Redis, Elasticsearch, Filesystem, Git, Memory e Fetch exigem configuração local, recurso ou chave do cliente. Não transformar nomes pendentes em entradas funcionais sem atender aos requisitos.
