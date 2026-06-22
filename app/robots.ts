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
          "/clientes",
          "/compras",
          "/configuracoes",
          "/dashboard",
          "/estoque",
          "/itens-adicionais",
          "/login",
          "/loja/busca",
          "/loja/carrinho",
          "/loja/checkout",
          "/loja/entrar",
          "/loja/favoritos",
          "/loja/minha-conta",
          "/loja/pedido/",
          "/loja/preview/",
          "/movimentacoes",
          "/notificacoes",
          "/pedidos",
          "/produtos",
          "/relatorios",
          "/resumos",
          "/vendas",
        ],
      },
    ],
    sitemap: getLojaUrl("/sitemap.xml"),
    host: getLojaBaseUrl(),
  };
}
