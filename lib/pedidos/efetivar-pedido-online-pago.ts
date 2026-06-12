import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizarTamanhoEstoque } from "@/lib/loja/estoque";
import { regraAplicaACategoria } from "@/lib/regras-categoria";
import { baixarComponentesPlanoEmbalagem } from "@/lib/embalagens/baixar-componentes-plano";
import {
  adicionarAlertasOperacionaisPedido,
  criarAlertaOperacional,
} from "@/lib/pedidos/alertas-operacionais";

type BaixaAdicionalResultado = {
  codigoItem: string;
  nomeItem: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  origem: "REGRA_CATEGORIA" | "OPCAO_ADICIONAL";
};

type MovimentoComponenteKit = {
  codigoItem: string;
  produtoId: string;
  quantidade: number;
  tamanhoAnel: string;
  custoTotal: number;
};

type PedidoOnlinePagoParams = {
  pedidoId: string;
  gatewayPedidoId?: string | null;
  gatewayPagamentoId?: string | null;
  gatewayPagamento?: string | null;
  metodoPagamento?: string | null;
  valorPago: number;
  origemHistorico?: string;
  usuarioNomeHistorico?: string | null;
  pagamentoObservacao?: string | null;
  historicoObservacao?: string | null;
};

function calcularCustoMedio(valorAcumulado: number, quantidadeAtual: number) {
  if (quantidadeAtual <= 0) {
    return 0;
  }

  return valorAcumulado / quantidadeAtual;
}

async function baixarEstoqueProduto({
  tx,
  produtoId,
  tamanhoAnel,
  quantidade,
  descricao,
}: {
  tx: Prisma.TransactionClient;
  produtoId: string;
  tamanhoAnel: string | null | undefined;
  quantidade: number;
  descricao: string;
}) {
  const tamanhoEstoque = normalizarTamanhoEstoque(tamanhoAnel);

  const estoqueProduto = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId,
        tamanhoAnel: tamanhoEstoque,
      },
    },
  });

  if (!estoqueProduto) {
    throw new Error(
      tamanhoEstoque !== "UNICO"
        ? `Produto sem estoque na opcao ${tamanhoEstoque}: ${descricao}`
        : `Produto sem estoque: ${descricao}`,
    );
  }

  if (estoqueProduto.quantidadeAtual < quantidade) {
    throw new Error(
      tamanhoEstoque !== "UNICO"
        ? `Saldo insuficiente para ${descricao} na opcao ${tamanhoEstoque}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`
        : `Saldo insuficiente para ${descricao}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`,
    );
  }

  const custoMedioProduto = Number(estoqueProduto.custoMedio || 0);
  const gastoProduto = custoMedioProduto * quantidade;
  const novaQuantidadeProduto = estoqueProduto.quantidadeAtual - quantidade;
  const novoValorProduto =
    Number(estoqueProduto.valorAcumulado || 0) - gastoProduto;
  const valorProdutoSeguro = novoValorProduto > 0 ? novoValorProduto : 0;

  await tx.estoqueProduto.update({
    where: {
      id: estoqueProduto.id,
    },
    data: {
      quantidadeAtual: novaQuantidadeProduto,
      valorAcumulado: valorProdutoSeguro,
      custoMedio: calcularCustoMedio(valorProdutoSeguro, novaQuantidadeProduto),
    },
  });

  return {
    tamanhoEstoque,
    gastoProduto,
  };
}

async function baixarEstoqueAdicional({
  tx,
  itemAdicionalId,
  quantidade,
  descricao,
  origem,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  descricao: string;
  origem: "REGRA_CATEGORIA" | "OPCAO_ADICIONAL";
}): Promise<BaixaAdicionalResultado> {
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
    throw new Error(`Item adicional sem estoque cadastrado: ${descricao}`);
  }

  if (
    !estoque.itemAdicional.ativo ||
    estoque.itemAdicional.status === "NA_LIXEIRA"
  ) {
    throw new Error(`Item adicional indisponivel: ${estoque.itemAdicional.nome}`);
  }

  if (estoque.quantidadeAtual < quantidade) {
    throw new Error(
      `Saldo insuficiente do item adicional ${estoque.itemAdicional.nome}. Saldo atual: ${estoque.quantidadeAtual}.`,
    );
  }

  const custoUnitario = Number(estoque.custoMedio || 0);
  const custoTotal = custoUnitario * quantidade;
  const novaQuantidade = estoque.quantidadeAtual - quantidade;
  const novoValorAcumulado = Number(estoque.valorAcumulado || 0) - custoTotal;
  const valorSeguro = novoValorAcumulado > 0 ? novoValorAcumulado : 0;

  await tx.estoqueAdicional.update({
    where: {
      id: estoque.id,
    },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: valorSeguro,
      custoMedio: calcularCustoMedio(valorSeguro, novaQuantidade),
    },
  });

  return {
    codigoItem: estoque.itemAdicional.codigoInterno,
    nomeItem: estoque.itemAdicional.nome,
    quantidade,
    custoUnitario,
    custoTotal,
    origem,
  };
}

async function baixarAdicionaisDoItem({
  tx,
  itemPedido,
}: {
  tx: Prisma.TransactionClient;
  itemPedido: {
    categoria: string;
    quantidade: number;
    nomeProduto: string;
    adicionais: {
      id: string;
      itemPadraoSubstituidoId: string | null;
      itemAdicionalConsumidoId: string | null;
      valorVendaTotal: number;
      itemAdicionalConsumido: {
        id: string;
        nome: string;
      } | null;
    }[];
  };
}) {
  const baixas: BaixaAdicionalResultado[] = [];
  const quantidadeProduto = Number(itemPedido.quantidade || 0);
  const adicionalOpcao = itemPedido.adicionais[0] || null;

  const regras = await tx.regraCategoria.findMany({
    include: {
      itemAdicional: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          ativo: true,
          status: true,
        },
      },
    },
    orderBy: {
      criadoEm: "asc",
    },
  });

  for (const regra of regras) {
    if (!regraAplicaACategoria(regra, itemPedido.categoria)) {
      continue;
    }

    const itemPadraoFoiSubstituido =
      adicionalOpcao?.itemPadraoSubstituidoId &&
      regra.itemAdicionalId === adicionalOpcao.itemPadraoSubstituidoId;

    const itemPremiumJaSeraConsumido =
      adicionalOpcao?.itemAdicionalConsumidoId &&
      regra.itemAdicionalId === adicionalOpcao.itemAdicionalConsumidoId;

    if (itemPadraoFoiSubstituido || itemPremiumJaSeraConsumido) {
      continue;
    }

    if (
      !regra.itemAdicional.ativo ||
      regra.itemAdicional.status === "NA_LIXEIRA"
    ) {
      continue;
    }

    const quantidadeConsumida =
      Number(regra.quantidade || 0) * quantidadeProduto;

    if (quantidadeConsumida <= 0) {
      continue;
    }

    baixas.push(
      await baixarEstoqueAdicional({
        tx,
        itemAdicionalId: regra.itemAdicionalId,
        quantidade: quantidadeConsumida,
        descricao: `${regra.itemAdicional.nome} da categoria ${itemPedido.categoria}`,
        origem: "REGRA_CATEGORIA",
      }),
    );
  }

  if (adicionalOpcao?.itemAdicionalConsumidoId) {
    const baixaPremium = await baixarEstoqueAdicional({
      tx,
      itemAdicionalId: adicionalOpcao.itemAdicionalConsumidoId,
      quantidade: quantidadeProduto,
      descricao: adicionalOpcao.itemAdicionalConsumido?.nome || "Adicional",
      origem: "OPCAO_ADICIONAL",
    });

    baixas.push(baixaPremium);

    await tx.pedidoOnlineItemAdicional.update({
      where: {
        id: adicionalOpcao.id,
      },
      data: {
        custoUnitario: baixaPremium.custoUnitario,
        custoTotal: baixaPremium.custoTotal,
        lucroTotal: Number(adicionalOpcao.valorVendaTotal || 0) - baixaPremium.custoTotal,
      },
    });
  }

  return baixas;
}

function dadosPagamento({
  gatewayPedidoId,
  gatewayPagamentoId,
  gatewayPagamento = "STRIPE",
  metodoPagamento = "STRIPE_CHECKOUT",
  valorPago,
  pagamentoObservacao,
}: PedidoOnlinePagoParams) {
  return {
    statusPagamento: "PAGO",
    metodoPagamento,
    gatewayPagamento,
    gatewayPedidoId: gatewayPedidoId || undefined,
    gatewayPagamentoId,
    valorPago,
    pagoEm: new Date(),
    pagamentoObservacao:
      pagamentoObservacao || "Pagamento confirmado. Estoque baixado.",
  };
}

async function marcarProblemaOperacional({
  params,
  message,
}: {
  params: PedidoOnlinePagoParams;
  message: string;
}) {
  return prisma.$transaction(async (tx) => {
    const pedidoAtual = await tx.pedidoOnline.findUnique({
      where: {
        id: params.pedidoId,
      },
      select: {
        id: true,
        codigo: true,
        status: true,
      },
    });

    if (!pedidoAtual) {
      return null;
    }

    const observacao = `Pagamento confirmado, mas a baixa de estoque precisa de acao operacional: ${message}`;

    await adicionarAlertasOperacionaisPedido({
      tx,
      pedidoOnlineId: params.pedidoId,
      alertas: [
        criarAlertaOperacional({
          tipo: "ESTOQUE",
          severidade: "CRITICO",
          mensagem:
            "Pagamento confirmado, mas a baixa de estoque precisa de acao operacional.",
          detalhe: message,
        }),
      ],
    });

    const pedido = await tx.pedidoOnline.update({
      where: {
        id: params.pedidoId,
      },
      data: {
        ...dadosPagamento({
          ...params,
          pagamentoObservacao: observacao,
        }),
        status: "PROBLEMA",
      },
      select: {
        id: true,
        codigo: true,
        status: true,
        statusPagamento: true,
      },
    });

    await tx.pedidoStatusHistorico.create({
      data: {
        pedidoOnlineId: params.pedidoId,
        statusAnterior: pedidoAtual.status,
        statusNovo: "PROBLEMA",
        tipoEvento: "PAGAMENTO",
        origem: params.origemHistorico || "SISTEMA",
        usuarioNome: params.usuarioNomeHistorico || "Sistema",
        observacao,
      },
    });

    return {
      pedido,
      estoqueBaixado: false,
      problemaOperacional: true,
      motivo: message,
    };
  });
}

export async function efetivarPedidoOnlinePago(params: PedidoOnlinePagoParams) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const bloqueio = await tx.pedidoOnline.updateMany({
          where: {
            id: params.pedidoId,
            origemCanal: "LOJA_STELLA",
            statusPagamento: {
              notIn: ["PAGO", "PROCESSANDO_PAGAMENTO"],
            },
          },
          data: {
            statusPagamento: "PROCESSANDO_PAGAMENTO",
          },
        });

        if (bloqueio.count === 0) {
          const pedido = await tx.pedidoOnline.findUnique({
            where: {
              id: params.pedidoId,
            },
            select: {
              id: true,
              codigo: true,
              status: true,
              statusPagamento: true,
            },
          });

          return {
            pedido,
            estoqueBaixado: false,
            problemaOperacional: false,
            motivo: "Pedido ja estava pago, em processamento ou nao pertence a loja publica.",
          };
        }

        const pedido = await tx.pedidoOnline.findUnique({
          where: {
            id: params.pedidoId,
          },
          include: {
            itens: {
              orderBy: {
                criadoEm: "asc",
              },
              include: {
                adicionais: {
                  orderBy: {
                    criadoEm: "asc",
                  },
                  include: {
                    itemAdicionalConsumido: {
                      select: {
                        id: true,
                        nome: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!pedido || pedido.origemCanal !== "LOJA_STELLA") {
          return {
            pedido: null,
            estoqueBaixado: false,
            problemaOperacional: false,
            motivo: "Pedido online da loja nao encontrado.",
          };
        }

        const movimentacoesExistentes = await tx.movimentacao.count({
          where: {
            origemId: pedido.id,
            status: "ATIVA",
          },
        });

        if (movimentacoesExistentes > 0) {
          const pedidoPago = await tx.pedidoOnline.update({
            where: {
              id: pedido.id,
            },
            data: dadosPagamento(params),
            select: {
              id: true,
              codigo: true,
              status: true,
              statusPagamento: true,
            },
          });

          await tx.pedidoStatusHistorico.create({
            data: {
              pedidoOnlineId: pedido.id,
              statusAnterior: pedido.status,
              statusNovo: pedido.status,
              tipoEvento: "PAGAMENTO",
              origem: params.origemHistorico || "SISTEMA",
              usuarioNome: params.usuarioNomeHistorico || "Sistema",
              observacao:
                params.historicoObservacao ||
                "Pagamento confirmado. Estoque ja possuia movimentacoes ativas para este pedido.",
            },
          });

          return {
            pedido: pedidoPago,
            estoqueBaixado: false,
            problemaOperacional: false,
            motivo: "Movimentacoes ativas ja existentes.",
          };
        }

        for (const itemPedido of pedido.itens) {
          if (!itemPedido.produtoId) {
            throw new Error(`Item sem produto vinculado: ${itemPedido.nomeProduto}`);
          }

          const produto = await tx.produto.findUnique({
            where: {
              id: itemPedido.produtoId,
            },
            include: {
              componentesDoKit: {
                include: {
                  componenteProduto: true,
                },
                orderBy: {
                  criadoEm: "asc",
                },
              },
            },
          });

          if (!produto) {
            throw new Error(`Produto nao encontrado: ${itemPedido.nomeProduto}`);
          }

          const quantidade = Number(itemPedido.quantidade || 0);
          const produtoEhKit = produto.tipoProduto === "KIT";
          let gastoProduto = 0;
          const movimentosComponentesKit: MovimentoComponenteKit[] = [];

          if (!produtoEhKit) {
            const baixa = await baixarEstoqueProduto({
              tx,
              produtoId: produto.id,
              tamanhoAnel: itemPedido.tamanhoAnel || "UNICO",
              quantidade,
              descricao: itemPedido.nomeProduto,
            });

            gastoProduto = baixa.gastoProduto;
          } else {
            for (const componente of produto.componentesDoKit) {
              const produtoComponente = componente.componenteProduto;
              const quantidadeComponente = quantidade * componente.quantidade;

              const baixaComponente = await baixarEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: "UNICO",
                quantidade: quantidadeComponente,
                descricao: `${produtoComponente.nome} do kit ${produto.nome}`,
              });

              gastoProduto += baixaComponente.gastoProduto;

              movimentosComponentesKit.push({
                codigoItem: produtoComponente.codigoInterno,
                produtoId: produtoComponente.id,
                quantidade: quantidadeComponente,
                tamanhoAnel: baixaComponente.tamanhoEstoque,
                custoTotal: baixaComponente.gastoProduto,
              });
            }
          }

          const baixasAdicionais = await baixarAdicionaisDoItem({
            tx,
            itemPedido,
          });

          const custoTotalAdicionais = baixasAdicionais.reduce(
            (total, baixa) => total + baixa.custoTotal,
            0,
          );

          const movimentacao = await tx.movimentacao.create({
            data: {
              codigoMovimentacao: `MOV-${randomUUID()}`,
              tipoMovimentacao: produtoEhKit ? "SAÍDA KIT" : "SAÍDA",
              origemTipo: produtoEhKit ? "pedido_online_kit" : "pedido_online",
              origemId: pedido.id,
              codigoItem: itemPedido.codigoInterno,
              itemTipo: produtoEhKit ? "kit" : "produto",
              quantidade,
              tamanhoAnel: itemPedido.tamanhoAnel,
              custo: gastoProduto + custoTotalAdicionais,
              faturamento: Number(itemPedido.total || 0),
              documentoCliente: pedido.documento || null,
              status: "ATIVA",
              relacionadoA: itemPedido.id,
              gastoProdutoPrincipal: gastoProduto,
              gastoAdd1: custoTotalAdicionais,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });

          for (const baixaAdicional of baixasAdicionais) {
            await tx.movimentacaoAdicional.create({
              data: {
                movimentacaoId: movimentacao.id,
                codigoItem: baixaAdicional.codigoItem,
                nomeItem: baixaAdicional.nomeItem,
                quantidade: baixaAdicional.quantidade,
                custoUnitario: baixaAdicional.custoUnitario,
                custoTotal: baixaAdicional.custoTotal,
              },
            });
          }

          for (const componente of movimentosComponentesKit) {
            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: `MOV-${randomUUID()}`,
                tipoMovimentacao: "SAÍDA COMPONENTE KIT",
                origemTipo: "pedido_online_kit_componente",
                origemId: pedido.id,
                codigoItem: componente.codigoItem,
                itemTipo: "produto",
                quantidade: componente.quantidade,
                tamanhoAnel: componente.tamanhoAnel,
                custo: componente.custoTotal,
                faturamento: 0,
                documentoCliente: pedido.documento || null,
                status: "ATIVA",
                relacionadoA: itemPedido.id,
                gastoProdutoPrincipal: componente.custoTotal,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }

        const baixaEmbalagem = await baixarComponentesPlanoEmbalagem({
          tx,
          pedidoOnlineId: pedido.id,
          origem: params.origemHistorico || "PAGAMENTO_APROVADO",
          baixadoPor: params.usuarioNomeHistorico || "Sistema",
        });

        if (baixaEmbalagem.alertas.length > 0) {
          await adicionarAlertasOperacionaisPedido({
            tx,
            pedidoOnlineId: pedido.id,
            alertas: baixaEmbalagem.alertas,
          });
        }

        const statusOperacionalFinal =
          baixaEmbalagem.alertas.length > 0 ? "PROBLEMA" : pedido.status;

        const pedidoPago = await tx.pedidoOnline.update({
          where: {
            id: pedido.id,
          },
          data: {
            ...dadosPagamento(params),
            status: statusOperacionalFinal,
          },
          select: {
            id: true,
            codigo: true,
            status: true,
            statusPagamento: true,
          },
        });

        await tx.pedidoStatusHistorico.create({
          data: {
            pedidoOnlineId: pedido.id,
            statusAnterior: pedido.status,
            statusNovo: statusOperacionalFinal,
            tipoEvento: "PAGAMENTO",
            origem: params.origemHistorico || "SISTEMA",
            usuarioNome: params.usuarioNomeHistorico || "Sistema",
            observacao:
              baixaEmbalagem.alertas.length > 0
                ? "Pagamento confirmado. Produtos/adicionais processados, mas ha alerta de embalagem para acao operacional."
                : params.historicoObservacao ||
                  "Pagamento confirmado. Estoque de produtos e adicionais baixado.",
          },
        });

        return {
          pedido: pedidoPago,
          estoqueBaixado: true,
          embalagemBaixada:
            baixaEmbalagem.status === "BAIXADO" ||
            baixaEmbalagem.status === "BAIXA_PARCIAL",
          problemaOperacional: baixaEmbalagem.alertas.length > 0,
          motivo:
            baixaEmbalagem.alertas.length > 0
              ? "Componentes de embalagem exigem acao operacional."
              : null,
        };
      },
      {
        maxWait: 15000,
        timeout: 120000,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao efetivar pedido online pago.";

    return marcarProblemaOperacional({
      params,
      message,
    });
  }
}
