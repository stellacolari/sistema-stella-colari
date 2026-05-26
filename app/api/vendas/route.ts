import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizarTamanhoEstoque } from "@/lib/loja/estoque";

type ItemVendaPayload = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  precoVenda: number;
  categoria: string;
  quantidade: number;
  tamanhoAnel?: string | null;
};

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
    custoMedioProduto,
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
    where: { categoria },
    include: { itemAdicional: true },
  });

  let gastoAdicionais = 0;
  const gastosPorAdicional: number[] = [];
  const adicionaisConsumidos: AdicionalConsumidoVenda[] = [];

  for (const regra of regrasAdicionais) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clienteId = String(body.clienteId || "").trim();
    const documentoCliente = String(body.documentoCliente || "").trim();
    const meioVenda = String(body.meioVenda || "").trim();
    const descontoPercentual = Number(body.descontoPercentual || 0);
    const observacoes = String(body.observacoes || "").trim();
    const itens: ItemVendaPayload[] = Array.isArray(body.itens)
      ? body.itens
      : [];

    if (!clienteId) {
      return NextResponse.json(
        { error: "Cliente é obrigatório." },
        { status: 400 }
      );
    }

    if (!meioVenda) {
      return NextResponse.json(
        { error: "Meio de venda é obrigatório." },
        { status: 400 }
      );
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um produto à venda." },
        { status: 400 }
      );
    }

    const itemInvalido = itens.find(
      (item) =>
        !item.id ||
        !Number.isFinite(Number(item.quantidade)) ||
        Number(item.quantidade) <= 0
    );

    if (itemInvalido) {
      return NextResponse.json(
        { error: "Existe um item inválido na venda." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const ultimoRegistro = await prisma.venda.findFirst({
      orderBy: { criadoEm: "desc" },
      select: { codigo: true },
    });

    let proximoNumero = 1;

    if (ultimoRegistro?.codigo) {
      const numeroAtual = Number(ultimoRegistro.codigo.replace("PV", ""));

      if (!Number.isNaN(numeroAtual)) {
        proximoNumero = numeroAtual + 1;
      }
    }

    const codigoVenda = gerarCodigoVenda(proximoNumero);

    const resultado = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let valorTotal = 0;
        let gastoTotal = 0;
        let lucroTotal = 0;

        const venda = await tx.venda.create({
          data: {
            codigo: codigoVenda,
            clienteId,
            meioVenda,
            descontoPercentual,
            status: "VENDA_FINALIZADA",
            observacoes: observacoes || null,
            valorTotal: 0,
            gastoTotal: 0,
            lucroTotal: 0,
          },
        });

        for (const item of itens) {
          const quantidade = Number(item.quantidade);

          const produto = await tx.produto.findUnique({
            where: { id: item.id },
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
            throw new Error(`Produto não encontrado: ${item.nome}`);
          }

          if (!produto.ativo || produto.status === "NA_LIXEIRA") {
            throw new Error(`Produto indisponível: ${produto.nome}`);
          }

          const produtoEhKit = produto.tipoProduto === "KIT";

          if (produtoEhKit && produto.componentesDoKit.length === 0) {
            throw new Error(
              `O kit ${produto.nome} não possui componentes cadastrados.`
            );
          }

          const exigeTamanho =
            !produtoEhKit && produtoExigeTamanhoAnel(produto.categoria);

          const tamanhoAnel = exigeTamanho
            ? normalizarTamanhoAnel(item.tamanhoAnel)
            : null;

          if (exigeTamanho && !tamanhoAnel) {
            throw new Error(
              `Informe o tamanho do anel para o produto: ${produto.nome}`
            );
          }

          const valorUnitarioBase = Number(produto.precoVenda);
          const valorUnitarioFinal =
            valorUnitarioBase * (1 - (descontoPercentual || 0) / 100);

          const valorTotalLinha = valorUnitarioFinal * quantidade;

          let gastoProduto = 0;
          const movimentosComponentesKit: MovimentoComponenteKit[] = [];

          if (!produtoEhKit) {
            const tamanhoEstoque = exigeTamanho ? tamanhoAnel : "UNICO";

            const baixa = await baixarEstoqueProduto({
              tx,
              produtoId: produto.id,
              tamanhoAnel: tamanhoEstoque,
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
              origemTipo: produtoEhKit ? "pedido_venda_kit" : "pedido_venda",
              origemId: venda.id,
              codigoItem: produto.codigoInterno,
              itemTipo: produtoEhKit ? "kit" : "produto",
              quantidade,
              tamanhoAnel,
              custo: gastoProduto + gastoAdicionais,
              faturamento: valorTotalLinha,
              documentoCliente,
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
                  documentoCliente,
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

        return venda;
      },
      {
        maxWait: 15000,
        timeout: 120000,
      }
    );

    return NextResponse.json({ ok: true, vendaId: resultado.id });
  } catch (error) {
    console.error("Erro ao finalizar venda:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao finalizar venda.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}