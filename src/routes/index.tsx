import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Chat Endpoint — Teste externo seguro" },
      {
        name: "description",
        content:
          "Endpoint de chat de IA com modo de teste protegido por token, sem expor chaves de API.",
      },
      { property: "og:title", content: "AI Chat Endpoint — Teste externo seguro" },
      {
        property: "og:description",
        content:
          "Endpoint de chat de IA com modo de teste protegido por token, sem expor chaves de API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Msg = { role: "user" | "assistant"; content: string };

function Index() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-ai-chat-test-token": token } : {}),
        },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Erro desconhecido.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.content }]);
    } catch {
      setError("Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">AI Chat Endpoint</h1>
          <p className="text-muted-foreground">
            Console de teste para <code className="font-mono">POST /api/public/ai-chat</code>. O
            modelo padrão é <code className="font-mono">google/gemini-3.6-flash</code>.
          </p>
        </header>

        <Card className="space-y-2 p-4">
          <label className="text-sm font-medium" htmlFor="token">
            Token de teste (header <code className="font-mono">x-ai-chat-test-token</code>)
          </label>
          <Input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="AI_CHAT_TEST_TOKEN"
          />
          <p className="text-xs text-muted-foreground">
            Apenas para desenvolvimento. Sem esse token, o endpoint exige sessão autenticada.
          </p>
        </Card>

        <Card className="flex min-h-64 flex-col gap-3 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "self-start rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))
          )}
          {loading && <p className="text-sm text-muted-foreground">Gerando resposta…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Card>

        <div className="flex flex-col gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua mensagem…"
            rows={3}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="self-end">
            Enviar
          </Button>
        </div>
      </div>
    </main>
  );
}
