import { prisma } from "@/lib/prisma";
import NovaCompraV2Client from "@/components/compras/NovaCompraV2Client";

export const dynamic = "force-dynamic";

export default async function NovaCompraV2Page() {
  const produtos = await prisma.produto.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: { nome: "asc" },
  });

  const itensAdicionais = await prisma.itemAdicional.findMany({
    where: {
      ativo: true,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    orderBy: { nome: "asc" },
  });

  const itensBusca = [
    ...produtos.map((produto) => ({
      id: produto.id,
      tipo: "produto" as const,
      codigoInterno: produto.codigoInterno,
      codigoFornecedor: produto.codigoFornecedor || "",
      nome: produto.nome,
      custoBase: Number(produto.custoBase),
      fornecedorPadrao: produto.fornecedorPadrao,
      categoria: produto.categoria,
    })),
    ...itensAdicionais.map((item) => ({
      id: item.id,
      tipo: "adicional" as const,
      codigoInterno: item.codigoInterno,
      codigoFornecedor: item.codigoFornecedor || "",
      nome: item.nome,
      custoBase: Number(item.custoBase),
      fornecedorPadrao: item.fornecedorPadrao,
      categoria: "",
    })),
  ];

  return <NovaCompraV2Client itensBusca={itensBusca} />;
}