# GitHub MCP: ativação por cliente

## Criar o aplicativo

1. Abra https://github.com/settings/applications/new na conta que administrará o aplicativo.
2. Application name: `Gateway MCP`.
3. Homepage URL: `https://secretsof.delvertokens.store/app.html`.
4. Authorization callback URL: `http://127.0.0.1/callback`. O formulário exige um endereço; o login usado pelo conector é Device Flow, sem retorno por essa URL.
5. Registre e ative **Enable Device Flow** na configuração do aplicativo.
6. Copie somente o **Client ID**. Não é necessário criar Client Secret ou compartilhar token pessoal.

## Configurar

No repositório, substitua CLIENT_ID_PUBLICO pelo identificador real:

```powershell
node scripts/configure-desktop-mcp.mjs --connector github --github-client-id CLIENT_ID_PUBLICO
node scripts/configure-desktop-mcp.mjs --connector github --github-client-id CLIENT_ID_PUBLICO --apply
```

O primeiro comando apenas confere; o segundo faz backup privado e acrescenta o conector ao perfil ativo do nosso gateway. Não altera conexão GitHub já existente: um Client ID diferente exige revisar a entrada antes de substituir. Reabra o Claude, escolha GitHub em Conectores e conclua pessoalmente a autorização do código em github.com. Cada cliente usa sua própria conta.

Usamos o conector GitHub incluído no Claude (`server: github`), sem reaproveitar o aplicativo OAuth de outra ferramenta. Não definimos permissões adicionais no perfil; confira as permissões exibidas no login. A disponibilidade de ferramentas depende do aplicativo, da organização GitHub e do conector.

## Prompt de validação

> Use o conector GitHub para ler o README de ediooutros500-spec/snuggle-buddy-app-74. Informe o nome do repositório, resuma o README e mostre a ferramenta executada. Não crie nem altere arquivos, issues ou pull requests. Se a autorização falhar, informe o erro real.

## Checklist

- [x] Configurador valida formato do Client ID e recusa tokens/segredos conhecidos.
- [x] Testes de preservação do perfil, conector nativo e repetição sem duplicação.
- [ ] OAuth App real criado com Device Flow habilitado.
- [ ] Perfil aplicado com Client ID real e GitHub visível.
- [ ] Login individual concluído e leitura executada pelo modelo.

Fontes: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers e https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
