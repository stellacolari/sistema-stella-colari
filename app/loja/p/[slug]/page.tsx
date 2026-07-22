import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LojaPaginaBuilderClient, {
  type LojaBuilderBloco,
  type LojaBuilderMenu,
  type LojaBuilderProduto,
  type LojaBuilderPagina,
} from "@/components/loja/LojaPaginaBuilderClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { aplicarColecoesEmBlocosBuilder } from "@/lib/loja/colecoes-inteligentes";
import { buscarProdutosPublicos } from "@/lib/loja/produtos";
import { criarMetadataLoja, getImagemSeoBlocos } from "@/lib/loja/seo";
import { serializarBlocosBuilderPublicos } from "@/lib/loja/blocos-publicos.server";
import { buscarConteudoPublicadoPagina } from "@/lib/loja/conteudo/repository.server";
import { extrairSeoConteudo } from "@/lib/loja/conteudo/contracts";

export const dynamic = "force-dynamic";

const TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA = ["GERAL", "LANDING", "CAMPANHA"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const pagina = await prisma.lojaPagina.findFirst({
    where: {
      slug,
      ativo: true,
      statusPublicacao: "PUBLICADA",
      tipo: {
        in: TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA,
      },
    },
    select: {
      id: true,
      titulo: true,
      seoTitle: true,
      seoDescription: true,
      blocos: {
        where: {
          ativo: true,
        },
        orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
        select: {
          configJson: true,
        },
      },
    },
  });
  const conteudoGerenciado = pagina
    ? await buscarConteudoPublicadoPagina(pagina.id)
    : null;
  const conteudoAtivo =
    conteudoGerenciado && !conteudoGerenciado.indisponivel
      ? conteudoGerenciado
      : null;
  const seo = conteudoAtivo ? extrairSeoConteudo(conteudoAtivo.conteudo) : null;

  if (!pagina || conteudoGerenciado?.indisponivel || (!conteudoAtivo && pagina.blocos.length === 0)) {
    return criarMetadataLoja({
      title: "Stella Colari | Loja Online",
      path: `/loja/p/${slug}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  return criarMetadataLoja({
    title: seo?.title || `${pagina.seoTitle || pagina.titulo} | Stella Colari`,
    description: seo?.description || pagina.seoDescription,
    path: `/loja/p/${slug}`,
    canonical: seo?.canonical,
    image: seo?.image || getImagemSeoBlocos(pagina.blocos),
    robots: seo?.noindex ? { index: false, follow: false } : undefined,
  });
}

export default async function LojaPaginaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [
    paginaRaw,
    produtosPublicos,
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
  ] =
    await Promise.all([
      prisma.lojaPagina.findFirst({
        where: {
          slug,
          ativo: true,
          statusPublicacao: "PUBLICADA",
          tipo: {
            in: TIPOS_PERMITIDOS_EM_PAGINA_PUBLICA,
          },
        },
        select: {
          id: true,
          titulo: true,
          slug: true,
          tipo: true,
          blocos: {
            where: {
              ativo: true,
            },
            orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
            select: {
              id: true,
              tipo: true,
              titulo: true,
              ordem: true,
              configJson: true,
            },
          },
        },
      }),

      buscarProdutosPublicos(),

      buscarMenusPublicos(),

      buscarCategoriasMenuPublico(),

      buscarConfiguracaoMenuRodape(),
    ]);

  const conteudoGerenciado = paginaRaw
    ? await buscarConteudoPublicadoPagina(paginaRaw.id)
    : null;
  if (conteudoGerenciado?.indisponivel) {
    notFound();
  }
  const conteudoAtivo = conteudoGerenciado || null;

  if (!paginaRaw || (!conteudoAtivo && paginaRaw.blocos.length === 0)) {
    notFound();
  }

  const pagina: LojaBuilderPagina = {
    id: paginaRaw.id,
    titulo: paginaRaw.titulo,
    slug: paginaRaw.slug,
    tipo: paginaRaw.tipo,
  };

  const blocosResolvidos = conteudoAtivo
    ? []
    : await aplicarColecoesEmBlocosBuilder(paginaRaw.blocos);

  const blocos: LojaBuilderBloco[] =
    serializarBlocosBuilderPublicos(blocosResolvidos);

  const produtos: LojaBuilderProduto[] = produtosPublicos;

  const menus: LojaBuilderMenu[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
    destaque: menu.destaque,
    corDestaque: menu.corDestaque,
  }));

  return (
    <LojaPaginaBuilderClient
      pagina={pagina}
      blocos={blocos}
      produtos={produtos}
      menus={menus}
      categoriasMenu={categoriasMenu}
      configuracaoMenuRodape={configuracaoMenuRodape}
      conteudoGerenciado={conteudoAtivo?.publico}
    />
  );
}
