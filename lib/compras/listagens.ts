import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { LancamentoFinanceiroListItem } from "@/components/compras/ComprasEGastosClient";
import type { CompraListItem } from "@/components/compras/ComprasListClient";

type CompraComItens = Prisma.CompraGetPayload<{
  include: {
    itens: {
      include: {
        produto: {
          select: {
            imagemUrl: true;
            imagens: {
              orderBy: {
                ordem: "asc";
              };
              select: {
                imagemUrl: true;
              };
              take: 1;
            };
          };
        };
        itemAdicional: {
          select: {
            imagemUrl: true;
          };
        };
      };
    };
  };
}>;

function mapearCompra(compra: CompraComItens): CompraListItem {
  const itens = compra.itens.map((item) => ({
    id: item.id,
    tipoItem: item.tipoItem,
    codigoDigitado: item.codigoDigitado,
    descricao: item.descricao,
    imagemUrl:
      item.produto?.imagens[0]?.imagemUrl ??
      item.produto?.imagemUrl ??
      item.itemAdicional?.imagemUrl ??
      null,
    quantidade: item.quantidade,
    tamanhoAnel: item.tamanhoAnel,
    valorUnitarioBase: Number(item.valorUnitarioBase),
    valorUnitarioFinal: Number(item.valorUnitarioFinal),
    valorTotalBase: Number(item.valorTotalBase),
    valorTotalFinal: Number(item.valorTotalFinal),
    parcelaFrete: Number(item.parcelaFrete),
    valorTotalComFrete: Number(item.valorTotalComFrete),
  }));

  const quantidadeItens = compra.itens.reduce(
    (total: number, item) => total + item.quantidade,
    0
  );

  return {
    id: compra.id,
    codigo: compra.codigo,
    fornecedor: compra.fornecedor,
    descontoPercentual: Number(compra.descontoPercentual),
    frete: Number(compra.frete),
    valorTotalBruto: Number(compra.valorTotalBruto),
    valorTotalFinal: Number(compra.valorTotalFinal),
    observacoes: compra.observacoes,
    status: compra.status,
    cancelamentoMotivo: compra.cancelamentoMotivo,
    cancelamentoObservacao: compra.cancelamentoObservacao,
    canceladoEm: compra.canceladoEm ? compra.canceladoEm.toISOString() : null,
    criadoEm: compra.criadoEm.toISOString(),
    itensTotais: compra.itens.length,
    quantidadeItens,
    itens,
  };
}

function mapearLancamento(
  lancamento: Awaited<ReturnType<typeof buscarLancamentosFinanceirosRaw>>[number]
): LancamentoFinanceiroListItem {
  return {
    id: lancamento.id,
    codigo: lancamento.codigo,
    tipo: lancamento.tipo,
    categoria: lancamento.categoria,
    titulo: lancamento.titulo,
    descricao: lancamento.descricao,
    fornecedorParceiro: lancamento.fornecedorParceiro,
    valorPrevisto:
      lancamento.valorPrevisto === null ? null : Number(lancamento.valorPrevisto),
    valorReal: Number(lancamento.valorReal),
    statusPagamento: lancamento.statusPagamento,
    statusOperacional: lancamento.statusOperacional,
    dataCompetencia: lancamento.dataCompetencia
      ? lancamento.dataCompetencia.toISOString()
      : null,
    dataVencimento: lancamento.dataVencimento
      ? lancamento.dataVencimento.toISOString()
      : null,
    dataPagamento: lancamento.dataPagamento
      ? lancamento.dataPagamento.toISOString()
      : null,
    recorrente: lancamento.recorrente,
    recorrencia: lancamento.recorrencia,
    quantidadeParcelas: lancamento.quantidadeParcelas,
    parcelaAtual: lancamento.parcelaAtual,
    meioPagamento: lancamento.meioPagamento,
    origemTipo: lancamento.origemTipo,
    origemId: lancamento.origemId,
    observacoes: lancamento.observacoes,
    linkReferencia: lancamento.linkReferencia,
    anexoUrl: lancamento.anexoUrl,
    status: lancamento.status,
    statusAntesLixeira: lancamento.statusAntesLixeira,
    criadoEm: lancamento.criadoEm.toISOString(),
  };
}

function buscarComprasRaw() {
  return prisma.compra.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      itens: {
        include: {
          produto: {
            select: {
              imagemUrl: true,
              imagens: {
                orderBy: {
                  ordem: "asc",
                },
                select: {
                  imagemUrl: true,
                },
                take: 1,
              },
            },
          },
          itemAdicional: {
            select: {
              imagemUrl: true,
            },
          },
        },
      },
    },
  });
}

function buscarLancamentosFinanceirosRaw() {
  return prisma.lancamentoFinanceiro.findMany({
    orderBy: [{ dataVencimento: "asc" }, { criadoEm: "desc" }],
  });
}

export async function buscarComprasEstoqueListagem() {
  const comprasRaw = await buscarComprasRaw();
  return comprasRaw.map(mapearCompra);
}

export async function buscarLancamentosFinanceirosListagem() {
  const lancamentosRaw = await buscarLancamentosFinanceirosRaw();
  return lancamentosRaw.map(mapearLancamento);
}
