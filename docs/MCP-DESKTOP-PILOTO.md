# Piloto no Claude Desktop com gateway

23/10/2026. O aplicativo encontrado é Claude Desktop oficial para Windows, versão 3.6556.2.0, em modo de inferência por terceiros. O perfil ativo aponta para `https://api.delvertokens.store`.

A tela Conectores é alimentada por `managedMcpServers` no perfil de terceiros. Essa configuração difere da lista `mcpServers` do Claude Code CLI e não é enviada por `/v1/models`. O catálogo administrativo sozinho não popula o aplicativo.

Referência: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers

## Primeiro teste: Context7

Foi escolhido porque respondeu sem credencial ao `initialize` e `tools/list` (duas ferramentas). `scripts/configure-desktop-mcp.mjs` preserva o perfil ativo e a chave do gateway; faz backup local privado antes de acrescentar:

```json
{
  "name": "Context7",
  "transport": "http",
  "url": "https://mcp.context7.com/mcp"
}
```

Sem argumentos, o script apenas verifica. Com `--apply`, acrescenta somente esse conector, se ainda não estiver presente. Não imprime o perfil nem a chave. O script é para macOS/Windows; validar outros formatos de instalação antes de usar. No computador deste piloto, o perfil está em `%LOCALAPPDATA%/Claude-3p/configLibrary`. Não compartilhar esse arquivo: contém a chave de inferência. O backup fica em `Claude-3p/gateway-mcp-backups` e também contém a chave.

Após aplicar, encerrar e abrir o aplicativo para carregar o perfil. O processo aberto não foi encerrado automaticamente, para preservar o trabalho em andamento. Context7 confirmado visualmente pelo usuário: conectado com duas ferramentas. Notion acrescentado com oauth: true e autorização concluída, também confirmada por imagem; descoberta de ferramentas e consulta pelo modelo pendentes.

Prompt para o teste após o conector aparecer:

> Use o Context7 para consultar na documentação do React como funciona useEffect. Identifique a biblioteca primeiro, consulte a documentação e explique o resultado citando a fonte. Use as ferramentas do conector; se falhar, mostre o erro exato. Não altere arquivos.

## Dez selecionados

| Conector | Teste sem credencial | Próximo passo |
| --- | --- | --- |
| Context7 | initialize e tools/list: HTTP 200, duas ferramentas | Perfil atualizado; confirmar visibilidade e executar ferramenta no aplicativo |
| Cloudflare Docs | initialize e tools/list: HTTP 200, duas ferramentas | Preparar perfil após validar o primeiro; apenas documentação pública, não administração Cloudflare |
| Exa | initialize e tools/list: HTTP 200, duas ferramentas | Preparar perfil após validar o primeiro; conferir limites de uso do fornecedor |
| GitHub | HTTP 401 com desafio de autenticação | Configurar autorização própria; o conector GitHub embutido requer Client ID de uma OAuth App com device flow. Nenhum Client ID foi inventado ou reaproveitado de outro aplicativo |
| Supabase | HTTP 401 com desafio de autenticação | Autorizar conta e restringir projeto no cliente |
| Figma | HTTP 401 com desafio de autenticação | Autorizar conta no cliente |
| Notion | HTTP 401 com desafio de autenticação | Autorizar conta no cliente |
| Linear | HTTP 401 com desafio de autenticação | Autorizar conta no cliente |
| Sentry | HTTP 401 com desafio de autenticação | Autorizar conta e restringir projeto no cliente |
| Vercel | HTTP 401 com desafio de autenticação | Autorizar conta no cliente |

HTTP 401 não significa conector validado: apenas que o endpoint respondeu pedindo autenticação. `tools/list` também não comprova execução da ferramenta nem compatibilidade do modelo.

## Distribuição pela central

Após confirmar o primeiro conector, preparar distribuição do perfil ou bootstrap de configuração compatível com o aplicativo, sem incluir chaves compartilhadas. Não confundir a API de inferência com um servidor de configuração: inserir dados adicionais em `/v1/models` não entrega MCPs. Antes de implantar bootstrap, validar seu protocolo e autenticação e preservar as configurações existentes dos clientes.
