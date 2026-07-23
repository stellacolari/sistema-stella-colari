import type { Metadata } from "next";
import { cache } from "react";
import BuscaLojaClient from "@/components/loja/BuscaLojaClient";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import RodapePublicoLoja from "@/components/loja/RodapePublicoLoja";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarLojaInteligente } from "@/lib/loja/busca";
import { criarMetadataLoja } from "@/lib/loja/seo";
import { extrairSeoConteudo } from "@/lib/loja/conteudo/contracts";
import { buscarConteudoPublicadoSistema } from "@/lib/loja/conteudo/repository.server";

const buscarConteudoBuscaMemo = cache(() =>
  buscarConteudoPublicadoSistema({ tipo: "BUSCA_GLOBAL" }),
);

export async function generateMetadata(): Promise<Metadata> {
  const gerenciado = await buscarConteudoBuscaMemo();
  const seo = gerenciado ? extrairSeoConteudo(gerenciado.conteudo) : null;

  return criarMetadataLoja({
    title: seo?.title || "Busca | Stella Colari",
    description:
      seo?.description || "Encontre joias, acessorios e presentes na Stella Colari.",
    path: "/loja/busca",
    canonical: seo?.canonical,
    image: seo?.image,
    robots: {
      index: false,
      follow: true,
    },
  });
}

export const dynamic = "force-dynamic";

export default async function BuscaLojaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = String(q || "").trim().slice(0, 160);

  const [resultado, menus, categoriasMenu, configuracaoMenuRodape, gerenciado] =
    await Promise.all([
      buscarLojaInteligente({
        q: termo,
        limite: 48,
        tipo: "produtos",
      }),
      buscarMenusPublicos(),
      buscarCategoriasMenuPublico(),
      buscarConfiguracaoMenuRodape(),
      buscarConteudoBuscaMemo(),
    ]);

  const values = gerenciado?.conteudo.values;
  const texto = (key: string) =>
    typeof values?.[key] === "string" ? String(values[key]).trim() : "";

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
        conteudo={{
          title: texto("header.title"),
          text: texto("header.text"),
          emptyTitle: texto("header.emptyTitle"),
          emptyText: texto("header.emptyText"),
        }}
      />

      <RodapePublicoLoja
        menus={menus}
        configuracaoMenuRodape={configuracaoMenuRodape}
      />
    </div>
  );
}
