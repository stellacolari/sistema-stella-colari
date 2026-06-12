import type { Prisma } from "@prisma/client";
import {
  calcularPlanoEmbalagem,
  type ItemPedidoEmbalagemInput,
  type PlanoEmbalagemItem,
} from "@/lib/embalagens/calcular-plano";

export type ItemPedidoPlanoEmbalagem = ItemPedidoEmbalagemInput & {
  pedidoOnlineItemId?: string | null;
};

const STATUS_PLANO_INICIAL = "AGUARDANDO_PAGAMENTO";

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function numero(value: number | null | undefined) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function itemPlanoData({
  planoId,
  item,
  pedidoOnlineItemId,
}: {
  planoId: string;
  item: PlanoEmbalagemItem;
  pedidoOnlineItemId?: string | null;
}): Prisma.PedidoEmbalagemPlanoItemCreateManyInput {
  return {
    planoId,
    tipo: item.tipo,
    itemAdicionalId:
      item.tipo === "COMPONENTE" ? item.itemAdicionalId || null : null,
    embalagemModeloId: item.tipo === "COMPONENTE" ? null : item.modeloId || null,
    pedidoOnlineItemId: pedidoOnlineItemId || null,
    nome: item.nome,
    quantidade: numero(item.quantidade),
    custoUnitario: numero(item.custoUnitario),
    valorClienteUnitario: numero(item.valorClienteUnitario),
  };
}

export async function persistirPlanoEmbalagemPedido({
  tx,
  pedidoOnlineId,
  itens,
}: {
  tx: Prisma.TransactionClient;
  pedidoOnlineId: string;
  itens: ItemPedidoPlanoEmbalagem[];
}) {
  let resultado: ReturnType<typeof calcularPlanoEmbalagem>;

  const [modelos, configuracao] = await Promise.all([
    tx.embalagemModelo.findMany({
      include: {
        componentes: {
          include: {
            itemAdicional: {
              select: {
                id: true,
                nome: true,
                custoBase: true,
              },
            },
          },
        },
        compatibilidades: true,
      },
      orderBy: [{ tipo: "asc" }, { prioridade: "desc" }, { nomeInterno: "asc" }],
    }),
    tx.embalagemConfiguracao.upsert({
      where: {
        chave: "PADRAO",
      },
      update: {},
      create: {
        chave: "PADRAO",
      },
    }),
  ]);

  const modelosPlano = modelos.map((modelo) => ({
    id: modelo.id,
    tipo: modelo.tipo,
    nomeInterno: modelo.nomeInterno,
    nomePublico: modelo.nomePublico,
    ativo: modelo.ativo,
    prioridade: modelo.prioridade,
    precoCliente: modelo.precoCliente,
    substituiEmbalagemPadrao: modelo.substituiEmbalagemPadrao,
    capacidadeUnidades: modelo.capacidadeUnidades,
    capacidadeCaixasInternas: modelo.capacidadeCaixasInternas,
    pesoGramas: modelo.pesoGramas,
    alturaCm: modelo.alturaCm,
    larguraCm: modelo.larguraCm,
    comprimentoCm: modelo.comprimentoCm,
    custoEstimadoManual: modelo.custoEstimadoManual,
    componentes: modelo.componentes.map((componente) => ({
      itemAdicionalId: componente.itemAdicionalId,
      nome: componente.itemAdicional.nome,
      quantidade: componente.quantidade,
      custoBase: componente.itemAdicional.custoBase,
    })),
    compatibilidades: modelo.compatibilidades.map((compatibilidade) => ({
      classeId: compatibilidade.classeId,
      categoriaId: compatibilidade.categoriaId,
      produtoId: compatibilidade.produtoId,
      ativo: compatibilidade.ativo,
      prioridade: compatibilidade.prioridade,
      capacidadeMaximaItens: compatibilidade.capacidadeMaximaItens,
    })),
  }));

  try {
    resultado = calcularPlanoEmbalagem({
      itens,
      modelos: modelosPlano,
      configuracao,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao calcular plano de embalagem.";

    resultado = {
      embalagensInternasPadrao: [],
      embalagensPresente: [],
      embalagemExterna: null,
      componentes: [],
      custoEstimado: 0,
      valorEmbalagensCliente: 0,
      pesoEstimadoGramas: 0,
      dimensoesFinais: {
        alturaCm: null,
        larguraCm: null,
        comprimentoCm: null,
      },
      alertas: [message],
    };
  }

  const plano = await tx.pedidoEmbalagemPlano.upsert({
    where: {
      pedidoOnlineId,
    },
    update: {
      status: STATUS_PLANO_INICIAL,
      planoJson: toPrismaJson(resultado),
      alertasJson: toPrismaJson(resultado.alertas),
      pesoTotalGramas: resultado.pesoEstimadoGramas,
      alturaCm: resultado.dimensoesFinais.alturaCm,
      larguraCm: resultado.dimensoesFinais.larguraCm,
      comprimentoCm: resultado.dimensoesFinais.comprimentoCm,
      custoEmbalagens: resultado.custoEstimado,
      valorEmbalagensCliente: resultado.valorEmbalagensCliente,
    },
    create: {
      pedidoOnlineId,
      status: STATUS_PLANO_INICIAL,
      planoJson: toPrismaJson(resultado),
      alertasJson: toPrismaJson(resultado.alertas),
      pesoTotalGramas: resultado.pesoEstimadoGramas,
      alturaCm: resultado.dimensoesFinais.alturaCm,
      larguraCm: resultado.dimensoesFinais.larguraCm,
      comprimentoCm: resultado.dimensoesFinais.comprimentoCm,
      custoEmbalagens: resultado.custoEstimado,
      valorEmbalagensCliente: resultado.valorEmbalagensCliente,
    },
    select: {
      id: true,
    },
  });

  await tx.pedidoEmbalagemPlanoItem.deleteMany({
    where: {
      planoId: plano.id,
    },
  });

  const itensComPresente = itens.filter((item) => item.embalagemPresenteModeloId);
  let indicePresente = 0;

  const itensPlano: Prisma.PedidoEmbalagemPlanoItemCreateManyInput[] = [
    ...resultado.embalagensInternasPadrao.map((item) =>
      itemPlanoData({ planoId: plano.id, item }),
    ),
    ...resultado.embalagensPresente.map((item) => {
      const itemPedido = itensComPresente[indicePresente];
      indicePresente += 1;

      return itemPlanoData({
        planoId: plano.id,
        item,
        pedidoOnlineItemId: itemPedido?.pedidoOnlineItemId || null,
      });
    }),
    ...(resultado.embalagemExterna
      ? [itemPlanoData({ planoId: plano.id, item: resultado.embalagemExterna })]
      : []),
    ...resultado.componentes.map((item) =>
      itemPlanoData({ planoId: plano.id, item }),
    ),
  ];

  if (itensPlano.length > 0) {
    await tx.pedidoEmbalagemPlanoItem.createMany({
      data: itensPlano,
    });
  }

  return {
    planoId: plano.id,
    resultado,
    totalItensPlano: itensPlano.length,
  };
}
