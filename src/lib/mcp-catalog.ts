export type McpEntry = {
  id: string;
  name: string;
  category: string;
  url: string;
  trial: string;
  reference: boolean;
};
export const MCP_CATALOG: McpEntry[] = [
  {
    id: "github",
    name: "GitHub",
    category: "Código",
    url: "https://github.com/github/github-mcp-server",
    trial: "listar repositórios autorizados e consultar uma issue, sem alterar arquivos",
    reference: false,
  },
  {
    id: "context7",
    name: "Context7",
    category: "Código",
    url: "https://github.com/upstash/context7",
    trial: "buscar a documentação de uma biblioteca e citar sua versão",
    reference: false,
  },
  {
    id: "playwright",
    name: "Playwright",
    category: "Navegador",
    url: "https://github.com/microsoft/playwright-mcp",
    trial: "abrir uma página de teste e consultar seu título",
    reference: false,
  },
  {
    id: "devtools",
    name: "Chrome DevTools",
    category: "Navegador",
    url: "https://github.com/ChromeDevTools/chrome-devtools-mcp",
    trial: "inspecionar uma página de teste e seus erros de console",
    reference: false,
  },
  {
    id: "serena",
    name: "Serena",
    category: "Código",
    url: "https://github.com/oraios/serena",
    trial: "localizar um símbolo em um projeto de teste sem editar o código",
    reference: false,
  },
  {
    id: "figma",
    name: "Figma",
    category: "Design",
    url: "https://developers.figma.com/docs/figma-mcp-server/",
    trial: "consultar um frame de um arquivo autorizado",
    reference: false,
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "Dados",
    url: "https://supabase.com/docs/guides/ai-tools/mcp",
    trial: "consultar o esquema de um projeto de desenvolvimento em modo somente leitura",
    reference: false,
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "Infraestrutura",
    url: "https://vercel.com/docs/mcp",
    trial: "listar os deployments de um projeto autorizado",
    reference: false,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Infraestrutura",
    url: "https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/",
    trial: "escolher o servidor Cloudflare adequado e listar recursos autorizados sem modificá-los",
    reference: false,
  },
  {
    id: "sentry",
    name: "Sentry",
    category: "Infraestrutura",
    url: "https://mcp.sentry.dev/",
    trial: "consultar um erro de um projeto autorizado",
    reference: false,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Produtividade",
    url: "https://developers.notion.com/guides/mcp/overview",
    trial: "pesquisar e ler uma página autorizada sem editá-la",
    reference: false,
  },
  {
    id: "linear",
    name: "Linear",
    category: "Produtividade",
    url: "https://linear.app/docs/mcp",
    trial: "listar tarefas de um projeto autorizado",
    reference: false,
  },
  {
    id: "atlassian",
    name: "Atlassian",
    category: "Produtividade",
    url: "https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/",
    trial: "consultar uma issue Jira ou página Confluence autorizada",
    reference: false,
  },
  {
    id: "slack",
    name: "Slack",
    category: "Produtividade",
    url: "https://docs.slack.dev/ai/slack-mcp-server/",
    trial: "pesquisar uma mensagem em canal autorizado sem enviar mensagens",
    reference: false,
  },
  {
    id: "aws",
    name: "AWS",
    category: "Infraestrutura",
    url: "https://github.com/awslabs/mcp",
    trial:
      "escolher um servidor AWS específico e consultar recursos de desenvolvimento sem alterações",
    reference: false,
  },
  {
    id: "azure",
    name: "Azure",
    category: "Infraestrutura",
    url: "https://github.com/microsoft/mcp",
    trial: "consultar recursos de uma assinatura de desenvolvimento autorizada",
    reference: false,
  },
  {
    id: "brave",
    name: "Brave Search",
    category: "Pesquisa",
    url: "https://github.com/brave/brave-search-mcp-server",
    trial: "pesquisar uma informação pública e apresentar os links",
    reference: false,
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    category: "Pesquisa",
    url: "https://github.com/firecrawl/firecrawl-mcp-server",
    trial: "extrair o texto de uma página pública de teste",
    reference: false,
  },
  {
    id: "tavily",
    name: "Tavily",
    category: "Pesquisa",
    url: "https://github.com/tavily-ai/tavily-mcp",
    trial: "pesquisar um assunto público e citar as fontes",
    reference: false,
  },
  {
    id: "exa",
    name: "Exa",
    category: "Pesquisa",
    url: "https://github.com/exa-labs/exa-mcp-server",
    trial: "encontrar páginas públicas sobre um assunto de teste",
    reference: false,
  },
  {
    id: "browserbase",
    name: "Browserbase",
    category: "Navegador",
    url: "https://github.com/browserbase/mcp-server-browserbase",
    trial: "abrir uma sessão de navegador e ler o título de uma página pública",
    reference: false,
  },
  {
    id: "neon",
    name: "Neon",
    category: "Dados",
    url: "https://neon.com/docs/ai/neon-mcp-server",
    trial: "consultar o esquema de um banco de desenvolvimento sem modificá-lo",
    reference: false,
  },
  {
    id: "mongodb",
    name: "MongoDB",
    category: "Dados",
    url: "https://github.com/mongodb-js/mongodb-mcp-server",
    trial: "listar coleções de um banco de desenvolvimento em modo somente leitura",
    reference: false,
  },
  {
    id: "redis",
    name: "Redis",
    category: "Dados",
    url: "https://github.com/redis/mcp-redis",
    trial: "consultar uma chave de teste em uma instância de desenvolvimento",
    reference: false,
  },
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    category: "Dados",
    url: "https://github.com/elastic/mcp-server-elasticsearch",
    trial: "consultar um índice de desenvolvimento sem indexar ou excluir documentos",
    reference: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Negócios",
    url: "https://docs.stripe.com/mcp",
    trial: "consultar dados no ambiente de testes sem criar cobranças",
    reference: false,
  },
  {
    id: "filesystem",
    name: "Filesystem",
    category: "Local",
    url: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    trial: "listar arquivos apenas em uma pasta de teste explicitamente autorizada",
    reference: true,
  },
  {
    id: "git",
    name: "Git",
    category: "Local",
    url: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    trial: "consultar status e histórico de um repositório de teste sem alterá-lo",
    reference: true,
  },
  {
    id: "memory",
    name: "Memory",
    category: "Local",
    url: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    trial: "gravar e recuperar uma entidade fictícia em armazenamento separado para testes",
    reference: true,
  },
  {
    id: "fetch",
    name: "Fetch",
    category: "Local",
    url: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    trial: "ler uma página pública de teste sem acessar endereços internos",
    reference: true,
  },
];
export const MCP_APPS = ["Claude Code", "Cursor", "VS Code", "Cline"];
export function mcpPrompt(entry: McpEntry, app: string) {
  return `Configure o MCP ${entry.name} no ${app}, no meu computador, usando minha própria conta.
Documentação do mantenedor: ${entry.url}
Leia a documentação atual antes de escolher o pacote, comando ou URL. Confira os requisitos, o transporte e o suporte desta versão do aplicativo. Se houver vários servidores, selecione o necessário para a tarefa abaixo.
Preserve minha configuração existente e a API de modelos https://api.delvertokens.store/v1. Não substitua a chave da nossa API pela credencial do MCP.
Use o fluxo de autorização do próprio aplicativo ou variáveis locais. Nunca publique tokens, não os inclua no Git e não os envie ao administrador do gateway. Se precisar de uma conta, assinatura, autorização ou dado que só eu posso fornecer, explique exatamente qual.
Configure somente os projetos, pastas e permissões necessários. Para servidores locais, use meu sistema operacional e confira os pré-requisitos; para remotos, use o endereço indicado pelo mantenedor. Mostre o trecho de configuração e o local em que será salvo, sem exibir segredos.
Valide a conexão, liste as ferramentas disponíveis e execute este teste: ${entry.trial}.
Use o modelo configurado na nossa API para solicitar a ferramenta, execute-a pelo aplicativo e devolva seu resultado ao modelo. Confirme a resposta final e registre aplicativo, versão, modelo e erro exato se falhar. Não declare sucesso só porque a configuração foi salva.
${entry.reference ? "Este servidor é uma implementação de referência: avalie permissões e isolamento antes de uso com dados reais." : "Verifique requisitos e possíveis custos do fornecedor antes do teste."}`;
}
