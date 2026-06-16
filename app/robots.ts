import type { MetadataRoute } from "next";
import { getLojaBaseUrl, getLojaUrl } from "@/lib/loja/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/loja", "/loja/", "/sitemap.xml"],
        disallow: [
          "/",
          "/api/",
          "/loja/busca",
          "/loja/carrinho",
          "/loja/checkout",
          "/loja/entrar",
          "/loja/favoritos",
          "/loja/minha-conta",
          "/loja/pedido/",
          "/loja/preview/",
        ],
      },
    ],
    sitemap: getLojaUrl("/sitemap.xml"),
    host: getLojaBaseUrl(),
  };
}
