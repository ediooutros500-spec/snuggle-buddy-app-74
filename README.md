# Gateway independente com painel e Gator na VPS

Qualquer projeto Lovable seu com o [gatilho instalado](docs/REMIX-HOOK.md) pode enviar automaticamente a própria chave ao pool. O modo padrão valida a chave no Lovable, sem segredo compartilhado por remix. O envio ocorre na primeira execução do servidor após a publicação.

O pai também será executado fora do Lovable. O destino atual é pai Node.js e Gator na mesma VPS, com filhos/remixes no Lovable e dois subdomínios futuros para painel e API.

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
