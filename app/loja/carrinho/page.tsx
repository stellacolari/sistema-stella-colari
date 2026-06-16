import type { Metadata } from "next";
import CarrinhoClient from "@/components/loja/CarrinhoClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Carrinho | Stella Colari",
  path: "/loja/carrinho",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function CarrinhoPage() {
  const [menus, categoriasMenu] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
  ]);

  return (
    <CarrinhoClient
      menus={menus}
      categoriasMenu={categoriasMenu}
    />
  );
}
