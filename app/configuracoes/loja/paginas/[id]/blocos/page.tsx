import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PaginaBlocosClient, {
  type CategoriaBuilderOption,
  type LojaPaginaBlocoItem,
  type LojaPaginaEditorItem,
} from "@/components/configuracoes/loja/PaginaBlocosClient";

export const metadata: Metadata = {
  title: "Blocos da página | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function montarCaminhoCategoria(categoria: {
  nome: string;
  categoriaMae?: {
    nome: string;
    categoriaMae?: {
      nome: string;
    } | null;
  } | null;
}) {
  const partes = [
    categoria.categoriaMae?.categoriaMae?.nome,
    categoria.categoriaMae?.nome,
    categoria.nome,
  ].filter(Boolean);

  return partes.join(" > ");
}

export default async function PaginaBlocosPage({ params }: PageProps) {
  const { id } = await params;

  const [paginaRaw, categoriasRaw] = await Promise.all([
    prisma.lojaPagina.findUnique({
      where: {
        id,
      },
      include: {
        blocos: {
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        },
      },
    }),

    prisma.categoriaProduto.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        slug: true,
        categoriaMaeId: true,
        categoriaMae: {
          select: {
            id: true,
            nome: true,
            slug: true,
            categoriaMae: {
              select: {
                id: true,
                nome: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!paginaRaw) {
    notFound();
  }

  const pagina: LojaPaginaEditorItem = {
    id: paginaRaw.id,
    titulo: paginaRaw.titulo,
    slug: paginaRaw.slug,
    tipo: paginaRaw.tipo,
    ativo: paginaRaw.ativo,
  };

  const blocos: LojaPaginaBlocoItem[] = paginaRaw.blocos.map((bloco) => ({
    id: bloco.id,
    tipo: bloco.tipo,
    titulo: bloco.titulo,
    ativo: bloco.ativo,
    ordem: bloco.ordem,
    configJson: bloco.configJson,
    criadoEm: bloco.criadoEm.toISOString(),
    atualizadoEm: bloco.atualizadoEm.toISOString(),
  }));

  const categoriasDisponiveis: CategoriaBuilderOption[] = categoriasRaw.map(
    (categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      categoriaMaeId: categoria.categoriaMaeId,
      caminho: montarCaminhoCategoria(categoria),
    })
  );

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/configuracoes/loja/paginas"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para páginas
            </Link>

            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-slate-500">
              Builder
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {pagina.titulo}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Organize os blocos desta página, edite conteúdos, defina vitrines,
              banners, formulários e seções dinâmicas.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                Tipo: {pagina.tipo}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                Slug: {pagina.slug}
              </span>

              <span
                className={`rounded-full px-3 py-1 ${
                  pagina.ativo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {pagina.ativo ? "Ativa" : "Inativa"}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {blocos.length} bloco{blocos.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/configuracoes/loja/paginas/${pagina.id}/editor`}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir editor visual
            </Link>
          </div>
        </div>
      </section>

      <PaginaBlocosClient
        pagina={pagina}
        blocos={blocos}
        categoriasDisponiveis={categoriasDisponiveis}
      />
    </main>
  );
}
