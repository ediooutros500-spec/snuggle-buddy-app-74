# Gateway na mesma VPS do StarChef

Destino escolhido pelo usuário em 22/10/2026: reutilizar a hospedagem do StarChef. A documentação da implantação existente identifica `starchef.daataflow.com`, runtime `/opt/starchef/runtime`, projeto Docker `starchef-cloud` e proxy compartilhado OpenResty. Essa evidência local ainda precisa ser conferida no servidor. O conector Hostinger atualmente exige reautenticação.

## Configuração preparada

Use exclusivamente `deploy/compose.shared-vps.yml` para esta implantação. Ele cria o projeto independente `zilong-gateway-shared`, sem disputar as portas públicas 80/443. As portas candidatas são loopback 4430 (painel/compatibilidade) e 4431 (Gator). Devem ser confirmadas livres antes do início; podem ser alteradas por `PARENT_LOOPBACK_PORT` e `GATOR_LOOPBACK_PORT`.

O runtime proposto é `/opt/zilong-gateway/runtime`, separado do StarChef. Os dois containers usam usuário sem privilégios das imagens, sistema de arquivos somente leitura, limites de memória/CPU e logs limitados. O limite de memória total de 512 MiB é uma configuração inicial; não comprova capacidade livre na VPS. Builds devem ser feitos fora da VPS se a memória disponível não comportar a compilação.

Não execute os perfis Caddy `https` ou `ip-check` do Compose de hospedagem dedicada nessa VPS: o proxy existente já ocupa as portas públicas. Não altere o Compose, banco, credenciais ou certificados do StarChef para implantar o gateway.

## Verificações antes de ativar

1. Restabelecer o acesso à hospedagem e confirmar o servidor que atende o StarChef.
2. Conferir memória, disco, carga, containers e portas disponíveis, além da saúde inicial do StarChef.
3. Preparar diretório e imagens do gateway, preservando segredos somente no runtime privado. O Supabase do gateway continua sendo o seu banco central próprio.
4. Validar a configuração sem mostrar segredos:

```sh
docker compose -f deploy/compose.shared-vps.yml config --quiet
```

5. Subir somente o projeto independente do gateway e conferir health local e administração sem token recusada. Não modificar a stack do StarChef.
6. Definir os dois novos subdomínios para painel e API. Adicionar vhosts próprios no OpenResty existente, com DNS e certificados próprios, após inspecionar sua rede e configuração reais. O endereço exato dos upstreams depende de o proxy rodar no host ou em container; não assumir que seu loopback é o loopback do host.
7. No host da API, encaminhar `/health` e `/api/public/v1/workers/register` ao Gator. Temporariamente `/v1/*` deve apontar para `/api/public/v1/*` do pai, como ponte de compatibilidade. Desativar buffering e ajustar timeout nas rotas com streaming. Testar a configuração antes de recarregar somente o proxy.
8. Configurar a URL HTTPS pública uma vez no template Lovable, publicar e visitar um projeto real. Conferir cadastro, cifra e uma chamada upstream.
9. Conferir novamente a saúde do StarChef e dos demais serviços. Para retorno, remover somente os vhosts e containers deste projeto; não executar operações de limpeza global do Docker.

## Estado real

Estrutura Compose validada localmente com `config --no-env-resolution --quiet`, sem carregar segredos. A validação completa com os arquivos de ambiente efetivos deve ser repetida no runtime da VPS. A VPS não foi alterada por esta etapa. Capacidade livre, portas, subdomínios, certificados e registro real continuam pendentes. O motor unificado e as quotas concorrentes do gateway são pendências separadas da hospedagem.
