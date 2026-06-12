import type { Metadata } from "next";
import LoginClienteClient from "@/components/loja/LoginClienteClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";

export const metadata: Metadata = {
  title: "Entrar | Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function LojaEntrarPage() {
  const [menus, categoriasMenu] = await Promise.all([
    buscarMenusPublicos(),
    buscarCategoriasMenuPublico(),
  ]);

  return (
    <LoginClienteClient
      menus={menus}
      categoriasMenu={categoriasMenu}
    />
  );
}
