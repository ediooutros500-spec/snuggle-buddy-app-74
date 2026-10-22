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

**Instalado e rodando na VPS em 22/10/2026**, por autorização do usuário. Projeto `zilong-gateway-shared` no runtime `/opt/zilong-gateway/runtime`. Imagens Linux construídas no computador e transferidas por SSH: `zilong-gateway-parent:ea2e83fbb037` e `zilong-gator:ea2e83fbb037`. Código equivalente publicado no commit `edff5af7811924501be1fc9f087cb997d0ed70f1`. Arquivo de imagens verificado por SHA-256 antes do carregamento; preservado em `/opt/zilong-gateway/releases/ea2e83fbb037`.

Validação Compose com os arquivos de ambiente efetivos aprovada. Credenciais separadas, arquivos com permissão 600, somente o runtime central possui service role. Containers saudáveis, usuário sem privilégios, filesystem somente leitura, reinício `unless-stopped` e limites de 384/128 MiB conferidos. Portas publicadas exclusivamente em `127.0.0.1:4430` e `127.0.0.1:4431`.

Verificações reais aprovadas:

- Home, health do pai e health do Gator: HTTP 200; papel central confirmado.
- Administração sem token: HTTP 401; com token: HTTP 200 e leitura do Supabase aprovada.
- Catálogo autenticado e consulta do pool: HTTP 200.
- Origem inválida recusada pelo Gator com HTTP 400 antes de chamar o upstream.
- Pool e clientes vazios: nenhuma chave Lovable real cadastrada e nenhuma chamada de IA consumida nesta verificação.
- StarChef readiness: HTTP 200 antes e depois; backend saudável. IDs dos 26 containers anteriores preservados, sem recriação dos demais projetos.

Acesso provisório neste computador por túnel SSH: painel em `http://127.0.0.1:34430` e health do Gator em `http://127.0.0.1:34431/health`. O transporte até a VPS é cifrado pelo SSH; essas URLs são locais, não acessíveis pelos remixes. O túnel dura enquanto o processo SSH e este computador estiverem ativos.

Continuam pendentes os dois subdomínios, DNS/certificados/rotas no proxy compartilhado, URL HTTPS herdada no template e registro de um projeto Lovable real. O motor unificado e as quotas concorrentes do gateway são pendências separadas da hospedagem. Instalação e health aprovados não significam plano completo nem validação de tráfego de IA real.
