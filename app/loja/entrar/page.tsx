import type { Metadata } from "next";
import LoginClienteClient from "@/components/loja/LoginClienteClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Entrar | Stella Colari",
  path: "/loja/entrar",
  robots: {
    index: false,
    follow: false,
  },
});

export const dynamic = "force-dynamic";

export default async function LojaEntrarPage() {
  const [menus, categoriasMenu, configuracaoMenuRodape] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
    buscarConfiguracaoMenuRodape(),
  ]);

  return (
    <LoginClienteClient
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
    />
  );
}
