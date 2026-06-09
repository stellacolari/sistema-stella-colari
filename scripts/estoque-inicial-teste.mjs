import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRMACAO = process.env.CONFIRMAR_ESTOQUE_TESTE;

const QUANTIDADE_UNICO = 20;
const QUANTIDADE_ANEL_POR_TAMANHO = 10;
const QUANTIDADE_ADICIONAIS = 100;
const TAMANHOS_ANEIS = ["16", "18"];

function normalizarTexto(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function produtoEhAnel(produto) {
  const categoriaNormalizada = normalizarTexto(produto.categoria);

  if (categoriaNormalizada === "anel") {
    return true;
  }

  return produto.variacoes.some((variacao) =>
    variacao.opcoes.some((opcao) => {
      const nomeOpcao = normalizarTexto(opcao.nome);

      return TAMANHOS_ANEIS.includes(nomeOpcao);
    }),
  );
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

async function main() {
  console.log("\nESTOQUE TEMPORÁRIO DE TESTE");
  console.log("Este script apaga e recria estoque para operação/testes.");
  console.log(`Produtos não-anéis: ${QUANTIDADE_UNICO} unidades em UNICO.`);
  console.log(
    `Anéis: ${QUANTIDADE_ANEL_POR_TAMANHO} unidades nos tamanhos ${TAMANHOS_ANEIS.join(
      " e ",
    )}.`,
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

  const produtos = await prisma.produto.findMany({
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
          },
        },
      },
    },
    orderBy: {
      nome: "asc",
    },
  });

  const adicionais = await prisma.itemAdicional.findMany({
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

  const produtosAneis = produtos.filter(produtoEhAnel);
  const produtosUnico = produtos.filter((produto) => !produtoEhAnel(produto));

  const estoquesProdutos = [
    ...produtosUnico.map((produto) =>
      montarEstoqueProduto({
        produto,
        tamanhoAnel: "UNICO",
        quantidade: QUANTIDADE_UNICO,
      }),
    ),
    ...produtosAneis.flatMap((produto) =>
      TAMANHOS_ANEIS.map((tamanhoAnel) =>
        montarEstoqueProduto({
          produto,
          tamanhoAnel,
          quantidade: QUANTIDADE_ANEL_POR_TAMANHO,
        }),
      ),
    ),
  ];

  const estoquesAdicionais = adicionais.map(montarEstoqueAdicional);

  console.log(`Produtos encontrados: ${produtos.length}`);
  console.log(`Anéis encontrados: ${produtosAneis.length}`);
  console.log(`Produtos UNICO encontrados: ${produtosUnico.length}`);
  console.log(`Itens adicionais encontrados: ${adicionais.length}`);

  const resultado = await prisma.$transaction(
    async (tx) => {
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
        aneisEncontrados: produtosAneis.length,
        produtosUnicoCriados: produtosUnico.length,
        estoquesTamanho16Criados: produtosAneis.length,
        estoquesTamanho18Criados: produtosAneis.length,
        adicionaisAtualizados: adicionais.length,
        estoqueProdutoTotalCriado: estoquesProdutos.length,
        estoqueAdicionalTotalCriado: estoquesAdicionais.length,
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
  console.log(`Total de anéis encontrados: ${resultado.aneisEncontrados}`);
  console.log(
    `Total de produtos UNICO criados: ${resultado.produtosUnicoCriados}`,
  );
  console.log(
    `Total de estoques tamanho 16 criados: ${resultado.estoquesTamanho16Criados}`,
  );
  console.log(
    `Total de estoques tamanho 18 criados: ${resultado.estoquesTamanho18Criados}`,
  );
  console.log(
    `Total de adicionais atualizados: ${resultado.adicionaisAtualizados}`,
  );
  console.log(
    `Registros EstoqueProduto criados: ${resultado.estoqueProdutoTotalCriado}`,
  );
  console.log(
    `Registros EstoqueAdicional criados: ${resultado.estoqueAdicionalTotalCriado}`,
  );
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
