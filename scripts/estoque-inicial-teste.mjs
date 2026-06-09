import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRMACAO = process.env.CONFIRMAR_ESTOQUE_TESTE;

const QUANTIDADE_PRODUTOS = 20;
const QUANTIDADE_ADICIONAIS = 100;

async function main() {
  console.log("\nESTOQUE INICIAL DE TESTE");
  console.log("Este script cria estoque temporário para operação/testes.");
  console.log(`Produtos: ${QUANTIDADE_PRODUTOS} unidades cada.`);
  console.log(`Itens adicionais: ${QUANTIDADE_ADICIONAIS} unidades cada.\n`);

  if (CONFIRMACAO !== "SIM") {
    console.error("Operação bloqueada.");
    console.error("Para executar, rode:");
    console.error("CONFIRMAR_ESTOQUE_TESTE=SIM npm run db:estoque-teste");
    process.exit(1);
  }

  const produtos = await prisma.produto.findMany({
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      custoBase: true,
      ativo: true,
      status: true,
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
      ativo: true,
      status: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  console.log(`Produtos encontrados: ${produtos.length}`);
  console.log(`Itens adicionais encontrados: ${adicionais.length}`);

  const resultado = await prisma.$transaction(
    async (tx) => {
      let produtosAtualizados = 0;
      let adicionaisAtualizados = 0;

      for (const produto of produtos) {
        const custoMedio = Number(produto.custoBase || 0);
        const valorAcumulado = custoMedio * QUANTIDADE_PRODUTOS;

        await tx.estoqueProduto.upsert({
          where: {
            produtoId_tamanhoAnel: {
              produtoId: produto.id,
              tamanhoAnel: "UNICO",
            },
          },
          create: {
            produtoId: produto.id,
            tamanhoAnel: "UNICO",
            quantidadeAtual: QUANTIDADE_PRODUTOS,
            custoMedio,
            valorAcumulado,
          },
          update: {
            quantidadeAtual: QUANTIDADE_PRODUTOS,
            custoMedio,
            valorAcumulado,
          },
        });

        produtosAtualizados++;
      }

      for (const adicional of adicionais) {
        const custoMedio = Number(adicional.custoBase || 0);
        const valorAcumulado = custoMedio * QUANTIDADE_ADICIONAIS;

        await tx.estoqueAdicional.upsert({
          where: {
            itemAdicionalId: adicional.id,
          },
          create: {
            itemAdicionalId: adicional.id,
            quantidadeAtual: QUANTIDADE_ADICIONAIS,
            custoMedio,
            valorAcumulado,
          },
          update: {
            quantidadeAtual: QUANTIDADE_ADICIONAIS,
            custoMedio,
            valorAcumulado,
          },
        });

        adicionaisAtualizados++;
      }

      return {
        produtosAtualizados,
        adicionaisAtualizados,
      };
    },
    {
      maxWait: 10000,
      timeout: 60000,
    }
  );

  console.log("\nEstoque de teste criado/atualizado com sucesso.");
  console.log(`Produtos atualizados: ${resultado.produtosAtualizados}`);
  console.log(`Itens adicionais atualizados: ${resultado.adicionaisAtualizados}`);

  console.log("\nResumo:");
  console.log(`Cada produto ficou com ${QUANTIDADE_PRODUTOS} unidades em tamanho UNICO.`);
  console.log(`Cada item adicional ficou com ${QUANTIDADE_ADICIONAIS} unidades.`);
  console.log("Nenhuma compra, venda ou movimentação foi criada.\n");
}

main()
  .catch((erro) => {
    console.error("\nErro ao criar estoque de teste:");
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });