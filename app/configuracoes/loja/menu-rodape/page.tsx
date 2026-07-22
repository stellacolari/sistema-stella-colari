import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  exigirAdminComPermissao,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import MenuRodapeLojaClient from "@/components/configuracoes/loja/MenuRodapeLojaClient";
import ConteudoLojaNav from "@/components/configuracoes/loja/conteudo/ConteudoLojaNav";

export const metadata: Metadata = {
  title: "Menu e Rodapé | Plataforma Stella Colari",
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

function getUrlPublicaPagina(pagina: {
  slug: string;
  tipo: string;
  categoria?: {
    slug: string;
  } | null;
}) {
  if (pagina.tipo === "HOME" || pagina.slug === "home") {
    return "/loja";
  }

  if (pagina.tipo === "CATEGORIA" && pagina.categoria?.slug) {
    return `/loja/categoria/${pagina.categoria.slug}`;
  }

  if (pagina.tipo === "TEMPLATE_CATEGORIA") {
    return "";
  }

  return `/loja/p/${pagina.slug}`;
}

export default async function MenuRodapeLojaPage() {
  const usuario = await exigirAdminComPermissao("lojaOnline", "ver");
  const capacidades = {
    criar: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "criar"),
    editar: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "editar"),
    excluir: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "excluir"),
  };

  const [configuracao, categoriasRaw, menusRaw, paginasRaw] =
    await Promise.all([
      buscarConfiguracaoMenuRodape(),

      prisma.categoriaProduto.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          slug: true,
          categoriaMaeId: true,
          exibirNoMenu: true,
          ordemMenu: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),

      prisma.menuLoja.findMany({
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
      }),

      prisma.lojaPagina.findMany({
        where: {
          statusPublicacao: {
            not: "ARQUIVADA",
          },
        },
        select: {
          id: true,
          titulo: true,
          slug: true,
          tipo: true,
          categoria: {
            select: {
              slug: true,
            },
          },
        },
        orderBy: [{ tipo: "asc" }, { titulo: "asc" }],
      }),
    ]);

  const categorias = categoriasRaw.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    caminho: montarCaminhoCategoria(categoria, categoriasRaw),
    exibirNoMenu: categoria.exibirNoMenu,
    ordemMenu: categoria.ordemMenu,
  }));

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

  const paginasBuilder = paginasRaw
    .map((pagina) => ({
      id: pagina.id,
      titulo: pagina.titulo,
      tipo: pagina.tipo,
      urlPublica: getUrlPublicaPagina(pagina),
    }))
    .filter((pagina) => pagina.urlPublica);

  return (
    <main className="min-h-screen bg-slate-50">
      <ConteudoLojaNav
        title="Menu e Rodapé"
        description="Configure navegação global, links, categorias automáticas, redes sociais, colunas e selos do rodapé da loja."
      />

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <MenuRodapeLojaClient
          configuracaoInicial={configuracao}
          menus={menus}
          categorias={categorias}
          paginasBuilder={paginasBuilder}
          capacidades={capacidades}
        />
      </div>
    </main>
  );
}
