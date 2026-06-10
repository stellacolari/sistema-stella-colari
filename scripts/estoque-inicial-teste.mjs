import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRMACAO = process.env.CONFIRMAR_ESTOQUE_TESTE;

const QUANTIDADE_PRODUTOS = 20;
const QUANTIDADE_ADICIONAIS = 100;
const LIMITE_EXEMPLOS_DISTRIBUICAO = 12;

function normalizarTexto(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarMedida(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function medidaSortKey(medida) {
  const medidaNormalizada = normalizarMedida(medida);
  const numero = Number(medidaNormalizada.replace(",", "."));

  if (medidaNormalizada && Number.isFinite(numero)) {
    return {
      tipo: 0,
      numero,
      texto: medidaNormalizada,
    };
  }

  return {
    tipo: 1,
    numero: 0,
    texto: medidaNormalizada.toLocaleLowerCase("pt-BR"),
  };
}

function ordenarMedidas(medidas) {
  return [...medidas].sort((a, b) => {
    const chaveA = medidaSortKey(a);
    const chaveB = medidaSortKey(b);

    if (chaveA.tipo !== chaveB.tipo) {
      return chaveA.tipo - chaveB.tipo;
    }

    if (chaveA.tipo === 0 && chaveA.numero !== chaveB.numero) {
      return chaveA.numero - chaveB.numero;
    }

    return chaveA.texto.localeCompare(chaveB.texto, "pt-BR", {
      numeric: true,
    });
  });
}

function montarMedidasDisponiveis(produto) {
  const medidasPorChave = new Map();

  for (const variacao of produto.variacoes) {
    for (const opcao of variacao.opcoes) {
      const medida = normalizarMedida(opcao.nome);
      const chave = normalizarTexto(medida);

      if (!medida || chave === "unico") {
        continue;
      }

      if (!medidasPorChave.has(chave)) {
        medidasPorChave.set(chave, medida);
      }
    }
  }

  return ordenarMedidas([...medidasPorChave.values()]);
}

function produtoPareceAnel(produto) {
  return normalizarTexto(produto.categoria) === "anel";
}

function distribuirQuantidade(total, medidas) {
  const quantidadeBase = Math.floor(total / medidas.length);
  const resto = total % medidas.length;

  return medidas.map((medida, index) => ({
    medida,
    quantidade: quantidadeBase + (index < resto ? 1 : 0),
  }));
}

function formatarDistribuicao(distribuicao) {
  return distribuicao
    .map((item) => `${item.medida}=${item.quantidade}`)
    .join(", ");
}

function montarEstoquesProduto(produto) {
  const medidas = montarMedidasDisponiveis(produto);
  const medidasUsadas = medidas.length > 0 ? medidas : ["UNICO"];
  const distribuicao =
    medidas.length > 0
      ? distribuirQuantidade(QUANTIDADE_PRODUTOS, medidasUsadas)
      : [{ medida: "UNICO", quantidade: QUANTIDADE_PRODUTOS }];

  return {
    produto,
    medidas,
    distribuicao,
    estoques: distribuicao.map((item) =>
      montarEstoqueProduto({
        produto,
        tamanhoAnel: item.medida,
        quantidade: item.quantidade,
      }),
    ),
  };
}

function montarEstoqueProduto({ produto, tamanhoAnel, quantidade }) {
  const custoMedio = Number(produto.custoBase || 0);

  return {
    produtoId: produto.id,
    tamanhoAnel,
    quantidadeAtual: quantidade,
    custoMedio,
    valorAcumulado: quantidade * custoMedio,
  };
}

function montarEstoqueAdicional(itemAdicional) {
  const custoMedio = Number(itemAdicional.custoBase || 0);

  return {
    itemAdicionalId: itemAdicional.id,
    quantidadeAtual: QUANTIDADE_ADICIONAIS,
    custoMedio,
    valorAcumulado: QUANTIDADE_ADICIONAIS * custoMedio,
  };
}

function imprimirExemplosDistribuicao(distribuicoesProdutos) {
  const exemplos = distribuicoesProdutos
    .filter((item) => item.distribuicao.length > 1)
    .slice(0, LIMITE_EXEMPLOS_DISTRIBUICAO);

  if (exemplos.length === 0) {
    console.log("Nenhum produto com múltiplas medidas para exemplificar.");
    return;
  }

  console.log("\nExemplos de distribuição:");

  for (const item of exemplos) {
    console.log(
      `Produto ${item.produto.codigoInterno} - ${item.produto.nome}:`,
    );
    console.log(`Medidas: ${item.medidas.join(", ")}`);
    console.log(`Distribuição: ${formatarDistribuicao(item.distribuicao)}`);
  }
}

function imprimirAneisSemVariacao(produtos) {
  if (produtos.length === 0) {
    console.log("Produtos que parecem anel mas não tinham variação: 0");
    return;
  }

  console.log(
    `Produtos que parecem anel mas não tinham variação: ${produtos.length}`,
  );

  for (const produto of produtos) {
    console.log(
      `- ${produto.codigoInterno} - ${produto.nome}: Produto parece anel mas não possui variações ativas. Estoque criado como UNICO.`,
    );
  }
}

async function main() {
  console.log("\nESTOQUE TEMPORÁRIO DE TESTE");
  console.log("Este script apaga estoque e histórico de movimentação.");
  console.log(
    `Produtos: ${QUANTIDADE_PRODUTOS} unidades distribuídas entre medidas ativas, ou UNICO quando não houver medida.`,
  );
  console.log(`Itens adicionais: ${QUANTIDADE_ADICIONAIS} unidades cada.\n`);

  if (CONFIRMACAO !== "SIM") {
    console.error("Operação bloqueada.");
    console.error("Para executar, rode:");
    console.error("CONFIRMAR_ESTOQUE_TESTE=SIM npm run db:estoque-teste");
    console.error(
      'No PowerShell: $env:CONFIRMAR_ESTOQUE_TESTE="SIM"; npm run db:estoque-teste',
    );
    process.exit(1);
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const produtos = await tx.produto.findMany({
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          custoBase: true,
          variacoes: {
            where: {
              ativo: true,
            },
            select: {
              opcoes: {
                where: {
                  ativo: true,
                },
                select: {
                  nome: true,
                },
                orderBy: {
                  ordem: "asc",
                },
              },
            },
            orderBy: {
              ordem: "asc",
            },
          },
        },
        orderBy: {
          nome: "asc",
        },
      });

      const adicionais = await tx.itemAdicional.findMany({
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      });

      const distribuicoesProdutos = produtos.map(montarEstoquesProduto);
      const produtosComMedidas = distribuicoesProdutos.filter(
        (item) => item.medidas.length > 0,
      );
      const produtosSemMedidas = distribuicoesProdutos.filter(
        (item) => item.medidas.length === 0,
      );
      const aneisSemVariacao = produtosSemMedidas
        .map((item) => item.produto)
        .filter(produtoPareceAnel);
      const estoquesProdutos = distribuicoesProdutos.flatMap(
        (item) => item.estoques,
      );
      const estoquesAdicionais = adicionais.map(montarEstoqueAdicional);

      const movimentacoesAdicionaisApagadas =
        await tx.movimentacaoAdicional.deleteMany({});
      const movimentacoesApagadas = await tx.movimentacao.deleteMany({});
      await tx.estoqueProduto.deleteMany({});
      await tx.estoqueAdicional.deleteMany({});

      if (estoquesProdutos.length > 0) {
        await tx.estoqueProduto.createMany({
          data: estoquesProdutos,
        });
      }

      if (estoquesAdicionais.length > 0) {
        await tx.estoqueAdicional.createMany({
          data: estoquesAdicionais,
        });
      }

      return {
        produtosEncontrados: produtos.length,
        produtosComMedidas: produtosComMedidas.length,
        produtosSemMedidas: produtosSemMedidas.length,
        aneisSemVariacao,
        adicionaisEncontrados: adicionais.length,
        estoqueProdutoTotalCriado: estoquesProdutos.length,
        estoqueAdicionalTotalCriado: estoquesAdicionais.length,
        movimentacoesApagadas: movimentacoesApagadas.count,
        movimentacoesAdicionaisApagadas: movimentacoesAdicionaisApagadas.count,
        distribuicoesProdutos,
      };
    },
    {
      maxWait: 10000,
      timeout: 60000,
    },
  );

  console.log("\nEstoque temporário de teste recriado com sucesso.");
  console.log(
    `Total de produtos encontrados: ${resultado.produtosEncontrados}`,
  );
  console.log(
    `Produtos com medidas/variações ativas: ${resultado.produtosComMedidas}`,
  );
  console.log(
    `Produtos sem medidas, criados como UNICO: ${resultado.produtosSemMedidas}`,
  );
  imprimirAneisSemVariacao(resultado.aneisSemVariacao);
  console.log(
    `Itens adicionais encontrados: ${resultado.adicionaisEncontrados}`,
  );
  console.log(
    `Movimentacao apagadas: ${resultado.movimentacoesApagadas}`,
  );
  console.log(
    `MovimentacaoAdicional apagadas: ${resultado.movimentacoesAdicionaisApagadas}`,
  );
  console.log(
    `Registros EstoqueProduto criados: ${resultado.estoqueProdutoTotalCriado}`,
  );
  console.log(
    `Registros EstoqueAdicional criados: ${resultado.estoqueAdicionalTotalCriado}`,
  );
  imprimirExemplosDistribuicao(resultado.distribuicoesProdutos);
  console.log("Nenhuma compra, venda ou movimentação foi criada.");
  console.log("Produtos, variações e itens adicionais não foram alterados.\n");
}

main()
  .catch((erro) => {
    console.error("\nErro ao recriar estoque de teste:");
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
