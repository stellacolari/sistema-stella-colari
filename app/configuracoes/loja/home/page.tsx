import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HomeLojaClient, {
  type HomeCategoriaItem,
  type HomeSecaoItem,
  type HomeBlocoItem,
  type HomeGarantiaItem,
} from "@/components/configuracoes/loja/HomeLojaClient";

export const metadata: Metadata = {
  title: "Home da loja | Sistema Stella",
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

export default async function ConfiguracoesHomeLojaPage() {
  const [categoriasRaw, categoriasHomeRaw, secoesRaw, blocoRaw, garantiaRaw] =
    await Promise.all([
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

      prisma.lojaCategoriaHome.findMany({
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
      }),

      prisma.lojaSecaoHome.findMany({
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
      }),

      prisma.lojaBlocoHome.findFirst({
        orderBy: {
          criadoEm: "asc",
        },
      }),

      prisma.lojaTextoInstitucional.findUnique({
        where: {
          chave: "garantia-produto",
        },
      }),
    ]);

  const categoriasDisponiveis = categoriasRaw.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    caminho: montarCaminhoCategoria(categoria, categoriasRaw),
  }));

  const categoriasHome: HomeCategoriaItem[] = categoriasHomeRaw.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    categoria: item.categoria,
    imagemUrl: item.imagemUrl,
    ordem: item.ordem,
    ativo: item.ativo,
  }));

  const secoes: HomeSecaoItem[] = secoesRaw.map((secao) => ({
    id: secao.id,
    titulo: secao.titulo,
    categorias: secao.categorias,
    ordem: secao.ordem,
    ativo: secao.ativo,
  }));

  const bloco: HomeBlocoItem | null = blocoRaw
    ? {
        id: blocoRaw.id,
        titulo: blocoRaw.titulo,
        texto: blocoRaw.texto,
        imagemUrl: blocoRaw.imagemUrl,
        textoBotao: blocoRaw.textoBotao,
        linkBotao: blocoRaw.linkBotao,
        ativo: blocoRaw.ativo,
      }
    : null;

  const garantia: HomeGarantiaItem | null = garantiaRaw
    ? {
        id: garantiaRaw.id,
        titulo: garantiaRaw.titulo,
        conteudo: garantiaRaw.conteudo,
      }
    : null;

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Configurações da loja
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Home da loja
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configure categorias em destaque, seções de produtos, bloco
              promocional e textos institucionais. As categorias usam a nova
              estrutura hierárquica.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/configuracoes/loja"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Menu e banners
            </Link>

            <Link
              href="/configuracoes/loja/paginas"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Builder
            </Link>

            <Link
              href="/loja"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver loja
            </Link>
          </div>
        </div>
      </section>

      <HomeLojaClient
        categoriasDisponiveis={categoriasDisponiveis}
        categoriasHome={categoriasHome}
        secoes={secoes}
        bloco={bloco}
        garantia={garantia}
      />
    </main>
  );
}