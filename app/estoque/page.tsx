import { prisma } from "@/lib/prisma";
import EstoqueTablesClient from "@/components/estoque/EstoqueTablesClient";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const estoqueProdutosRaw = await prisma.estoqueProduto.findMany({
    include: {
      produto: true,
    },
    orderBy: [
      {
        produto: {
          nome: "asc",
        },
      },
      {
        tamanhoAnel: "asc",
      },
    ],
  });

  const estoqueAdicionaisRaw = await prisma.estoqueAdicional.findMany({
    include: {
      itemAdicional: true,
    },
    orderBy: {
      atualizadoEm: "desc",
    },
  });

  const produtos = estoqueProdutosRaw.map((item) => ({
    id: item.id,
    cadastroId: item.produto.id,
    tipo: "produto" as const,
    codigo: item.produto.codigoInterno,
    codigoFornecedor: item.produto.codigoFornecedor || "",
    nome: item.produto.nome,
    imagemUrl: item.produto.imagemUrl,
    categoria: item.produto.categoria,
    fornecedorPadrao: item.produto.fornecedorPadrao,
    precoVenda: Number(item.produto.precoVenda),
    custoBase: Number(item.produto.custoBase),
    margemAplicada: Number(item.produto.margemAplicada),
    linkCompra: item.produto.linkCompra,
    statusCadastro: item.produto.status || (item.produto.ativo ? "ATIVO" : "INATIVO"),
    ativo: item.produto.ativo,
    tamanhoAnel: item.tamanhoAnel,
    quantidadeAtual: item.quantidadeAtual,
    valorAcumulado: Number(item.valorAcumulado),
    custoMedio: Number(item.custoMedio),
    atualizadoEm: item.atualizadoEm.toISOString(),
  }));

  const adicionais = estoqueAdicionaisRaw.map((item) => ({
    id: item.id,
    cadastroId: item.itemAdicional.id,
    tipo: "adicional" as const,
    codigo: item.itemAdicional.codigoInterno,
    codigoFornecedor: item.itemAdicional.codigoFornecedor || "",
    nome: item.itemAdicional.nome,
    imagemUrl: item.itemAdicional.imagemUrl,
    fornecedorPadrao: item.itemAdicional.fornecedorPadrao,
    custoBase: Number(item.itemAdicional.custoBase),
    linkCompra: item.itemAdicional.linkCompra,
    statusCadastro:
      item.itemAdicional.status || (item.itemAdicional.ativo ? "ATIVO" : "INATIVO"),
    ativo: item.itemAdicional.ativo,
    quantidadeAtual: item.quantidadeAtual,
    valorAcumulado: Number(item.valorAcumulado),
    custoMedio: Number(item.custoMedio),
    atualizadoEm: item.atualizadoEm.toISOString(),
  }));

  return <EstoqueTablesClient produtos={produtos} adicionais={adicionais} />;
}