# Ícones dos conectores no Claude

38 conectores remotos têm imagens PNG incorporadas em `backend/mcp/icons.json`, obtidas dos sites dos fornecedores. Cada registro mantém o endereço de origem. As imagens têm até 48 × 48 pixels e data URI de até 4.096 caracteres, conforme a configuração oficial do Claude. Não há consulta externa para carregar o ícone depois de aplicado ao perfil.

O GitHub é nativo (`server: github`); seu ícone continua sob controle do Claude. Não adicionamos um campo não documentado à entrada nativa. Configuração local não comprova a aparência final da tela até o aplicativo carregar o perfil atualizado.

Para revisar sem alterar:

```powershell
node scripts/desktop-mcp-icons.mjs
```

Para atualizar somente os ícones das conexões existentes:

```powershell
node scripts/desktop-mcp-icons.mjs --apply
```

O atualizador valida o perfil do nosso gateway, faz backup privado e preserva todos os demais campos, incluindo OAuth, portas de retorno e chave da API. Não adiciona conectores nem reinicia o Claude. Executar novamente não gera alterações se os ícones já estiverem iguais. Os ícones também são incluídos nas novas entradas criadas pelo configurador principal.

Reabra o Claude para conferir a aparência. O efeito é neste computador; não muda automaticamente os perfis de outros clientes e não requer publicar uma versão da API na VPS.

Fonte: https://claude.com/docs/third-party/claude-desktop/configuration#managedmcpservers (campo `icon` de conectores remotos).
