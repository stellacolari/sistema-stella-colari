import type { Metadata } from "next";
import BuscaLojaClient from "@/components/loja/BuscaLojaClient";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarLojaInteligente } from "@/lib/loja/busca";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Busca | Stella Colari",
  description: "Encontre joias, acessorios e presentes na Stella Colari.",
  path: "/loja/busca",
  robots: {
    index: false,
    follow: true,
  },
});

export const dynamic = "force-dynamic";

export default async function BuscaLojaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = String(q || "").trim();

  const [resultado, menus, categoriasMenu, configuracaoMenuRodape] =
    await Promise.all([
      buscarLojaInteligente({
        q: termo,
        limite: 48,
        tipo: "produtos",
      }),
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),
    ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
        mostrarFavoritos
      />

      <BuscaLojaClient
        termoInicial={termo}
        produtos={resultado.produtos}
        sugestoes={resultado.sugestoes}
        filtrosDetectados={resultado.filtrosDetectados}
      />

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
