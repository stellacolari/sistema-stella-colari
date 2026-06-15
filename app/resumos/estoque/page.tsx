import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ResumoEstoqueClient, {
  type ResumoEstoqueItem,
} from "@/components/resumos/estoque/ResumoEstoqueClient";

export const metadata: Metadata = {
  title: "Relatório de Estoque | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type EstoqueProdutoComProduto = Prisma.EstoqueProdutoGetPayload<{
  include: {
    produto: true;
  };
}>;

type EstoqueAdicionalComItem = Prisma.EstoqueAdicionalGetPayload<{
  include: {
    itemAdicional: true;
  };
}>;

function situacaoEstoque(quantidade: number) {
  if (quantidade <= 0) return "ZERADO";
  if (quantidade <= 5) return "REPOR";
  if (quantidade <= 10) return "ATENCAO";
  return "OK";
}

export default async function ResumoEstoquePage() {
  const [estoqueProdutosRaw, estoqueAdicionaisRaw] = await Promise.all([
    prisma.estoqueProduto.findMany({
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
    }),

    prisma.estoqueAdicional.findMany({
      include: {
        itemAdicional: true,
      },
      orderBy: {
        itemAdicional: {
          nome: "asc",
        },
      },
    }),
  ]);

  const produtos: ResumoEstoqueItem[] = estoqueProdutosRaw.map(
    (estoque: EstoqueProdutoComProduto) => ({
      id: estoque.id,
      cadastroId: estoque.produto.id,
      tipo: "PRODUTO",
      codigo: estoque.produto.codigoInterno,
      codigoFornecedor: estoque.produto.codigoFornecedor,
      nome: estoque.produto.nome,
      categoria: estoque.produto.categoria,
      fornecedor: estoque.produto.fornecedorPadrao,
      tamanhoAnel:
        estoque.tamanhoAnel && estoque.tamanhoAnel !== "UNICO"
          ? estoque.tamanhoAnel
          : null,
      quantidadeAtual: estoque.quantidadeAtual,
      valorAcumulado: Number(estoque.valorAcumulado),
      custoMedio: Number(estoque.custoMedio),
      custoBase: Number(estoque.produto.custoBase),
      precoVenda: Number(estoque.produto.precoVenda),
      margemAplicada: Number(estoque.produto.margemAplicada),
      statusCadastro:
        estoque.produto.status || (estoque.produto.ativo ? "ATIVO" : "INATIVO"),
      ativo: estoque.produto.ativo,
      situacao: situacaoEstoque(estoque.quantidadeAtual),
      atualizadoEm: estoque.atualizadoEm.toISOString(),
    })
  );

  const adicionais: ResumoEstoqueItem[] = estoqueAdicionaisRaw.map(
    (estoque: EstoqueAdicionalComItem) => ({
      id: estoque.id,
      cadastroId: estoque.itemAdicional.id,
      tipo: "ADICIONAL",
      codigo: estoque.itemAdicional.codigoInterno,
      codigoFornecedor: estoque.itemAdicional.codigoFornecedor,
      nome: estoque.itemAdicional.nome,
      categoria: null,
      fornecedor: estoque.itemAdicional.fornecedorPadrao,
      tamanhoAnel: null,
      quantidadeAtual: estoque.quantidadeAtual,
      valorAcumulado: Number(estoque.valorAcumulado),
      custoMedio: Number(estoque.custoMedio),
      custoBase: Number(estoque.itemAdicional.custoBase),
      precoVenda: null,
      margemAplicada: null,
      statusCadastro:
        estoque.itemAdicional.status ||
        (estoque.itemAdicional.ativo ? "ATIVO" : "INATIVO"),
      ativo: estoque.itemAdicional.ativo,
      situacao: situacaoEstoque(estoque.quantidadeAtual),
      atualizadoEm: estoque.atualizadoEm.toISOString(),
    })
  );

  const itens = [...produtos, ...adicionais];

  return <ResumoEstoqueClient itens={itens} />;
}
