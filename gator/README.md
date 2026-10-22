# Zilong Gator

Serviço central local/VPS do Gateway Zilong Body F74. O app Lovable continua sendo o pai remixável; o Gator receberá os handshakes dos filhos e fará o proxy para o Lovable AI Gateway.

## Primeiro passo

```powershell
cd gator
copy .env.example .env
npm run check
npm start
```

Health check local:

```text
GET http://127.0.0.1:20128/health
```

Neste estágio o Gator só expõe o health check. As próximas fases adicionam Supabase, handshake assinado, gateway engine, pool e API autenticada. Nenhuma key deve ser colocada no frontend ou commitada.
