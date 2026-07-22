import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProdutoLojaClient, {
  type ProdutoLojaMenuItem,
  type ProdutoLojaOpcaoAdicional,
} from "@/components/loja/ProdutoLojaClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarConfiguracaoMenuRodape } from "@/lib/loja/menu-rodape-config";
import { buscarEmbalagensPresentePublicas } from "@/lib/embalagens/presente-loja";
import {
  buscarDescontosProduto,
  buscarProdutoDetalhePublico,
  buscarRelacionadosProduto,
} from "@/lib/loja/produto-detalhe";
import {
  criarDescricaoProduto,
  criarJsonLdProduto,
  criarMetadataLoja,
  getImagemPrincipalProduto,
} from "@/lib/loja/seo";
import {
  buscarConteudoPublicadoSistema,
} from "@/lib/loja/conteudo/repository.server";
import { extrairSeoConteudo } from "@/lib/loja/conteudo/contracts";

export const dynamic = "force-dynamic";

function aplicarModeloSeoProduto(
  value: string,
  produto: { id: string; nome: string; categoria: string },
) {
  return value
    .replaceAll("{produto}", produto.nome)
    .replaceAll("{categoria}", produto.categoria)
    .replaceAll("{id}", produto.id)
    .replaceAll("{marca}", "Stella Colari")
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [produtoDetalhe, conteudoGlobal] = await Promise.all([
    buscarProdutoDetalhePublico(id),
    buscarConteudoPublicadoSistema({ tipo: "PRODUTO_GLOBAL" }),
  ]);

  if (!produtoDetalhe) {
    return criarMetadataLoja({
      title: "Produto | Stella Colari",
      path: `/loja/produto/${id}`,
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  const produto = produtoDetalhe.produto;
  const seo = conteudoGlobal
    ? extrairSeoConteudo(conteudoGlobal.conteudo)
    : null;

  return criarMetadataLoja({
    title: seo?.title
      ? aplicarModeloSeoProduto(seo.title, produto)
      : `${produto.nome} | Stella Colari`,
    description: seo?.description
      ? aplicarModeloSeoProduto(seo.description, produto)
      : criarDescricaoProduto(produto),
    path: `/loja/produto/${produto.id}`,
    image: seo?.image || getImagemPrincipalProduto(produto),
    robots: seo?.noindex
      ? { index: false, follow: true }
      : undefined,
  });
}

export default async function ProdutoLojaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const produtoDetalhe = await buscarProdutoDetalhePublico(id);

  if (!produtoDetalhe) {
    notFound();
  }

  const categoriaProduto = await prisma.categoriaProduto.findFirst({
    where: {
      nome: produtoDetalhe.produtoRaw.categoria,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
    },
  });

  const [
    menusPublicos,
    categoriasMenu,
    configuracaoMenuRodape,
    garantiaRaw,
    relacionados,
    descontos,
    opcoesAdicionaisRaw,
    embalagensPresente,
    conteudoGlobal,
  ] = await Promise.all([
    buscarMenusPublicos(),

    buscarCategoriasMenuPublico(),

    buscarConfiguracaoMenuRodape(),

    prisma.lojaTextoInstitucional.findUnique({
      where: {
        chave: "garantia-produto",
      },
      select: {
        titulo: true,
        conteudo: true,
      },
    }),

    buscarRelacionadosProduto({
      produtoId: id,
      categoria: produtoDetalhe.produtoRaw.categoria,
    }),

    buscarDescontosProduto({
      produtoId: id,
    }),

    categoriaProduto
      ? prisma.categoriaOpcaoAdicional.findMany({
          where: {
            categoriaId: categoriaProduto.id,
            ativo: true,
          },
          orderBy: {
            criadoEm: "asc",
          },
          select: {
            id: true,
            nome: true,
            descricao: true,
            valorVenda: true,
          },
        })
      : Promise.resolve([]),

    buscarEmbalagensPresentePublicas({
      produto: {
        id: produtoDetalhe.produtoRaw.id,
        categoria: produtoDetalhe.produtoRaw.categoria,
        embalagemClasseId: produtoDetalhe.produtoRaw.embalagemClasseId,
        permiteEmbalagemPresente:
          produtoDetalhe.produtoRaw.permiteEmbalagemPresente,
        embalagemPresentePadraoId:
          produtoDetalhe.produtoRaw.embalagemPresentePadraoId,
      },
      categoriaId: categoriaProduto?.id || null,
    }),

    buscarConteudoPublicadoSistema({ tipo: "PRODUTO_GLOBAL" }),
  ]);

  const menus: ProdutoLojaMenuItem[] = menusPublicos.map((menu) => ({
    id: menu.id,
    nome: menu.nome,
    href: menu.href,
  }));

  const opcoesAdicionais: ProdutoLojaOpcaoAdicional[] =
    opcoesAdicionaisRaw.map((opcao) => ({
      id: opcao.id,
      nome: opcao.nome,
      descricao: opcao.descricao,
      valorVenda: Number(opcao.valorVenda || 0),
    }));

  const produto = {
    ...produtoDetalhe.produto,
    opcoesAdicionais,
    embalagensPresente,
    embalagemPresentePadraoId: produtoDetalhe.produtoRaw.embalagemPresentePadraoId,
    garantia: {
      titulo: garantiaRaw?.titulo || produtoDetalhe.produto.garantia.titulo,
      conteudo:
        garantiaRaw?.conteudo || produtoDetalhe.produto.garantia.conteudo,
    },
  };
  const produtoJsonLd = criarJsonLdProduto(produtoDetalhe.produto);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(produtoJsonLd) }}
      />
      <ProdutoLojaClient
        produto={produto}
        menus={menus}
        categoriasMenu={categoriasMenu}
        configuracaoMenuRodape={configuracaoMenuRodape}
        relacionados={relacionados}
        descontos={descontos}
        conteudoGlobal={
          conteudoGlobal
            ? {
                pagina: {
                  titulo: conteudoGlobal.pagina.titulo,
                  slug: conteudoGlobal.pagina.slug,
                  tipo: conteudoGlobal.pagina.tipo,
                },
                contrato: conteudoGlobal.publico.contrato,
                conteudo: conteudoGlobal.publico.conteudo,
                produtos: relacionados,
              }
            : undefined
        }
      />
    </>
  );
}
