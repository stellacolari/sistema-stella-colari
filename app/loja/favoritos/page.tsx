import type { Metadata } from "next";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import FavoritosClient from "@/components/loja/FavoritosClient";

export const metadata: Metadata = {
  title: "Favoritos | Loja Stella",
};

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const [menus, categoriasMenu, produtos] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarProdutosPublicos(),
  ]);

  return (
    <FavoritosClient
      produtos={produtos}
      menus={menus}
      categoriasMenu={categoriasMenu}
    />
  );
}
