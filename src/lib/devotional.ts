// Short passages from the public-domain Almeida tradition; no remote service or AI call.
export const verses = [
  { text: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1" },
  {
    text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.",
    reference: "Salmos 46:1",
  },
  {
    text: "Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.",
    reference: "Salmos 119:105",
  },
  {
    text: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.",
    reference: "Eclesiastes 3:1",
  },
  {
    text: "Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele.",
    reference: "Salmos 118:24",
  },
  { text: "O choro pode durar uma noite, mas a alegria vem pela manhã.", reference: "Salmos 30:5" },
  {
    text: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.",
    reference: "Salmos 37:5",
  },
  {
    text: "Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.",
    reference: "Mateus 5:9",
  },
  {
    text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.",
    reference: "Romanos 12:12",
  },
  { text: "Todas as vossas coisas sejam feitas com caridade.", reference: "1 Coríntios 16:14" },
  { text: "O Senhor te abençoe e te guarde.", reference: "Números 6:24" },
  {
    text: "Em paz também me deitarei e dormirei, porque só tu, Senhor, me fazes habitar em segurança.",
    reference: "Salmos 4:8",
  },
] as const;

export function devotionalAt(date: Date) {
  const hour = date.getHours();
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const verse = verses[(day + hour) % verses.length]!;
  return {
    ...verse,
    period:
      hour < 6
        ? "Uma pausa na madrugada"
        : hour < 12
          ? "Uma palavra para sua manhã"
          : hour < 18
            ? "Uma pausa na sua tarde"
            : "Uma palavra para sua noite",
  };
}
