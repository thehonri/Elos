import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elo",
    short_name: "Elo",
    description: "O app do casal.",
    start_url: "/nos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3fbf8",
    theme_color: "#40d1b2",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
