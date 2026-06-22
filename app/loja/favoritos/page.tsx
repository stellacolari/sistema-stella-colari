import type { Metadata } from "next";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import FavoritosClient from "@/components/loja/FavoritosClient";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Favoritos | Stella Colari",
  path: "/loja/favoritos",
  robots: {
    index: false,
    follow: false,
  },
});

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const [menus, categoriasMenu, configuracaoMenuRodape, produtos] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
    buscarProdutosPublicos(),
  ]);

  return (
    <FavoritosClient
      produtos={produtos}
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}
