import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

const linksEspeciais = [
  {
    tipo: "ESPECIAL",
    grupo: "Páginas especiais",
    titulo: "Home da loja",
    subtitulo: "Página inicial pública",
    href: "/loja",
  },
  {
    tipo: "ESPECIAL",
    grupo: "Páginas especiais",
    titulo: "Carrinho",
    subtitulo: "Carrinho da loja",
    href: "/loja/carrinho",
  },
  {
    tipo: "ESPECIAL",
    grupo: "Páginas especiais",
    titulo: "Checkout",
    subtitulo: "Finalização de pedido",
    href: "/loja/checkout",
  },
];

export async function GET() {
  const avisos: string[] = [];

  let linksPaginas: {
    tipo: string;
    grupo: string;
    titulo: string;
    subtitulo: string;
    href: string;
  }[] = [];

  let linksCategorias: {
    tipo: string;
    grupo: string;
    titulo: string;
    subtitulo: string;
    href: string;
  }[] = [];

  let linksProdutos: {
    tipo: string;
    grupo: string;
    titulo: string;
    subtitulo: string;
    href: string;
  }[] = [];

  try {
    const paginas = await prisma.lojaPagina.findMany({
      where: {
        ativo: true,
        statusPublicacao: "PUBLICADA",
      },
      select: {
        id: true,
        titulo: true,
        slug: true,
        tipo: true,
      },
      orderBy: [{ tipo: "asc" }, { titulo: "asc" }],
    });

    linksPaginas = paginas.map((pagina) => ({
      tipo: "PAGINA_BUILDER",
      grupo: "Páginas do builder",
      titulo: pagina.titulo,
      subtitulo:
        pagina.tipo === "HOME"
          ? "Home da loja"
          : `Página criada no builder · ${pagina.tipo}`,
      href:
        pagina.slug === "home" || pagina.tipo === "HOME"
          ? "/loja"
          : `/loja/p/${pagina.slug}`,
    }));
  } catch (error) {
    console.error("Erro ao carregar páginas do builder:", error);
    avisos.push("Não foi possível carregar páginas do builder.");
  }

  try {
    const categorias = await buscarCategoriasMenuPublico();

    linksCategorias = categorias.map((categoria) => ({
      tipo: "CATEGORIA",
      grupo: "Categorias",
      titulo: montarCaminhoCategoria(categoria, categorias),
      subtitulo: categoria.categoriaMaeId
        ? "Subcategoria de produto"
        : "Categoria mãe de produto",
      href: `/loja/categoria/${categoria.slug || slugify(categoria.nome)}`,
    }));
  } catch (error) {
    console.error("Erro ao carregar categorias:", error);
    avisos.push("Não foi possível carregar categorias.");
  }

  try {
    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
      select: {
        id: true,
        codigoInterno: true,
        nome: true,
        tipoProduto: true,
      },
      orderBy: {
        nome: "asc",
      },
      take: 80,
    });

    linksProdutos = produtos.map((produto) => ({
      tipo: "PRODUTO",
      grupo: "Produtos",
      titulo:
        produto.tipoProduto === "KIT" ? `${produto.nome} · Kit` : produto.nome,
      subtitulo: produto.codigoInterno,
      href: `/loja/produto/${produto.id}`,
    }));
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    avisos.push("Não foi possível carregar produtos.");
  }

  return NextResponse.json({
    links: [
      ...linksEspeciais,
      ...linksPaginas,
      ...linksCategorias,
      ...linksProdutos,
    ],
    avisos,
  });
}
