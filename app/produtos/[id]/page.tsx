import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarProduto } from "../actions";
import EditarProdutoClient from "@/components/produtos/EditarProdutoClient";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [produto, categorias, produtosDisponiveisKit, regrasAdicionais] =
    await Promise.all([
      prisma.produto.findUnique({
        where: { id },
        include: {
          imagens: {
            orderBy: {
              ordem: "asc",
            },
          },
          categoriasProduto: {
            include: {
              categoria: {
                select: {
                  id: true,
                  nome: true,
                  slug: true,
                  categoriaMaeId: true,
                },
              },
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          componentesDoKit: {
            select: {
              componenteProdutoId: true,
              quantidade: true,
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          variacoes: {
            orderBy: {
              ordem: "asc",
            },
            include: {
              opcoes: {
                orderBy: {
                  ordem: "asc",
                },
              },
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
          descricao: true,
          imagemUrl: true,
          exibirNoMenu: true,
          ordemMenu: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),

      prisma.produto.findMany({
        where: {
          id: {
            not: id,
          },
          status: {
            not: "NA_LIXEIRA",
          },
          tipoProduto: "UNITARIO",
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          tipoProduto: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),

      prisma.regraCategoria.findMany({
        where: {
          itemAdicional: {
            ativo: true,
            status: {
              not: "NA_LIXEIRA",
            },
          },
        },
        select: {
          id: true,
          categoria: true,
          quantidade: true,
          itemAdicional: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              custoBase: true,
            },
          },
        },
        orderBy: [{ categoria: "asc" }, { criadoEm: "asc" }],
      }),
    ]);

  if (!produto) {
    notFound();
  }

  const actionAtualizar = atualizarProduto.bind(null, produto.id);

  const imagensIniciais =
    produto.imagens.length > 0
      ? produto.imagens.map((imagem) => ({
          id: imagem.id,
          imagemUrl: imagem.imagemUrl,
        }))
      : [produto.imagemUrl, produto.imagemHoverUrl]
          .filter(Boolean)
          .map((imagemUrl) => ({
            imagemUrl: imagemUrl as string,
          }));

  const categoriaPrincipalRelacao =
    produto.categoriasProduto.find((relacao) => relacao.principal) ??
    produto.categoriasProduto[0] ??
    null;

  const categoriaPrincipalInicialId =
    categoriaPrincipalRelacao?.categoriaId ?? "";

  const categoriasSelecionadasIniciaisIds = produto.categoriasProduto.map(
    (relacao) => relacao.categoriaId
  );

  const componentesKitIniciais = produto.componentesDoKit.map((componente) => ({
    componenteProdutoId: componente.componenteProdutoId,
    quantidade: componente.quantidade,
  }));

  const variacoesIniciais = produto.variacoes.map((variacao) => ({
    id: variacao.id,
    nome: variacao.nome,
    obrigatoria: variacao.obrigatoria,
    opcoes: variacao.opcoes.map((opcao) => ({
      id: opcao.id,
      nome: opcao.nome,
      imagemUrl: opcao.imagemUrl,
      precoAdicional: Number(opcao.precoAdicional || 0),
      custoAdicional: Number(opcao.custoAdicional || 0),
      ativo: Boolean(opcao.ativo),
      ordem: Number(opcao.ordem || 0),
    })),
  }));

  const produtosKitSerializados = produtosDisponiveisKit.map((produtoKit) => ({
    ...produtoKit,
    custoBase: Number(produtoKit.custoBase || 0),
  }));

  const regrasAdicionaisSerializadas = regrasAdicionais.map((regra) => ({
    id: regra.id,
    categoria: regra.categoria,
    quantidade: Number(regra.quantidade || 0),
    itemAdicional: {
      id: regra.itemAdicional.id,
      codigoInterno: regra.itemAdicional.codigoInterno,
      nome: regra.itemAdicional.nome,
      custoBase: Number(regra.itemAdicional.custoBase || 0),
    },
  }));

  const produtoSerializado = {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    codigoFornecedor: produto.codigoFornecedor || "",
    nome: produto.nome,
    fornecedorPadrao: produto.fornecedorPadrao,
    custoBase: Number(produto.custoBase || 0),
    margemAplicada: Number(produto.margemAplicada || 0),
    precoVenda: Number(produto.precoVenda || 0),
    descontoAtivo: Boolean(produto.descontoAtivo),
    precoPromocional:
      produto.precoPromocional !== null &&
      produto.precoPromocional !== undefined
        ? Number(produto.precoPromocional)
        : null,
    descricaoLoja: produto.descricaoLoja || "",
    linkCompra: produto.linkCompra || "",
    observacoes: produto.observacoes || "",
    tipoProduto: produto.tipoProduto,
    ativo: Boolean(produto.ativo),
  };

  return (
    <EditarProdutoClient
      produto={produtoSerializado}
      categorias={categorias}
      produtosDisponiveisKit={produtosKitSerializados}
      regrasAdicionais={regrasAdicionaisSerializadas}
      imagensIniciais={imagensIniciais}
      categoriaPrincipalInicialId={categoriaPrincipalInicialId}
      categoriasSelecionadasIniciaisIds={categoriasSelecionadasIniciaisIds}
      componentesKitIniciais={componentesKitIniciais}
      variacoesIniciais={variacoesIniciais}
      atualizarProdutoAction={actionAtualizar}
    />
  );
}