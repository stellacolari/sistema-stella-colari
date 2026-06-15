"use server";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type KitComponenteComProduto = {
  quantidade: number;
  componenteProduto: {
    id: string;
    codigoInterno: string;
    nome: string;
    custoBase: number;
  };
};

function gerarCodigoCompra(numero: number) {
  return `PC${String(numero).padStart(6, "0")}`;
}

function gerarCodigoMovimentacao() {
  return `MOV-${randomUUID()}`;
}

function normalizarNumero(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(",", "."));
}

function normalizarTamanhoAnel(
  value: FormDataEntryValue | string | null | undefined
) {
  const tamanho = String(value || "").trim().toUpperCase();
  return tamanho || "UNICO";
}

function calcularRateioKit(
  componentes: KitComponenteComProduto[],
  valorTotalFinalItem: number
) {
  const pesos = componentes.map((componente) => {
    const custoBaseComponente = Number(
      componente.componenteProduto.custoBase || 0
    );

    return {
      componente,
      peso: custoBaseComponente * componente.quantidade,
    };
  });

  const pesoTotal = pesos.reduce((acc, item) => acc + item.peso, 0);

  if (pesoTotal > 0) {
    return pesos.map((item) => ({
      componente: item.componente,
      valorRateado: valorTotalFinalItem * (item.peso / pesoTotal),
    }));
  }

  const quantidadeTotalComponentes = componentes.reduce(
    (acc, componente) => acc + componente.quantidade,
    0
  );

  return componentes.map((componente) => ({
    componente,
    valorRateado:
      quantidadeTotalComponentes > 0
        ? valorTotalFinalItem *
          (componente.quantidade / quantidadeTotalComponentes)
        : 0,
  }));
}

async function recalcularTotaisCompra(
  tx: Prisma.TransactionClient,
  compraId: string,
  frete: number
) {
  const itens = await tx.compraItem.findMany({
    where: { compraId },
  });

  const valorTotalBruto = itens.reduce(
    (acc, item) => acc + Number(item.valorTotalBase || 0),
    0
  );

  const valorTotalItens = itens.reduce(
    (acc, item) => acc + Number(item.valorTotalFinal || 0),
    0
  );

  await tx.compra.update({
    where: { id: compraId },
    data: {
      valorTotalBruto,
      valorTotalFinal: valorTotalItens + Number(frete || 0),
    },
  });
}

async function registrarEntradaEstoqueProduto({
  tx,
  produtoId,
  tamanhoAnel,
  quantidade,
  valorEntrada,
}: {
  tx: Prisma.TransactionClient;
  produtoId: string;
  tamanhoAnel: string;
  quantidade: number;
  valorEntrada: number;
}) {
  const estoqueAtual = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId,
        tamanhoAnel,
      },
    },
  });

  if (!estoqueAtual) {
    await tx.estoqueProduto.create({
      data: {
        produtoId,
        tamanhoAnel,
        quantidadeAtual: quantidade,
        valorAcumulado: valorEntrada,
        custoMedio: quantidade > 0 ? valorEntrada / quantidade : 0,
      },
    });

    return;
  }

  const novaQuantidade = estoqueAtual.quantidadeAtual + quantidade;
  const novoValorAcumulado = estoqueAtual.valorAcumulado + valorEntrada;

  await tx.estoqueProduto.update({
    where: { id: estoqueAtual.id },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: novoValorAcumulado,
      custoMedio: novaQuantidade > 0 ? novoValorAcumulado / novaQuantidade : 0,
    },
  });
}

async function registrarSaidaEstoqueProduto({
  tx,
  produtoId,
  tamanhoAnel,
  quantidade,
  valorSaida,
  descricao,
}: {
  tx: Prisma.TransactionClient;
  produtoId: string;
  tamanhoAnel: string;
  quantidade: number;
  valorSaida: number;
  descricao: string;
}) {
  const estoqueAtual = await tx.estoqueProduto.findUnique({
    where: {
      produtoId_tamanhoAnel: {
        produtoId,
        tamanhoAnel,
      },
    },
  });

  if (!estoqueAtual) {
    throw new Error(`Estoque do produto não encontrado: ${descricao}`);
  }

  if (estoqueAtual.quantidadeAtual < quantidade) {
    throw new Error(
      `Não é possível remover ${descricao}: saldo atual insuficiente no estoque.`
    );
  }

  const novaQuantidade = estoqueAtual.quantidadeAtual - quantidade;
  const novoValorAcumulado = Math.max(0, estoqueAtual.valorAcumulado - valorSaida);

  await tx.estoqueProduto.update({
    where: { id: estoqueAtual.id },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: novoValorAcumulado,
      custoMedio: novaQuantidade > 0 ? novoValorAcumulado / novaQuantidade : 0,
    },
  });
}

async function registrarEntradaEstoqueAdicional({
  tx,
  itemAdicionalId,
  quantidade,
  valorEntrada,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  valorEntrada: number;
}) {
  const estoqueAtual = await tx.estoqueAdicional.findUnique({
    where: { itemAdicionalId },
  });

  if (!estoqueAtual) {
    await tx.estoqueAdicional.create({
      data: {
        itemAdicionalId,
        quantidadeAtual: quantidade,
        valorAcumulado: valorEntrada,
        custoMedio: quantidade > 0 ? valorEntrada / quantidade : 0,
      },
    });

    return;
  }

  const novaQuantidade = estoqueAtual.quantidadeAtual + quantidade;
  const novoValorAcumulado = estoqueAtual.valorAcumulado + valorEntrada;

  await tx.estoqueAdicional.update({
    where: { id: estoqueAtual.id },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: novoValorAcumulado,
      custoMedio: novaQuantidade > 0 ? novoValorAcumulado / novaQuantidade : 0,
    },
  });
}

async function registrarSaidaEstoqueAdicional({
  tx,
  itemAdicionalId,
  quantidade,
  valorSaida,
  descricao,
}: {
  tx: Prisma.TransactionClient;
  itemAdicionalId: string;
  quantidade: number;
  valorSaida: number;
  descricao: string;
}) {
  const estoqueAtual = await tx.estoqueAdicional.findUnique({
    where: { itemAdicionalId },
  });

  if (!estoqueAtual) {
    throw new Error(`Estoque do item adicional não encontrado: ${descricao}`);
  }

  if (estoqueAtual.quantidadeAtual < quantidade) {
    throw new Error(
      `Não é possível remover ${descricao}: saldo atual insuficiente no estoque.`
    );
  }

  const novaQuantidade = estoqueAtual.quantidadeAtual - quantidade;
  const novoValorAcumulado = Math.max(0, estoqueAtual.valorAcumulado - valorSaida);

  await tx.estoqueAdicional.update({
    where: { id: estoqueAtual.id },
    data: {
      quantidadeAtual: novaQuantidade,
      valorAcumulado: novoValorAcumulado,
      custoMedio: novaQuantidade > 0 ? novoValorAcumulado / novaQuantidade : 0,
    },
  });
}

export async function criarCompra(formData: FormData) {
  const fornecedor = String(formData.get("fornecedor") || "").trim();
  const descontoPercentual = normalizarNumero(formData.get("descontoPercentual"));
  const frete = normalizarNumero(formData.get("frete"));
  const observacoes = String(formData.get("observacoes") || "").trim();

  if (!fornecedor) {
    throw new Error("Fornecedor é obrigatório.");
  }

  const ultimoRegistro = await prisma.compra.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigo: true },
  });

  let proximoNumero = 1;

  if (ultimoRegistro?.codigo) {
    const numeroAtual = Number(ultimoRegistro.codigo.replace("PC", ""));
    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  const codigo = gerarCodigoCompra(proximoNumero);

  await prisma.compra.create({
    data: {
      codigo,
      fornecedor,
      descontoPercentual: descontoPercentual || 0,
      frete: frete || 0,
      observacoes: observacoes || null,
      valorTotalBruto: 0,
      valorTotalFinal: 0,
    },
  });

  revalidatePath("/compras");
  revalidatePath("/compras/estoque");
}

export async function adicionarItemCompra(compraId: string, formData: FormData) {
  const tipoItem = String(formData.get("tipoItem") || "").trim();
  const codigoDigitado = String(formData.get("codigoDigitado") || "").trim();
  const quantidade = Number(formData.get("quantidade") || 0);
  const valorUnitarioBase = normalizarNumero(formData.get("valorUnitarioBase"));
  const tamanhoAnel = normalizarTamanhoAnel(formData.get("tamanhoAnel"));
  const motivo = String(
    formData.get("motivo") || "Inclusão posterior de item na compra."
  ).trim();

  if (!tipoItem) {
    throw new Error("Tipo do item é obrigatório.");
  }

  if (!codigoDigitado) {
    throw new Error("Código do item é obrigatório.");
  }

  if (quantidade <= 0) {
    throw new Error("Quantidade deve ser maior que zero.");
  }

  if (valorUnitarioBase <= 0) {
    throw new Error("Valor unitário deve ser maior que zero.");
  }

  await prisma.$transaction(
    async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: compraId },
      });

      if (!compra) {
        throw new Error("Compra não encontrada.");
      }

      let descricao = "";
      let produtoId: string | null = null;
      let itemAdicionalId: string | null = null;
      let valorUnitarioFinal = valorUnitarioBase;

      if (tipoItem === "produto") {
        const produto = await tx.produto.findFirst({
          where: {
            OR: [
              { codigoInterno: codigoDigitado },
              { codigoFornecedor: codigoDigitado },
            ],
          },
          include: {
            componentesDoKit: {
              include: {
                componenteProduto: {
                  select: {
                    id: true,
                    codigoInterno: true,
                    nome: true,
                    custoBase: true,
                  },
                },
              },
            },
          },
        });

        if (!produto) {
          throw new Error("Produto não encontrado.");
        }

        descricao = produto.nome;
        produtoId = produto.id;
        valorUnitarioFinal =
          valorUnitarioBase *
          (1 - (Number(compra.descontoPercentual) || 0) / 100);

        const valorTotalBase = quantidade * valorUnitarioBase;
        const valorTotalFinalItem = quantidade * valorUnitarioFinal;

        const compraItem = await tx.compraItem.create({
          data: {
            compraId,
            tipoItem,
            codigoDigitado,
            descricao,
            quantidade,
            tamanhoAnel: produto.tipoProduto === "KIT" ? null : tamanhoAnel,
            valorUnitarioBase,
            valorUnitarioFinal,
            valorTotalBase,
            valorTotalFinal: valorTotalFinalItem,
            parcelaFrete: 0,
            valorTotalComFrete: valorTotalFinalItem,
            produtoId,
            itemAdicionalId: null,
          },
        });

        if (produto.tipoProduto !== "KIT") {
          await registrarEntradaEstoqueProduto({
            tx,
            produtoId,
            tamanhoAnel,
            quantidade,
            valorEntrada: valorTotalFinalItem,
          });

          await tx.movimentacao.create({
            data: {
              codigoMovimentacao: gerarCodigoMovimentacao(),
              tipoMovimentacao: "AJUSTE COMPRA ADIÇÃO",
              origemTipo: "ajuste_compra_adicao",
              origemId: compraId,
              codigoItem: codigoDigitado,
              itemTipo: "produto",
              quantidade,
              tamanhoAnel,
              custo: valorTotalFinalItem,
              faturamento: 0,
              status: "ATIVA",
              relacionadoA: compraItem.id,
              gastoProdutoPrincipal: 0,
              gastoAdd1: 0,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });
        } else {
          if (produto.componentesDoKit.length === 0) {
            throw new Error(`O kit ${produto.nome} não possui componentes.`);
          }

          await tx.movimentacao.create({
            data: {
              codigoMovimentacao: gerarCodigoMovimentacao(),
              tipoMovimentacao: "AJUSTE COMPRA ADIÇÃO KIT",
              origemTipo: "ajuste_compra_adicao_kit",
              origemId: compraId,
              codigoItem: produto.codigoInterno,
              itemTipo: "kit",
              quantidade,
              tamanhoAnel: null,
              custo: valorTotalFinalItem,
              faturamento: 0,
              status: "INFO",
              relacionadoA: compraItem.id,
              gastoProdutoPrincipal: 0,
              gastoAdd1: 0,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });

          const rateios = calcularRateioKit(
            produto.componentesDoKit,
            valorTotalFinalItem
          );

          for (const rateio of rateios) {
            const componente = rateio.componente;
            const produtoComponente = componente.componenteProduto;
            const quantidadeEntrada = quantidade * componente.quantidade;

            await registrarEntradaEstoqueProduto({
              tx,
              produtoId: produtoComponente.id,
              tamanhoAnel: "UNICO",
              quantidade: quantidadeEntrada,
              valorEntrada: rateio.valorRateado,
            });

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: gerarCodigoMovimentacao(),
                tipoMovimentacao: "ENTRADA COMPONENTE KIT",
                origemTipo: "ajuste_compra_kit_componente",
                origemId: compraId,
                codigoItem: produtoComponente.codigoInterno,
                itemTipo: "produto",
                quantidade: quantidadeEntrada,
                tamanhoAnel: "UNICO",
                custo: rateio.valorRateado,
                faturamento: 0,
                status: "ATIVA",
                relacionadoA: compraItem.id,
                gastoProdutoPrincipal: 0,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: gerarCodigoMovimentacao(),
            tipoMovimentacao: "REGISTRO DE AJUSTE",
            origemTipo: "ajuste_compra_observacao",
            origemId: compraId,
            codigoItem: codigoDigitado,
            itemTipo: tipoItem,
            quantidade,
            tamanhoAnel: produto.tipoProduto === "KIT" ? null : tamanhoAnel,
            custo: 0,
            faturamento: 0,
            status: "INFO",
            relacionadoA: motivo,
            gastoProdutoPrincipal: 0,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
          },
        });

        await recalcularTotaisCompra(tx, compraId, Number(compra.frete || 0));
        return;
      }

      if (tipoItem === "adicional") {
        const item = await tx.itemAdicional.findFirst({
          where: {
            OR: [
              { codigoInterno: codigoDigitado },
              { codigoFornecedor: codigoDigitado },
            ],
          },
        });

        if (!item) {
          throw new Error("Item adicional não encontrado.");
        }

        descricao = item.nome;
        itemAdicionalId = item.id;
        valorUnitarioFinal = valorUnitarioBase;

        const valorTotalBase = quantidade * valorUnitarioBase;
        const valorTotalFinalItem = quantidade * valorUnitarioFinal;

        const compraItem = await tx.compraItem.create({
          data: {
            compraId,
            tipoItem,
            codigoDigitado,
            descricao,
            quantidade,
            tamanhoAnel: null,
            valorUnitarioBase,
            valorUnitarioFinal,
            valorTotalBase,
            valorTotalFinal: valorTotalFinalItem,
            parcelaFrete: 0,
            valorTotalComFrete: valorTotalFinalItem,
            produtoId: null,
            itemAdicionalId,
          },
        });

        await registrarEntradaEstoqueAdicional({
          tx,
          itemAdicionalId,
          quantidade,
          valorEntrada: valorTotalFinalItem,
        });

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: gerarCodigoMovimentacao(),
            tipoMovimentacao: "AJUSTE COMPRA ADIÇÃO",
            origemTipo: "ajuste_compra_adicao",
            origemId: compraId,
            codigoItem: codigoDigitado,
            itemTipo: "adicional",
            quantidade,
            tamanhoAnel: null,
            custo: valorTotalFinalItem,
            faturamento: 0,
            status: "ATIVA",
            relacionadoA: compraItem.id,
            gastoProdutoPrincipal: 0,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
          },
        });

        await recalcularTotaisCompra(tx, compraId, Number(compra.frete || 0));
        return;
      }

      throw new Error("Item inválido.");
    },
    {
      maxWait: 15000,
      timeout: 120000,
    }
  );

  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/compras");
  revalidatePath("/compras/estoque");
  revalidatePath("/estoque");
  revalidatePath("/movimentacoes");
}

export async function alterarQuantidadeItemCompra(
  compraId: string,
  itemId: string,
  novaQuantidade: number,
  motivo = "Alteração de quantidade de item da compra."
) {
  if (!compraId) {
    throw new Error("Compra não informada.");
  }

  if (!itemId) {
    throw new Error("Item não informado.");
  }

  if (!Number.isFinite(novaQuantidade) || novaQuantidade <= 0) {
    throw new Error("A nova quantidade deve ser maior que zero.");
  }

  await prisma.$transaction(
    async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: compraId },
      });

      if (!compra) {
        throw new Error("Compra não encontrada.");
      }

      const item = await tx.compraItem.findUnique({
        where: { id: itemId },
        include: {
          produto: {
            include: {
              componentesDoKit: {
                include: {
                  componenteProduto: {
                    select: {
                      id: true,
                      codigoInterno: true,
                      nome: true,
                      custoBase: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!item || item.compraId !== compraId) {
        throw new Error("Item da compra não encontrado.");
      }

      const quantidadeAntiga = item.quantidade;
      const diferenca = novaQuantidade - quantidadeAntiga;

      if (diferenca === 0) {
        return;
      }

      const novoValorTotalBase = novaQuantidade * item.valorUnitarioBase;
      const novoValorTotalFinal = novaQuantidade * item.valorUnitarioFinal;
      const novoValorTotalComFrete =
        novoValorTotalFinal + Number(item.parcelaFrete || 0);
      const diferencaValorComFrete =
        novoValorTotalComFrete - item.valorTotalComFrete;

      const produtoEhKit = item.produto?.tipoProduto === "KIT";

      if (item.tipoItem === "produto" && item.produtoId && item.produto) {
        if (!produtoEhKit) {
          const tamanhoAnel = normalizarTamanhoAnel(item.tamanhoAnel);

          if (diferenca > 0) {
            await registrarEntradaEstoqueProduto({
              tx,
              produtoId: item.produtoId,
              tamanhoAnel,
              quantidade: diferenca,
              valorEntrada: Math.abs(diferencaValorComFrete),
            });
          } else {
            await registrarSaidaEstoqueProduto({
              tx,
              produtoId: item.produtoId,
              tamanhoAnel,
              quantidade: Math.abs(diferenca),
              valorSaida: Math.abs(diferencaValorComFrete),
              descricao: item.descricao,
            });
          }

          await tx.movimentacao.create({
            data: {
              codigoMovimentacao: gerarCodigoMovimentacao(),
              tipoMovimentacao:
                diferenca > 0
                  ? "AJUSTE COMPRA AUMENTO QTD"
                  : "AJUSTE COMPRA REDUÇÃO QTD",
              origemTipo: "ajuste_compra_alteracao_qtd",
              origemId: compraId,
              codigoItem: item.codigoDigitado,
              itemTipo: "produto",
              quantidade: Math.abs(diferenca),
              tamanhoAnel,
              custo: diferencaValorComFrete,
              faturamento: 0,
              status: "ATIVA",
              relacionadoA: `${itemId} | ${motivo} | qtd ${quantidadeAntiga} -> ${novaQuantidade}`,
              gastoProdutoPrincipal: 0,
              gastoAdd1: 0,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });
        } else {
          if (item.produto.componentesDoKit.length === 0) {
            throw new Error(`O kit ${item.produto.nome} não possui componentes.`);
          }

          const rateios = calcularRateioKit(
            item.produto.componentesDoKit,
            Math.abs(diferencaValorComFrete)
          );

          for (const rateio of rateios) {
            const componente = rateio.componente;
            const produtoComponente = componente.componenteProduto;
            const quantidadeAjuste =
              Math.abs(diferenca) * componente.quantidade;

            if (diferenca > 0) {
              await registrarEntradaEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: "UNICO",
                quantidade: quantidadeAjuste,
                valorEntrada: rateio.valorRateado,
              });
            } else {
              await registrarSaidaEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: "UNICO",
                quantidade: quantidadeAjuste,
                valorSaida: rateio.valorRateado,
                descricao: produtoComponente.nome,
              });
            }

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: gerarCodigoMovimentacao(),
                tipoMovimentacao:
                  diferenca > 0
                    ? "AJUSTE COMPRA AUMENTO COMPONENTE KIT"
                    : "AJUSTE COMPRA REDUÇÃO COMPONENTE KIT",
                origemTipo: "ajuste_compra_kit_componente_qtd",
                origemId: compraId,
                codigoItem: produtoComponente.codigoInterno,
                itemTipo: "produto",
                quantidade: quantidadeAjuste,
                tamanhoAnel: "UNICO",
                custo: diferenca > 0 ? rateio.valorRateado : -rateio.valorRateado,
                faturamento: 0,
                status: "ATIVA",
                relacionadoA: `${itemId} | ${motivo} | kit ${quantidadeAntiga} -> ${novaQuantidade}`,
                gastoProdutoPrincipal: 0,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          }
        }
      }

      if (item.tipoItem === "adicional" && item.itemAdicionalId) {
        if (diferenca > 0) {
          await registrarEntradaEstoqueAdicional({
            tx,
            itemAdicionalId: item.itemAdicionalId,
            quantidade: diferenca,
            valorEntrada: Math.abs(diferencaValorComFrete),
          });
        } else {
          await registrarSaidaEstoqueAdicional({
            tx,
            itemAdicionalId: item.itemAdicionalId,
            quantidade: Math.abs(diferenca),
            valorSaida: Math.abs(diferencaValorComFrete),
            descricao: item.descricao,
          });
        }

        await tx.movimentacao.create({
          data: {
            codigoMovimentacao: gerarCodigoMovimentacao(),
            tipoMovimentacao:
              diferenca > 0
                ? "AJUSTE COMPRA AUMENTO QTD"
                : "AJUSTE COMPRA REDUÇÃO QTD",
            origemTipo: "ajuste_compra_alteracao_qtd",
            origemId: compraId,
            codigoItem: item.codigoDigitado,
            itemTipo: "adicional",
            quantidade: Math.abs(diferenca),
            tamanhoAnel: null,
            custo: diferencaValorComFrete,
            faturamento: 0,
            status: "ATIVA",
            relacionadoA: `${itemId} | ${motivo} | qtd ${quantidadeAntiga} -> ${novaQuantidade}`,
            gastoProdutoPrincipal: 0,
            gastoAdd1: 0,
            gastoAdd2: 0,
            gastoAdd3: 0,
          },
        });
      }

      await tx.compraItem.update({
        where: { id: itemId },
        data: {
          quantidade: novaQuantidade,
          valorTotalBase: novoValorTotalBase,
          valorTotalFinal: novoValorTotalFinal,
          valorTotalComFrete: novoValorTotalComFrete,
        },
      });

      await recalcularTotaisCompra(tx, compraId, Number(compra.frete || 0));
    },
    {
      maxWait: 15000,
      timeout: 120000,
    }
  );

  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/compras");
  revalidatePath("/compras/estoque");
  revalidatePath("/estoque");
  revalidatePath("/movimentacoes");
}

export async function cancelarItensCompra(compraId: string, itemIds: string[]) {
  if (!itemIds.length) {
    throw new Error("Nenhum item selecionado.");
  }

  await prisma.$transaction(
    async (tx) => {
      const compra = await tx.compra.findUnique({
        where: { id: compraId },
      });

      if (!compra) {
        throw new Error("Compra não encontrada.");
      }

      const itens = await tx.compraItem.findMany({
        where: {
          compraId,
          id: { in: itemIds },
        },
        include: {
          produto: {
            include: {
              componentesDoKit: {
                include: {
                  componenteProduto: {
                    select: {
                      id: true,
                      codigoInterno: true,
                      nome: true,
                      custoBase: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const item of itens) {
        const produtoEhKit = item.produto?.tipoProduto === "KIT";

        if (item.tipoItem === "produto" && item.produtoId && item.produto) {
          if (!produtoEhKit) {
            const tamanhoAnel = normalizarTamanhoAnel(item.tamanhoAnel);

            await registrarSaidaEstoqueProduto({
              tx,
              produtoId: item.produtoId,
              tamanhoAnel,
              quantidade: item.quantidade,
              valorSaida: item.valorTotalComFrete,
              descricao: item.descricao,
            });

            await tx.movimentacao.create({
              data: {
                codigoMovimentacao: gerarCodigoMovimentacao(),
                tipoMovimentacao: "AJUSTE COMPRA EXCLUSÃO",
                origemTipo: "ajuste_compra_exclusao",
                origemId: compraId,
                codigoItem: item.codigoDigitado,
                itemTipo: "produto",
                quantidade: item.quantidade,
                tamanhoAnel,
                custo: -item.valorTotalComFrete,
                faturamento: 0,
                status: "ESTORNO",
                relacionadoA: item.id,
                gastoProdutoPrincipal: 0,
                gastoAdd1: 0,
                gastoAdd2: 0,
                gastoAdd3: 0,
              },
            });
          } else {
            if (item.produto.componentesDoKit.length === 0) {
              throw new Error(`O kit ${item.produto.nome} não possui componentes.`);
            }

            const rateios = calcularRateioKit(
              item.produto.componentesDoKit,
              item.valorTotalComFrete
            );

            for (const rateio of rateios) {
              const componente = rateio.componente;
              const produtoComponente = componente.componenteProduto;
              const quantidadeSaida = item.quantidade * componente.quantidade;

              await registrarSaidaEstoqueProduto({
                tx,
                produtoId: produtoComponente.id,
                tamanhoAnel: "UNICO",
                quantidade: quantidadeSaida,
                valorSaida: rateio.valorRateado,
                descricao: produtoComponente.nome,
              });

              await tx.movimentacao.create({
                data: {
                  codigoMovimentacao: gerarCodigoMovimentacao(),
                  tipoMovimentacao: "AJUSTE COMPRA EXCLUSÃO COMPONENTE KIT",
                  origemTipo: "ajuste_compra_exclusao_kit_componente",
                  origemId: compraId,
                  codigoItem: produtoComponente.codigoInterno,
                  itemTipo: "produto",
                  quantidade: quantidadeSaida,
                  tamanhoAnel: "UNICO",
                  custo: -rateio.valorRateado,
                  faturamento: 0,
                  status: "ESTORNO",
                  relacionadoA: item.id,
                  gastoProdutoPrincipal: 0,
                  gastoAdd1: 0,
                  gastoAdd2: 0,
                  gastoAdd3: 0,
                },
              });
            }
          }
        }

        if (item.tipoItem === "adicional" && item.itemAdicionalId) {
          await registrarSaidaEstoqueAdicional({
            tx,
            itemAdicionalId: item.itemAdicionalId,
            quantidade: item.quantidade,
            valorSaida: item.valorTotalComFrete,
            descricao: item.descricao,
          });

          await tx.movimentacao.create({
            data: {
              codigoMovimentacao: gerarCodigoMovimentacao(),
              tipoMovimentacao: "AJUSTE COMPRA EXCLUSÃO",
              origemTipo: "ajuste_compra_exclusao",
              origemId: compraId,
              codigoItem: item.codigoDigitado,
              itemTipo: "adicional",
              quantidade: item.quantidade,
              tamanhoAnel: null,
              custo: -item.valorTotalComFrete,
              faturamento: 0,
              status: "ESTORNO",
              relacionadoA: item.id,
              gastoProdutoPrincipal: 0,
              gastoAdd1: 0,
              gastoAdd2: 0,
              gastoAdd3: 0,
            },
          });
        }
      }

      await tx.compraItem.deleteMany({
        where: {
          compraId,
          id: { in: itemIds },
        },
      });

      await recalcularTotaisCompra(tx, compraId, Number(compra.frete || 0));
    },
    {
      maxWait: 15000,
      timeout: 120000,
    }
  );

  revalidatePath(`/compras/${compraId}`);
  revalidatePath("/compras");
  revalidatePath("/compras/estoque");
  revalidatePath("/estoque");
  revalidatePath("/movimentacoes");
}
