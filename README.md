# Gateway independente com painel e Gator na VPS

Próxima evolução: [plano para administração completa](docs/PLANO-ADMINISTRATIVO-GATEWAY.md), com comparação OmniRoute/9Router, prioridades, telas e critérios de aceite.

Andamento: [checklist administrativo](CHECKLIST-ADMINISTRATIVO-GATEWAY.md). Login, equipe e proteção das chaves já foram implantados; veja [acesso e limitações desta etapa](docs/ADMINISTRACAO-ACESSO.md).

Revisão mais recente: [auditoria funcional de 22/10/2026](docs/AUDITORIA-FUNCIONAL-GATEWAY-2026-10-22.md), com estado de cada tela, falhas reproduzidas e correções prioritárias.

Primeira correção da auditoria implantada na VPS: [políticas de modelos, quota de cliente e RPM](docs/CORRECOES-POLITICAS-GATEWAY.md), com edição pelo painel e limitações explicitadas.

Endereços públicos ativos: [painel](https://secretsof.delvertokens.store) e API em `https://api.delvertokens.store/v1`. Foram reaproveitados os dois hosts do OmniRoute, com HTTPS existente. O template aponta novos remixes para essa API; a versão atualizada ainda precisa ser publicada no Lovable.

O produto tem dois acessos: [painel administrativo e API de clientes](docs/PAINEL-E-API.md). O painel cria a chave que os aplicativos usam na API `/v1`; as chaves Lovable ficam no servidor.

Qualquer projeto Lovable seu com o [gatilho instalado](docs/REMIX-HOOK.md) pode enviar automaticamente a própria chave ao pool. O modo padrão valida a chave no Lovable, sem segredo compartilhado por remix. O envio ocorre na primeira execução do servidor após a publicação.

Painel Node.js, entrada de API e Gator já rodam na VPS, com projetos/remixes no Lovable e dois hosts públicos para painel e API.

Consulte [implantação e testes da VPS](deploy/README.md), [verificação do banco central](gator/DB-VERIFICACAO.md) e [registro de execução](CHECKLIST-EXECUCAO-GATEWAY-ZILONG.md). O plano completo ainda contém etapas pendentes; a base e o handshake já possuem testes.

# Remix of "Oi!" Hello World

oi

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://snuggle-buddy-app-74.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e6c48d8-2e72-4d3f-afa0-0a070e85c2f5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
