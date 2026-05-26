import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
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

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Configurações da loja
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Construtor de páginas
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Crie páginas gerais, páginas de categoria, landing pages,
              campanhas e templates reutilizáveis com blocos configuráveis.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/configuracoes/loja"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Banners e menu
            </Link>

            <Link
              href="/configuracoes/loja/categorias"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Categorias
            </Link>

            <Link
              href="/loja"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver loja
            </Link>

            <CriarTemplateCategoriaButton />
          </div>
        </div>
      </section>

      <PaginasLojaClient paginas={paginas} categorias={categorias} />
    </main>
  );
}