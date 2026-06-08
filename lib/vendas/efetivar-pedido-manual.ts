import type { Prisma } from "@prisma/client";
import { regraAplicaACategoria } from "@/lib/regras-categoria";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizarTamanhoEstoque } from "@/lib/loja/estoque";

type AdicionalConsumidoVenda = {
  codigoItem: string;
  nomeItem: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
};

type MovimentoComponenteKit = {
  codigoItem: string;
  nomeItem: string;
  produtoId: string;
  quantidade: number;
  tamanhoAnel: string;
  custoTotal: number;
};

function gerarCodigoVenda(numero: number) {
  return `PV${String(numero).padStart(6, "0")}`;
}

function normalizarCategoria(categoria: string) {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function produtoExigeTamanhoAnel(categoria: string) {
  const categoriaNormalizada = normalizarCategoria(categoria);

  return (
    categoriaNormalizada === "anel" ||
    categoriaNormalizada === "aneis" ||
    categoriaNormalizada === "aneis e aliancas" ||
    categoriaNormalizada.includes("anel")
  );
}

function normalizarTamanhoAnel(tamanho: string | null | undefined) {
  const value = String(tamanho ?? "").trim().toUpperCase();

  if (!value || value === "UNICO") {
    return "";
  }

  return value;
}

function getManualPayload(value: Prisma.JsonValue | null | undefined) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function gerarProximoCodigoVenda(tx: Prisma.TransactionClient) {
  const ultimoRegistro = await tx.venda.findFirst({
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });

  let proximoNumero = 1;

  if (ultimoRegistro?.codigo) {
    const numeroAtual = Number(ultimoRegistro.codigo.replace("PV", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const codigo = gerarCodigoVenda(proximoNumero + tentativa);
    const existente = await tx.venda.findUnique({
      where: { codigo },
      select: { id: true },
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único para a venda.");
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
        ? `Produto sem estoque no tamanho ${tamanhoEstoque}: ${descricao}`
        : `Produto sem estoque: ${descricao}`
    );
  }

  if (estoqueProduto.quantidadeAtual < quantidade) {
    throw new Error(
      tamanhoEstoque !== "UNICO"
        ? `Saldo insuficiente para ${descricao} no tamanho ${tamanhoEstoque}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`
        : `Saldo insuficiente para ${descricao}. Saldo atual: ${estoqueProduto.quantidadeAtual}.`
    );
  }

  const custoMedioProduto = Number(estoqueProduto.custoMedio || 0);
  const gastoProduto = custoMedioProduto * quantidade;
  const novaQuantidadeProduto = estoqueProduto.quantidadeAtual - quantidade;
  const novoValorProduto =
    Number(estoqueProduto.valorAcumulado || 0) - gastoProduto;
  const valorProdutoSeguro = novoValorProduto > 0 ? novoValorProduto : 0;

  await tx.estoqueProduto.update({
    where: { id: estoqueProduto.id },
    data: {
      quantidadeAtual: novaQuantidadeProduto,
      valorAcumulado: valorProdutoSeguro,
      custoMedio:
        novaQuantidadeProduto > 0
          ? valorProdutoSeguro / novaQuantidadeProduto
          : 0,
    },
  });

  return {
    tamanhoEstoque,
    gastoProduto,
  };
}

async function consumirAdicionaisDaCategoria({
  tx,
  categoria,
  quantidadeProduto,
  nomeProduto,
}: {
  tx: Prisma.TransactionClient;
  categoria: string;
  quantidadeProduto: number;
  nomeProduto: string;
}) {
  const regrasAdicionais = await tx.regraCategoria.findMany({
    include: { itemAdicional: true },
  });

  let gastoAdicionais = 0;
  const gastosPorAdicional: number[] = [];
  const adicionaisConsumidos: AdicionalConsumidoVenda[] = [];

  for (const regra of regrasAdicionais) {
    if (!regraAplicaACategoria(regra, categoria)) {
      continue;
    }

    const quantidadeNecessaria = regra.quantidade * quantidadeProduto;

    const estoqueAdicional = await tx.estoqueAdicional.findFirst({
      where: { itemAdicionalId: regra.itemAdicionalId },
    });

    if (!estoqueAdicional) {
      throw new Error(`Item adicional sem estoque: ${regra.itemAdicional.nome}`);
    }

    if (estoqueAdicional.quantidadeAtual < quantidadeNecessaria) {
      throw new Error(
        `Saldo insuficiente do item adicional ${regra.itemAdicional.nome} para vender ${nomeProduto}`
      );
    }

    const custoMedioAdicional = Number(estoqueAdicional.custoMedio || 0);
    const gastoLinhaAdicional = custoMedioAdicional * quantidadeNecessaria;

    gastoAdicionais += gastoLinhaAdicional;
    gastosPorAdicional.push(gastoLinhaAdicional);

    adicionaisConsumidos.push({
      codigoItem: regra.itemAdicional.codigoInterno,
      nomeItem: regra.itemAdicional.nome,
      quantidade: quantidadeNecessaria,
      custoUnitario: custoMedioAdicional,
      custoTotal: gastoLinhaAdicional,
    });

    const novaQuantidadeAdicional =
      estoqueAdicional.quantidadeAtual - quantidadeNecessaria;
    const novoValorAdicional =
      Number(estoqueAdicional.valorAcumulado || 0) - gastoLinhaAdicional;
    const valorAdicionalSeguro =
      novoValorAdicional > 0 ? novoValorAdicional : 0;

    await tx.estoqueAdicional.update({
      where: { id: estoqueAdicional.id },
      data: {
        quantidadeAtual: novaQuantidadeAdicional,
        valorAcumulado: valorAdicionalSeguro,
        custoMedio:
          novaQuantidadeAdicional > 0
            ? valorAdicionalSeguro / novaQuantidadeAdicional
            : 0,
      },
    });
  }

  return {
    gastoAdicionais,
    gastosPorAdicional,
    adicionaisConsumidos,
  };
}

export async function efetivarPedidoManualPagoComoVenda({
  pedidoId,
  gatewayPagamentoId,
  valorPago,
}: {
  pedidoId: string;
  gatewayPagamentoId: string | null;
  valorPago: number;
}) {
  return prisma.$transaction(
    async (tx) => {
      const bloqueio = await tx.pedidoOnline.updateMany({
        where: {
          id: pedidoId,
          origemCanal: "ADMIN_MANUAL",
          statusPagamento: {
            not: "PAGO",
          },
        },
        data: {
          statusPagamento: "PROCESSANDO_PAGAMENTO",
        },
      });

      if (bloqueio.count === 0) {
        return null;
      }

      const pedido = await tx.pedidoOnline.findUnique({
        where: { id: pedidoId },
        include: {
          cliente: true,
          itens: true,
        },
      });

      if (!pedido || pedido.origemCanal !== "ADMIN_MANUAL") {
        return null;
      }

      if (!pedido.clienteId || !pedido.cliente) {
        throw new Error("Pedido manual sem cliente vinculado.");
      }

      if (pedido.itens.length === 0) {
        throw new Error("Pedido manual sem itens para efetivar.");
      }

      const payload = getManualPayload(pedido.dadosOriginaisJson);
      const meioVenda = String(payload.meioVenda || "Link de pagamento").trim();
      const descontoPercentual = Number(payload.descontoPercentual || 0);
      const codigoVenda = await gerarProximoCodigoVenda(tx);

      let valorTotal = 0;
      let gastoTotal = 0;
      let lucroTotal = 0;

      const venda = await tx.venda.create({
        data: {
          codigo: codigoVenda,
          clienteId: pedido.clienteId,
          meioVenda,
          descontoPercentual,
          status: "VENDA_FINALIZADA",
          observacoes:
            pedido.observacoes ||
            `Venda gerada pelo link de pagamento do pedido ${pedido.codigo}.`,
          valorTotal: 0,
          gastoTotal: 0,
          lucroTotal: 0,
        },
      });

      for (const itemPedido of pedido.itens) {
        if (!itemPedido.produtoId) {
          throw new Error(`Item sem produto vinculado: ${itemPedido.nomeProduto}`);
        }

        const produto = await tx.produto.findUnique({
          where: { id: itemPedido.produtoId },
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
          throw new Error(`Produto não encontrado: ${itemPedido.nomeProduto}`);
        }

        if (!produto.ativo || produto.status === "NA_LIXEIRA") {
          throw new Error(`Produto indisponível: ${produto.nome}`);
        }

        const quantidade = Number(itemPedido.quantidade || 0);
        const produtoEhKit = produto.tipoProduto === "KIT";

        if (produtoEhKit && produto.componentesDoKit.length === 0) {
          throw new Error(
            `O kit ${produto.nome} não possui componentes cadastrados.`
          );
        }

        const exigeTamanho =
          !produtoEhKit && produtoExigeTamanhoAnel(produto.categoria);

        const tamanhoAnel = exigeTamanho
          ? normalizarTamanhoAnel(itemPedido.tamanhoAnel)
          : null;

        if (exigeTamanho && !tamanhoAnel) {
          throw new Error(
            `Informe o tamanho do anel para o produto: ${produto.nome}`
          );
        }

        const valorUnitarioBase = Number(itemPedido.precoOriginal ?? produto.precoVenda);
        const valorUnitarioFinal = Number(itemPedido.precoUnitario);
        const valorTotalLinha = valorUnitarioFinal * quantidade;

        let gastoProduto = 0;
        const movimentosComponentesKit: MovimentoComponenteKit[] = [];

        if (!produtoEhKit) {
          const baixa = await baixarEstoqueProduto({
            tx,
            produtoId: produto.id,
            tamanhoAnel: exigeTamanho ? tamanhoAnel : "UNICO",
            quantidade,
            descricao: produto.nome,
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
              nomeItem: produtoComponente.nome,
              produtoId: produtoComponente.id,
              quantidade: quantidadeComponente,
              tamanhoAnel: baixaComponente.tamanhoEstoque,
              custoTotal: baixaComponente.gastoProduto,
            });
          }
        }

        const {
          gastoAdicionais,
          gastosPorAdicional,
          adicionaisConsumidos,
        } = await consumirAdicionaisDaCategoria({
          tx,
          categoria: produto.categoria,
          quantidadeProduto: quantidade,
          nomeProduto: produto.nome,
        });

        const lucroLinha = valorTotalLinha - gastoProduto - gastoAdicionais;

        const vendaItem = await tx.vendaItem.create({
          data: {
            vendaId: venda.id,
            produtoId: produto.id,
            codigoDigitado: produto.codigoInterno,
            descricao: produto.nome,
            quantidade,
            tamanhoAnel,
            valorUnitarioBase,
            valorUnitarioFinal,
            valorTotal: valorTotalLinha,
            gastoProduto,
            gastoAdicionais,
            lucroTotal: lucroLinha,
          },
        });

        const movimentacao = await tx.movimentacao.create({
          data: {
            codigoMovimentacao: `MOV-${randomUUID()}`,
            tipoMovimentacao: produtoEhKit ? "SAÍDA KIT" : "SAÍDA",
            origemTipo: produtoEhKit
              ? "pedido_venda_kit"
              : "pedido_venda_link_pagamento",
            origemId: venda.id,
            codigoItem: produto.codigoInterno,
            itemTipo: produtoEhKit ? "kit" : "produto",
            quantidade,
            tamanhoAnel,
            custo: gastoProduto + gastoAdicionais,
            faturamento: valorTotalLinha,
            documentoCliente: pedido.cliente.documento,
            status: "ATIVA",
            relacionadoA: vendaItem.id,
            gastoProdutoPrincipal: gastoProduto,
            gastoAdd1: gastosPorAdicional[0] || 0,
            gastoAdd2: gastosPorAdicional[1] || 0,
            gastoAdd3: gastosPorAdicional[2] || 0,
          },
        });

        if (produtoEhKit) {
          for (const componente of movimentosComponentesKit) {
            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: `MOV-${randomUUID()}`,
                tipoMovimentacao: "SAÍDA COMPONENTE KIT",
                origemTipo: "pedido_venda_kit_componente",
                origemId: venda.id,
                codigoItem: componente.codigoItem,
                itemTipo: "produto",
                quantidade: componente.quantidade,
                tamanhoAnel: componente.tamanhoAnel,
                custo: componente.custoTotal,
                faturamento: 0,
                documentoCliente: pedido.cliente.documento,
                status: "ATIVA",
                relacionadoA: vendaItem.id,
                gastoProdutoPrincipal: componente.custoTotal,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }

        if (adicionaisConsumidos.length > 0) {
          await tx.movimentacaoAdicional.createMany({
            data: adicionaisConsumidos.map((adicional) => ({
              movimentacaoId: movimentacao.id,
              codigoItem: adicional.codigoItem,
              nomeItem: adicional.nomeItem,
              quantidade: adicional.quantidade,
              custoUnitario: adicional.custoUnitario,
              custoTotal: adicional.custoTotal,
            })),
          });
        }

        valorTotal += valorTotalLinha;
        gastoTotal += gastoProduto + gastoAdicionais;
        lucroTotal += lucroLinha;
      }

      await tx.venda.update({
        where: { id: venda.id },
        data: {
          valorTotal,
          gastoTotal,
          lucroTotal,
        },
      });

      await tx.pedidoOnline.update({
        where: { id: pedido.id },
        data: {
          status: "PAGO",
          statusPagamento: "PAGO",
          gatewayPagamento: "STRIPE",
          gatewayPagamentoId,
          metodoPagamento: "STRIPE_CHECKOUT",
          valorPago,
          pagoEm: new Date(),
          pagamentoObservacao: `Pagamento confirmado via Stripe. Venda ${codigoVenda} gerada e estoque baixado.`,
          statusHistorico: {
            create: {
              statusAnterior: pedido.status,
              statusNovo: "PAGO",
              tipoEvento: "PAGAMENTO",
              origem: "STRIPE",
              usuarioNome: "Stripe",
              observacao: `Link manual pago. Venda gerada: ${codigoVenda}.`,
            },
          },
        },
      });

      return {
        vendaId: venda.id,
        vendaCodigo: codigoVenda,
        pedidoCodigo: pedido.codigo,
      };
    },
    {
      maxWait: 15000,
      timeout: 120000,
    }
  );
}
