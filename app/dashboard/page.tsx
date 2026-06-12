import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import DashboardClient, {
  type DashboardData,
  type DashboardMovimentacaoItem,
  type DashboardStatusItem,
  type DashboardEstoqueAlertaItem,
} from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type VendaResumo = Prisma.VendaGetPayload<{
  include: {
    itens: true;
  };
}>;

type CompraResumo = Prisma.CompraGetPayload<{
  include: {
    itens: true;
  };
}>;

type ClienteResumo = Prisma.ClienteGetPayload<object>;

type EstoqueProdutoResumo = Prisma.EstoqueProdutoGetPayload<{
  include: {
    produto: true;
  };
}>;

type EstoqueAdicionalResumo = Prisma.EstoqueAdicionalGetPayload<{
  include: {
    itemAdicional: true;
  };
}>;

type MovimentacaoResumo = Prisma.MovimentacaoGetPayload<object>;

type PedidoOnlineResumo = Prisma.PedidoOnlineGetPayload<{
  include: {
    itens: true;
  };
}>;

function getStatusLabel(status: string) {
  if (status === "VENDA_FINALIZADA") return "Venda finalizada";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "ENVIADA") return "Enviada";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "CANCELADA") return "Cancelada";
  if (status === "NA_LIXEIRA") return "Na lixeira";
  return status.replaceAll("_", " ");
}

function getTipoMovimentacaoLabel(tipo: string) {
  if (tipo === "ENTRADA") return "Entrada";
  if (tipo === "SAÍDA") return "Saída";
  if (tipo === "SAIDA") return "Saída";
  if (tipo === "ESTORNO_VENDA") return "Estorno de venda";
  if (tipo === "ESTORNO_COMPRA") return "Estorno de compra";
  return tipo.replaceAll("_", " ");
}

export default async function DashboardPage() {
  const [
    vendasRaw,
    comprasRaw,
    clientesRaw,
    estoqueProdutosRaw,
    estoqueAdicionaisRaw,
    movimentacoesRaw,
    pedidosOnlineRaw,
  ] = await Promise.all([
    prisma.venda.findMany({
      include: {
        itens: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
    }),

    prisma.compra.findMany({
      include: {
        itens: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
    }),

    prisma.cliente.findMany({
      orderBy: {
        criadoEm: "desc",
      },
    }),

    prisma.estoqueProduto.findMany({
      include: {
        produto: true,
      },
      orderBy: {
        quantidadeAtual: "asc",
      },
    }),

    prisma.estoqueAdicional.findMany({
      include: {
        itemAdicional: true,
      },
      orderBy: {
        quantidadeAtual: "asc",
      },
    }),

    prisma.movimentacao.findMany({
      orderBy: {
        criadoEm: "desc",
      },
      take: 8,
    }),

    prisma.pedidoOnline.findMany({
      where: {
        origemCanal: "LOJA_STELLA",
        statusPagamento: "PAGO",
        status: {
          not: "CANCELADO",
        },
      },
      include: {
        itens: true,
      },
      orderBy: {
        pagoEm: "desc",
      },
    }),
  ]);

  const vendas = vendasRaw as VendaResumo[];
  const compras = comprasRaw as CompraResumo[];
  const clientes = clientesRaw as ClienteResumo[];
  const estoqueProdutos = estoqueProdutosRaw as EstoqueProdutoResumo[];
  const estoqueAdicionais = estoqueAdicionaisRaw as EstoqueAdicionalResumo[];
  const movimentacoes = movimentacoesRaw as MovimentacaoResumo[];
  const pedidosOnline = pedidosOnlineRaw as PedidoOnlineResumo[];
  const pedidoOnlineIds = pedidosOnline.map((pedido) => pedido.id);
  const movimentacoesPedidosOnline =
    pedidoOnlineIds.length > 0
      ? await prisma.movimentacao.findMany({
          where: {
            origemId: {
              in: pedidoOnlineIds,
            },
            status: "ATIVA",
          },
        })
      : [];

  const vendasOperacionais = vendas.filter(
    (venda) => venda.status !== "CANCELADA" && venda.status !== "NA_LIXEIRA"
  );

  const comprasOperacionais = compras.filter(
    (compra) => compra.status !== "CANCELADA" && compra.status !== "NA_LIXEIRA"
  );

  const clientesAtivos = clientes.filter(
    (cliente) => cliente.status !== "NA_LIXEIRA"
  );

  const totalVendidoVendas = vendasOperacionais.reduce(
    (total: number, venda) => total + Number(venda.valorTotal),
    0
  );

  const lucroTotalVendas = vendasOperacionais.reduce(
    (total: number, venda) => total + Number(venda.lucroTotal),
    0
  );

  const gastoTotalVendasInternas = vendasOperacionais.reduce(
    (total: number, venda) => total + Number(venda.gastoTotal),
    0
  );

  const totalPedidosOnlinePagos = pedidosOnline.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0
  );

  const gastoPedidosOnlinePagos = movimentacoesPedidosOnline.reduce(
    (total, movimentacao) => total + Number(movimentacao.custo || 0),
    0
  );

  const totalVendido = totalVendidoVendas + totalPedidosOnlinePagos;
  const gastoTotalVendas =
    gastoTotalVendasInternas + gastoPedidosOnlinePagos;
  const lucroTotal =
    lucroTotalVendas + (totalPedidosOnlinePagos - gastoPedidosOnlinePagos);

  const totalComprado = comprasOperacionais.reduce(
    (total: number, compra) => total + Number(compra.valorTotalFinal),
    0
  );

  const quantidadeItensVendidosVendas = vendasOperacionais.reduce(
    (total: number, venda) =>
      total +
      venda.itens.reduce(
        (subtotal: number, item) => subtotal + item.quantidade,
        0
      ),
    0
  );

  const quantidadeItensPedidosOnline = pedidosOnline.reduce(
    (total, pedido) =>
      total +
      pedido.itens.reduce((subtotal, item) => subtotal + item.quantidade, 0),
    0
  );

  const quantidadeItensVendidos =
    quantidadeItensVendidosVendas + quantidadeItensPedidosOnline;

  const quantidadeItensComprados = comprasOperacionais.reduce(
    (total: number, compra) =>
      total +
      compra.itens.reduce(
        (subtotal: number, item) => subtotal + item.quantidade,
        0
      ),
    0
  );

  const valorEstoqueProdutos = estoqueProdutos.reduce(
    (total: number, estoque) => total + Number(estoque.valorAcumulado),
    0
  );

  const valorEstoqueAdicionais = estoqueAdicionais.reduce(
    (total: number, estoque) => total + Number(estoque.valorAcumulado),
    0
  );

  const quantidadeProdutosEmEstoque = estoqueProdutos.reduce(
    (total: number, estoque) => total + estoque.quantidadeAtual,
    0
  );

  const quantidadeAdicionaisEmEstoque = estoqueAdicionais.reduce(
    (total: number, estoque) => total + estoque.quantidadeAtual,
    0
  );

  const estoqueProdutosBaixo = estoqueProdutos.filter(
    (estoque) => estoque.quantidadeAtual <= 5
  );

  const estoqueAdicionaisBaixo = estoqueAdicionais.filter(
    (estoque) => estoque.quantidadeAtual <= 5
  );

  const alertasEstoque: DashboardEstoqueAlertaItem[] = [
    ...estoqueProdutosBaixo.map((estoque) => ({
      id: estoque.id,
      tipo: "Produto",
      codigo: estoque.produto.codigoInterno,
      nome:
        estoque.tamanhoAnel && estoque.tamanhoAnel !== "UNICO"
          ? `${estoque.produto.nome} · Tam. ${estoque.tamanhoAnel}`
          : estoque.produto.nome,
      quantidadeAtual: estoque.quantidadeAtual,
      valorAcumulado: Number(estoque.valorAcumulado),
      situacao:
        estoque.quantidadeAtual <= 0
          ? "ZERADO"
          : estoque.quantidadeAtual <= 5
            ? "REPOR"
            : "OK",
    })),
    ...estoqueAdicionaisBaixo.map((estoque) => ({
      id: estoque.id,
      tipo: "Item adicional",
      codigo: estoque.itemAdicional.codigoInterno,
      nome: estoque.itemAdicional.nome,
      quantidadeAtual: estoque.quantidadeAtual,
      valorAcumulado: Number(estoque.valorAcumulado),
      situacao:
        estoque.quantidadeAtual <= 0
          ? "ZERADO"
          : estoque.quantidadeAtual <= 5
            ? "REPOR"
            : "OK",
    })),
  ]
    .sort((a, b) => a.quantidadeAtual - b.quantidadeAtual)
    .slice(0, 10);

  const vendasPorStatusMap = new Map<string, number>();

  vendas.forEach((venda) => {
    vendasPorStatusMap.set(
      venda.status,
      (vendasPorStatusMap.get(venda.status) ?? 0) + 1
    );
  });

  const vendasPorStatus: DashboardStatusItem[] = Array.from(
    vendasPorStatusMap.entries()
  ).map(([status, quantidade]) => ({
    status,
    label: getStatusLabel(status),
    quantidade,
  }));

  const ultimasMovimentacoes: DashboardMovimentacaoItem[] = movimentacoes.map(
    (movimentacao) => ({
      id: movimentacao.id,
      codigoMovimentacao: movimentacao.codigoMovimentacao,
      tipoMovimentacao: movimentacao.tipoMovimentacao,
      tipoMovimentacaoLabel: getTipoMovimentacaoLabel(
        movimentacao.tipoMovimentacao
      ),
      origemTipo: movimentacao.origemTipo,
      codigoItem: movimentacao.codigoItem,
      itemTipo: movimentacao.itemTipo,
      quantidade: movimentacao.quantidade,
      tamanhoAnel: movimentacao.tamanhoAnel,
      custo: Number(movimentacao.custo),
      faturamento: Number(movimentacao.faturamento),
      criadoEm: movimentacao.criadoEm.toISOString(),
      status: movimentacao.status,
    })
  );

  const dashboardData: DashboardData = {
    cards: {
      totalVendido,
      lucroTotal,
      gastoTotalVendas,
      totalComprado,
      clientesAtivos: clientesAtivos.length,
      vendasAtivas: vendasOperacionais.length + pedidosOnline.length,
      pedidosOnlinePagos: pedidosOnline.length,
      totalPedidosOnlinePagos,
      comprasAtivas: comprasOperacionais.length,
      quantidadeItensVendidos,
      quantidadeItensComprados,
      quantidadeProdutosEmEstoque,
      quantidadeAdicionaisEmEstoque,
      valorEstoqueProdutos,
      valorEstoqueAdicionais,
      alertasEstoque: alertasEstoque.length,
    },
    vendasPorStatus,
    alertasEstoque,
    ultimasMovimentacoes,
  };

  return <DashboardClient data={dashboardData} />;
}
