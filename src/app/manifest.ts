import type { MetadataRoute } from "next";

// App instalável (PWA): no iPhone, Safari › Compartilhar › "Adicionar à Tela
// de Início"; no Android, o Chrome oferece "Instalar app".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inspeção Ex · ERGA Engenharia",
    short_name: "Inspeção Ex",
    description: "Inventário e inspeção de equipamentos Ex (ABNT NBR IEC 60079-17).",
    start_url: "/projetos",
    display: "standalone",
    background_color: "#F2F3EF",
    theme_color: "#16405F",
    lang: "pt-BR",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
