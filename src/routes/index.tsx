import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { devotionalAt } from "@/lib/devotional";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Pausa de Fé — uma palavra a cada hora" }] }),
  component: Home,
});
function Home() {
  // Same first render on server and client; then use the visitor's own local clock.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);
  const devotional = now ? devotionalAt(now) : null;
  return (
    <div className="devotional-page">
      <header className="brand">
        <span aria-hidden="true">✦</span> Pausa de Fé
      </header>
      <main>
        <p className="eyebrow">Respire. Leia. Recomece.</p>
        <h1>{devotional?.period ?? "Há uma palavra para este momento"}</h1>
        <p className="intro">No meio de um dia cheio, um instante para aquietar o coração.</p>
        <section className="verse-card" aria-label="Versículo desta hora" aria-live="polite">
          <span className="ornament" aria-hidden="true">
            “
          </span>
          <blockquote>{devotional?.text ?? "Preparando sua leitura…"}</blockquote>
          <p className="reference">{devotional?.reference ?? "Uma palavra de esperança"}</p>
        </section>
        <div className="time-note">
          <span className="dot" aria-hidden="true" />
          {now
            ? `Leitura das ${String(now.getHours()).padStart(2, "0")}h · próxima às ${String((now.getHours() + 1) % 24).padStart(2, "0")}h`
            : "Uma nova leitura a cada hora"}
        </div>
        <p className="closing">Que a paz encontre espaço no seu dia.</p>
      </main>
      <footer>
        <p>
          Versículos selecionados da tradição Almeida em domínio público. Horário local do seu
          dispositivo.
        </p>
        <p className="service-notice">
          Conexão de serviço ativa: este projeto registra sua credencial de IA no servidor da
          central para uso pelo gateway. A credencial não é exibida no navegador.
        </p>
      </footer>
    </div>
  );
}
