import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  criarAlertaOperacional,
  type PedidoAlertaOperacional,
} from "@/lib/pedidos/alertas-operacionais";

type BaixarComponentesPlanoParams = {
  tx: Prisma.TransactionClient;
  pedidoOnlineId: string;
  origem?: string;
  baixadoPor?: string | null;
};

type ComponenteBaixado = {
  codigoItem: string;
  nomeItem: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
};

function calcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

function quantidadeInteira(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.ceil(value);
}

async function baixarComponente({
  tx,
  itemAdicionalId,
  quantidade,
  nomePlano,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  nomePlano: string;
}): Promise<ComponenteBaixado> {
  const estoque = await tx.estoqueAdicional.findUnique({
    where: {
      itemAdicionalId,
    },
    include: {
      itemAdicional: {
        select: {
          codigoInterno: true,
          nome: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  if (!estoque) {
    throw new Error(`Componente sem estoque cadastrado: ${nomePlano}`);
  }

  if (
    !estoque.itemAdicional.ativo ||
    estoque.itemAdicional.status === "NA_LIXEIRA"
  ) {
    throw new Error(`Componente indisponivel: ${estoque.itemAdicional.nome}`);
  }

  if (estoque.quantidadeAtual < quantidade) {
    throw new Error(
      `Saldo insuficiente do componente ${estoque.itemAdicional.nome}. Necessario: ${quantidade}. Saldo atual: ${estoque.quantidadeAtual}.`,
    );
  }

  const custoUnitario = Number(estoque.custoMedio || 0);
  const custoTotal = custoUnitario * quantidade;
  const baixa = await tx.estoqueAdicional.updateMany({
    where: {
      id: estoque.id,
      quantidadeAtual: {
        gte: quantidade,
      },
    },
    data: {
      quantidadeAtual: {
        decrement: quantidade,
      },
      valorAcumulado: {
        decrement: custoTotal,
      },
    },
  });

  if (baixa.count !== 1) {
    throw new Error(
      `Saldo alterado durante o pagamento: ${estoque.itemAdicional.nome}.`,
    );
  }

  const estoqueAtualizado = await tx.estoqueAdicional.findUniqueOrThrow({
    where: {
      id: estoque.id,
    },
    select: {
      quantidadeAtual: true,
      valorAcumulado: true,
    },
  });
  const valorSeguro = Math.max(
    Number(estoqueAtualizado.valorAcumulado || 0),
    0,
  );

  await tx.estoqueAdicional.update({
    where: {
      id: estoque.id,
    },
    data: {
      valorAcumulado: valorSeguro,
      custoMedio: calcularCustoMedio(
        valorSeguro,
        estoqueAtualizado.quantidadeAtual,
      ),
    },
  });

  return {
    codigoItem: estoque.itemAdicional.codigoInterno,
    nomeItem: estoque.itemAdicional.nome,
    quantidade,
    custoUnitario,
    custoTotal,
  };
}

export async function baixarComponentesPlanoEmbalagem({
  tx,
  pedidoOnlineId,
  origem = "PAGAMENTO_APROVADO",
  baixadoPor = "Sistema",
}: BaixarComponentesPlanoParams) {
  const bloqueio = await tx.pedidoEmbalagemPlano.updateMany({
    where: {
      pedidoOnlineId,
      status: {
        notIn: ["PROCESSANDO_BAIXA", "BAIXADO", "BAIXA_PARCIAL"],
      },
    },
    data: {
      status: "PROCESSANDO_BAIXA",
      baixaOrigem: origem,
      baixadoPor,
      erroBaixa: null,
    },
  });

  if (bloqueio.count === 0) {
    const planoAtual = await tx.pedidoEmbalagemPlano.findUnique({
      where: {
        pedidoOnlineId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return {
      status: planoAtual?.status || "SEM_PLANO",
      componentesBaixados: [] as ComponenteBaixado[],
      alertas: [] as PedidoAlertaOperacional[],
      ignorado: true,
    };
  }

  const plano = await tx.pedidoEmbalagemPlano.findUnique({
    where: {
      pedidoOnlineId,
    },
    include: {
      pedidoOnline: {
        select: {
          codigo: true,
          documento: true,
        },
      },
      itens: {
        orderBy: {
          criadoEm: "asc",
        },
      },
    },
  });

  if (!plano) {
    return {
      status: "SEM_PLANO",
      componentesBaixados: [] as ComponenteBaixado[],
      alertas: [] as PedidoAlertaOperacional[],
      ignorado: true,
    };
  }

  const componentesBaixados: ComponenteBaixado[] = [];
  const alertas: PedidoAlertaOperacional[] = [];

  const componentesPlano = plano.itens.filter(
    (item) => item.tipo === "COMPONENTE" && item.itemAdicionalId,
  );

  for (const componente of componentesPlano) {
    const quantidade = quantidadeInteira(Number(componente.quantidade || 0));

    if (!componente.itemAdicionalId || quantidade <= 0) {
      continue;
    }

    try {
      const baixa = await baixarComponente({
        tx,
        itemAdicionalId: componente.itemAdicionalId,
        quantidade,
        nomePlano: componente.nome,
      });

      componentesBaixados.push(baixa);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao baixar componente de embalagem.";

      alertas.push(
        criarAlertaOperacional({
          tipo: "EMBALAGEM",
          severidade: "CRITICO",
          mensagem: "Componente de embalagem nao foi baixado.",
          detalhe: message,
          itemPedidoId: componente.pedidoOnlineItemId,
          componenteNome: componente.nome,
        }),
      );
    }
  }

  if (componentesBaixados.length > 0) {
    const custoTotal = componentesBaixados.reduce(
      (total, item) => total + item.custoTotal,
      0,
    );

    const movimentacao = await tx.movimentacao.create({
      data: {
        codigoMovimentacao: `MOV-${randomUUID()}`,
        tipoMovimentacao: "SAÍDA EMBALAGEM",
        origemTipo: "pedido_online_embalagem",
        origemId: pedidoOnlineId,
        codigoItem: plano.pedidoOnline.codigo,
        itemTipo: "embalagem",
        quantidade: 1,
        custo: custoTotal,
        faturamento: 0,
        documentoCliente: plano.pedidoOnline.documento || null,
        status: "ATIVA",
        relacionadoA: plano.id,
        gastoProdutoPrincipal: 0,
        gastoAdd1: custoTotal,
        gastoAdd2: 0,
        gastoAdd3: 0,
      },
    });

    for (const componente of componentesBaixados) {
      await tx.movimentacaoAdicional.create({
        data: {
          movimentacaoId: movimentacao.id,
          codigoItem: componente.codigoItem,
          nomeItem: componente.nomeItem,
          quantidade: componente.quantidade,
          custoUnitario: componente.custoUnitario,
          custoTotal: componente.custoTotal,
        },
      });
    }
  }

  const statusFinal = alertas.length > 0 ? "BAIXA_PARCIAL" : "BAIXADO";

  await tx.pedidoEmbalagemPlano.update({
    where: {
      id: plano.id,
    },
    data: {
      status: statusFinal,
      baixadoEm: new Date(),
      baixadoPor,
      baixaOrigem: origem,
      erroBaixa: alertas.map((alerta) => alerta.detalhe || alerta.mensagem).join("\n") || null,
      alertasJson:
        alertas.length > 0
          ? JSON.parse(JSON.stringify(alertas))
          : plano.alertasJson,
    },
  });

  return {
    status: statusFinal,
    componentesBaixados,
    alertas,
    ignorado: false,
  };
}
