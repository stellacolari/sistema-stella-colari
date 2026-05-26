import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaginaBlocosClient, {
  type LojaPaginaBlocoItem,
  type LojaPaginaEditorItem,
} from "@/components/configuracoes/loja/PaginaBlocosClient";

export const metadata: Metadata = {
  title: "Blocos da página | Sistema Stella",
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
}) {
  if (pagina.slug === "home" || pagina.tipo === "HOME") {
    return "/loja";
  }

  return `/loja/p/${pagina.slug}`;
}

export default async function PaginaBlocosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [paginaRaw, categoriasRaw] = await Promise.all([
    prisma.lojaPagina.findUnique({
      where: { id },
      include: {
        blocos: {
          orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
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

  if (!paginaRaw) {
    notFound();
  }

  const categoriasDisponiveis = categoriasRaw.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    caminho: montarCaminhoCategoria(categoria, categoriasRaw),
  }));

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

  const urlPublica = getUrlPublicaPagina(pagina);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Construtor de páginas
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {pagina.titulo}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Adicione, ordene e configure os blocos da página. Cada bloco pode
              ser ativado ou inativado sem ser apagado.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                Tipo: {pagina.tipo}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                Slug: {pagina.slug}
              </span>

              <span
                className={`rounded-full px-3 py-1 font-semibold ${
                  pagina.ativo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {pagina.ativo ? "Ativa" : "Inativa"}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              URL pública:{" "}
              <span className="font-semibold text-slate-600">
                {urlPublica}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/configuracoes/loja/paginas"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para páginas
            </Link>

            <Link
              href={urlPublica}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver página
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