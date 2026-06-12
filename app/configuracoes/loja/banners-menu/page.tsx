import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ConfiguracoesLojaClient from "@/components/configuracoes/loja/ConfiguracoesLojaClient";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";

export const metadata: Metadata = {
  title: "Banners e menu | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

function montarCaminhoCategoria(
  categoria: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  },
  categorias: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  }[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  const partes = [categoria.nome];

  let atual = categoria.categoriaMaeId
    ? mapa.get(categoria.categoriaMaeId)
    : null;

  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : null;
  }

  return partes.join(" > ");
}

export default async function BannersMenuLojaPage() {
  const [produtosRaw, categoriasRaw, bannersRaw, menusRaw] = await Promise.all([
    prisma.produto.findMany({
      select: {
        id: true,
        codigoInterno: true,
        nome: true,
        categoria: true,
        imagemUrl: true,
        ativo: true,
        status: true,
      },
      orderBy: {
        nome: "asc",
      },
    }),

    prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        categoriaMaeId: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),

    prisma.bannerLoja.findMany({
      orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
    }),

    prisma.menuLoja.findMany({
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    }),
  ]);

  const produtos = produtosRaw.map((produto) => ({
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    categoria: produto.categoria,
    imagemUrl: produto.imagemUrl,
    ativo: produto.ativo,
    status: produto.status,
  }));

  const categorias = categoriasRaw.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    caminho: montarCaminhoCategoria(categoria, categoriasRaw),
  }));

  const categoriasLegadas = Array.from(
    new Set(
      produtosRaw
        .map((produto) => produto.categoria)
        .filter((categoria) => categoria && categoria.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  const banners = bannersRaw.map((banner) => {
    const bannerComMobile = banner as typeof banner & {
      imagemMobileUrl?: string | null;
    };

    return {
      id: banner.id,
      titulo: banner.titulo,
      subtitulo: banner.subtitulo,
      imagemUrl: banner.imagemUrl,
      imagemMobileUrl: bannerComMobile.imagemMobileUrl ?? null,
      linkUrl: banner.linkUrl,
      ordem: banner.ordem,
      ativo: banner.ativo,
      criadoEm: banner.criadoEm.toISOString(),
      atualizadoEm: banner.atualizadoEm.toISOString(),
    };
  });

  const menus = menusRaw.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    slug: menu.slug,
    tipo: menu.tipo,
    linkUrl: menu.linkUrl,
    categoria: menu.categoria,
    paginaEspecial: menu.paginaEspecial,
    categoriasSelecionadas: menu.categoriasSelecionadas,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
    ativo: menu.ativo,
    ordem: menu.ordem,
    dataInicio: menu.dataInicio
      ? menu.dataInicio.toISOString().slice(0, 10)
      : "",
    dataFim: menu.dataFim ? menu.dataFim.toISOString().slice(0, 10) : "",
    criadoEm: menu.criadoEm.toISOString(),
    atualizadoEm: menu.atualizadoEm.toISOString(),
  }));

  return (
    <main className="space-y-6">
      <LojaConfigHeader
        title="Banners e menu público"
        description="Configure banners desktop/mobile, links, páginas especiais e itens do menu público da loja."
      />

      <ConfiguracoesLojaClient
        produtos={produtos}
        categorias={categoriasLegadas}
        categoriasNovas={categorias}
        banners={banners}
        menus={menus}
      />
    </main>
  );
}
