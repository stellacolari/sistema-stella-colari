import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import CriarTemplateCategoriaButton from "@/components/configuracoes/loja/CriarTemplateCategoriaButton";
import PaginasLojaClient, {
  type CategoriaPaginaBuilderOption,
  type LojaPaginaBuilderItem,
} from "@/components/configuracoes/loja/PaginasLojaClient";

export const metadata: Metadata = {
  title: "Páginas da loja | Sistema Stella",
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

export default async function PaginasLojaPage() {
  const homeExistente = await prisma.lojaPagina.findUnique({
    where: {
      slug: "home",
    },
  });

  if (!homeExistente) {
    await prisma.lojaPagina.create({
      data: {
        titulo: "Home",
        slug: "home",
        tipo: "HOME",
        ativo: true,
        statusPublicacao: "PUBLICADA",
        publicadoEm: new Date(),
      },
    });
  }

  const [paginasRaw, categoriasRaw] = await Promise.all([
    prisma.lojaPagina.findMany({
      orderBy: [{ tipo: "asc" }, { criadoEm: "asc" }],
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            slug: true,
            categoriaMaeId: true,
          },
        },
        blocos: {
          select: {
            id: true,
            ativo: true,
          },
        },
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
  ]);

  const categorias: CategoriaPaginaBuilderOption[] = categoriasRaw.map(
    (categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      categoriaMaeId: categoria.categoriaMaeId,
      caminho: montarCaminhoCategoria(categoria, categoriasRaw),
    })
  );

  const paginas: LojaPaginaBuilderItem[] = paginasRaw.map((pagina) => ({
    id: pagina.id,
    titulo: pagina.titulo,
    slug: pagina.slug,
    tipo: pagina.tipo,
    ativo: pagina.ativo,
    categoriaId: pagina.categoriaId,
    categoriaNome: pagina.categoria?.nome ?? null,
    categoriaSlug: pagina.categoria?.slug ?? null,
    statusPublicacao: pagina.statusPublicacao,
    usarComoTemplatePadrao: pagina.usarComoTemplatePadrao,
    seoTitle: pagina.seoTitle,
    seoDescription: pagina.seoDescription,
    totalBlocos: pagina.blocos.length,
    blocosAtivos: pagina.blocos.filter((bloco) => bloco.ativo).length,
    criadoEm: pagina.criadoEm.toISOString(),
    atualizadoEm: pagina.atualizadoEm.toISOString(),
  }));

<LojaConfigHeader
  title="Construtor de páginas"
  description="Crie páginas gerais, páginas de categoria, landing pages, campanhas e templates reutilizáveis com blocos configuráveis."
  actions={<CriarTemplateCategoriaButton />}
/>
}