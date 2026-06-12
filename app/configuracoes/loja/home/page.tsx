import type { Metadata } from "next";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HomeLojaClient, {
  type HomeCategoriaItem,
  type HomeSecaoItem,
  type HomeBlocoItem,
  type HomeGarantiaItem,
} from "@/components/configuracoes/loja/HomeLojaClient";

export const metadata: Metadata = {
  title: "Home da loja | Plataforma Stella Colari",
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

async function garantirPaginaHomeVisual() {
  return prisma.lojaPagina.upsert({
    where: {
      slug: "home",
    },
    update: {},
    create: {
      titulo: "Home",
      slug: "home",
      tipo: "HOME",
      ativo: false,
      statusPublicacao: "RASCUNHO",
    },
  });
}

export default async function ConfiguracoesHomeLojaPage() {
  const [
    homeVisual,
    categoriasRaw,
    categoriasHomeRaw,
    secoesRaw,
    blocoRaw,
    garantiaRaw,
  ] = await Promise.all([
    garantirPaginaHomeVisual(),

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
    <LojaConfigHeader
      title="Home da loja"
      description="Configure categorias em destaque, seções de produtos, bloco promocional e textos institucionais da loja pública."
      actions={
        <>
          <Link
            href={`/configuracoes/loja/paginas/${homeVisual.id}/editor`}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Editar Home no editor visual
          </Link>
          <Link
            href={`/loja/preview/pagina/${homeVisual.id}`}
            target="_blank"
            className="inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Prévia visual
          </Link>
        </>
      }
    />

    <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
      Você pode continuar usando a configuração atual ou montar a Home pelo
      editor visual. A loja pública usa a Home visual somente quando ela está
      ativa, publicada e possui blocos ativos; caso contrário, esta Home atual
      continua aparecendo como fallback.
    </section>

    <HomeLojaClient
      categoriasDisponiveis={categoriasDisponiveis}
      categoriasHome={categoriasHome}
      secoes={secoes}
      bloco={bloco}
      garantia={garantia}
    />
  </main>
)}
