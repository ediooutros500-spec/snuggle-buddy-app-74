# Gateway na mesma VPS do StarChef

Destino escolhido pelo usuário em 22/10/2026: reutilizar a VPS do StarChef. O acesso é SSH direto, com chave privada já existente no computador do operador. A Hostinger não é necessária para acessar esta VPS; sua conexão não bloqueia a implantação. O usuário esclareceu que a Hostinger é usada apenas para o site.

Conexão SSH comprovada em 22/10/2026, com conferência estrita da chave do servidor. Containers `starchef-cloud` e OpenResty existentes identificados; backend e Redis do StarChef saudáveis. A documentação operacional existente usa `starchef.daataflow.com` e runtime `/opt/starchef/runtime`. Endereço SSH e chave privada ficam nos registros privados do operador, fora do repositório público.

## Configuração preparada

Use exclusivamente `deploy/compose.shared-vps.yml` para esta implantação. Ele cria o projeto independente `zilong-gateway-shared`, sem disputar as portas públicas 80/443. Portas loopback 4430 (painel/compatibilidade) e 4431 (Gator) confirmadas livres na inspeção. A porta 20128 já está ocupada por outro serviço: não usá-la no host. Reconfirmar antes do início; as portas podem ser alteradas por `PARENT_LOOPBACK_PORT` e `GATOR_LOOPBACK_PORT`.

Inspeção de leitura: aproximadamente 2 GiB de memória disponível e 15 GiB de disco livre, com 85% de ocupação e uso de swap. É capacidade inicial para avaliar o runtime limitado, não garantia sob carga. Construir as imagens fora da VPS e transferir somente os artefatos necessários; não executar limpeza global do Docker.

O runtime proposto é `/opt/zilong-gateway/runtime`, separado do StarChef. Os dois containers usam usuário sem privilégios das imagens, sistema de arquivos somente leitura, limites de memória/CPU e logs limitados. O limite de memória total de 512 MiB é uma configuração inicial; não comprova capacidade livre na VPS. Builds devem ser feitos fora da VPS se a memória disponível não comportar a compilação.

Não execute os perfis Caddy `https` ou `ip-check` do Compose de hospedagem dedicada nessa VPS: o proxy existente já ocupa as portas públicas. Não altere o Compose, banco, credenciais ou certificados do StarChef para implantar o gateway.

## Verificações antes de ativar

1. Acesso SSH direto confirmado; não é necessário reconectar a Hostinger.
2. Memória, disco, carga, containers e portas conferidos por comandos de leitura. Repetir a inspeção imediatamente antes de ativar os containers.
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

Estrutura Compose validada localmente com `config --no-env-resolution --quiet`, sem carregar segredos. SSH e inspeção de recursos comprovados. A validação completa com os arquivos de ambiente efetivos deve ser repetida no runtime da VPS. A VPS foi apenas inspecionada; nenhum serviço foi alterado. Instalação do gateway, subdomínios, certificados e registro real continuam pendentes. O motor unificado e as quotas concorrentes do gateway são pendências separadas da hospedagem.
