import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProdutoLojaClient, {
  type ProdutoLojaMenuItem,
  type ProdutoLojaOpcaoAdicional,
} from "@/components/loja/ProdutoLojaClient";
import { buscarCategoriasMenuPublico } from "@/lib/loja/categorias";
import { buscarMenusPublicos } from "@/lib/loja/menu";
import { buscarEmbalagensPresentePublicas } from "@/lib/embalagens/presente-loja";
import {
  buscarDescontosProduto,
  buscarProdutoDetalhePublico,
  buscarRelacionadosProduto,
} from "@/lib/loja/produto-detalhe";

export const metadata: Metadata = {
  title: "Produto | Loja Stella",
};

export const dynamic = "force-dynamic";

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
    garantiaRaw,
    relacionados,
    descontos,
    opcoesAdicionaisRaw,
    embalagensPresente,
  ] = await Promise.all([
    buscarMenusPublicos(),

    buscarCategoriasMenuPublico(),

    prisma.lojaTextoInstitucional.findUnique({
      where: {
        chave: "garantia-produto",
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
          include: {
            itemPadraoSubstituido: {
              select: {
                id: true,
                nome: true,
                codigoInterno: true,
                custoBase: true,
              },
            },
            itemAdicionalConsumido: {
              select: {
                id: true,
                nome: true,
                codigoInterno: true,
                custoBase: true,
              },
            },
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

      itemPadraoSubstituidoId: opcao.itemPadraoSubstituidoId,
      itemPadraoSubstituidoNome: opcao.itemPadraoSubstituido?.nome || null,

      itemAdicionalConsumidoId: opcao.itemAdicionalConsumidoId,
      itemAdicionalConsumidoNome: opcao.itemAdicionalConsumido.nome,
      custoUnitario: Number(opcao.itemAdicionalConsumido.custoBase || 0),
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

  return (
    <ProdutoLojaClient
      produto={produto}
      menus={menus}
      categoriasMenu={categoriasMenu}
      relacionados={relacionados}
      descontos={descontos}
    />
  );
}
