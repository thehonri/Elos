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
    background_color: "#fbf4ee",
    theme_color: "#fbf4ee",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
