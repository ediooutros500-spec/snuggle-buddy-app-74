# Gatilho para qualquer projeto Lovable

O gateway reúne as chaves dos projetos Lovable do operador. Prepare qualquer projeto com o gatilho uma vez e use o próprio projeto ou seus remixes, em quantas contas/workspaces precisar. Não existe um pai Lovable obrigatório. Painel e Gator ficam na VPS.

## Como ocorre o envio

Depois de publicar e abrir o projeto, o servidor lê sua própria `LOVABLE_API_KEY` e envia ao Gator por HTTPS. A central valida no Lovable e cadastra no pool por RPC com cifra. O painel autenticado mostra origem, identificação parcial e status; a chave completa fica no servidor para uso pelo gateway.

Remixar/publicar sozinho não executa código. O gatilho precisa de uma requisição ao servidor, normalmente a primeira visita. A chave precisa estar disponível nesse runtime: o código não consegue criar nem obter uma credencial ausente.

## Preparação única antes dos remixes

1. O Gator já está acessível por HTTPS em `https://api.delvertokens.store`, por meio da entrada pública da API na VPS.
2. `src/lib/central-address.ts` já define `CENTRAL_REGISTRATION_ORIGIN` com essa origem pública, herdada pelos novos remixes. A variável de servidor `GATOR_PUBLIC_URL` pode sobrescrevê-la; valores vazios não anulam o endereço herdado.
3. Mantenha `GATOR_REGISTRATION_MODE=auto` nos dois lados. Não é necessário preencher `REMIX_SYNC_SECRET` em cada remix.
4. Mantenha somente a chave própria do projeto no servidor. Não copie credenciais Supabase, token administrativo ou os arquivos de ambiente da central.

Neste repositório o gatilho já está ligado à entrada SSR e ao endpoint local `POST /api/public/v1/workers/announce`. `GATEWAY_ROLE=central` desativa o envio na VPS; não defina esse papel nos projetos que fornecerão chaves.

## Instalar em outro projeto com servidor Node

Copie os três módulos, preservando suas importações relativas:

- `src/lib/central-address.ts`: endereço público herdável.
- `src/lib/child-config.server.ts`: configuração e validação da origem.
- `src/lib/child-handshake.server.ts`: envio, cache e deduplicação.

Invoque o gatilho no handler de entrada do servidor. Em runtimes que encerram tarefas após a resposta, aguarde a promessa ou use o mecanismo de tarefas de background garantidas da plataforma. Exemplo a adaptar ao handler real:

```ts
import { triggerChildHandshake } from "./lib/child-handshake.server";

export async function fetch(request: Request) {
  await triggerChildHandshake(request.url);
  return handleApplicationRequest(request); // handler existente do projeto
}
```

Os módulos usam `process.env` e `node:crypto`. Projetos apenas React/Vite estáticos precisam de backend/Edge Function equivalente para ler a chave e enviar o mesmo contrato. Nunca mova essa leitura para React ou variável `VITE_*`. O navegador pode chamar um endpoint local, que devolve apenas confirmação e não a chave.

Contrato: JSON `{ api_key, project_origin }` para `https://api.delvertokens.store/api/public/v1/workers/register`. Resposta: `{ registered: true, worker_id, status }`. Somente essa confirmação entra no cache de dez minutos. Requisições simultâneas compartilham a tentativa; redirects são recusados. O modo HMAC continua opcional para instalações antigas.

## Conferir

Publique, abra o projeto e confira o pool no painel autenticado. Repetir o cadastro não deve duplicar a chave: a RPC faz upsert. Chaves sem saldo ficam exhausted. Projetos do mesmo workspace podem compartilhar créditos; remixar não comprova saldo independente.

O modo automático comprova aceitação da chave pelo Lovable, sem comprovar propriedade da origem declarada. A origem é rótulo e não autorização administrativa. Os testes automatizados usam serviços simulados. VPS instalada, HTTPS público e rota de cadastro já foram comprovados. Ainda falta publicar a versão atualizada do projeto de origem no Lovable e comprovar um remix real cadastrado e uma chamada upstream. Um remix criado a partir da versão antiga não recebe retroativamente esse gatilho/endereço; precisa de atualização no Lovable ou ser recriado a partir da origem atualizada. Nenhum vínculo GitHub é exigido dos remixes.
