import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIRMACAO = process.env.CONFIRMAR_LIMPEZA;

const modelos = [
  ["pedidoOnlineItemAdicional", "PedidoOnlineItemAdicional"],
  ["pedidoOnlineItem", "PedidoOnlineItem"],
  ["pedidoEnvio", "PedidoEnvio"],
  ["pedidoStatusHistorico", "PedidoStatusHistorico"],
  ["pedidoOnline", "PedidoOnline"],

  ["vendaItem", "VendaItem"],
  ["venda", "Venda"],

  ["compraItem", "CompraItem"],
  ["compra", "Compra"],

  ["movimentacaoAdicional", "MovimentacaoAdicional"],
  ["movimentacao", "Movimentacao"],

  ["clienteCashbackMovimentacao", "ClienteCashbackMovimentacao"],
  ["cliente", "Cliente"],

  ["estoqueProduto", "EstoqueProduto"],
  ["estoqueAdicional", "EstoqueAdicional"],

  ["lojaFormularioResposta", "LojaFormularioResposta"],
];

async function contarRegistros() {
  const resultado = {};

  for (const [clientKey, nomeModelo] of modelos) {
    if (!prisma[clientKey]) {
      resultado[nomeModelo] = "MODELO_NAO_ENCONTRADO";
      continue;
    }

    resultado[nomeModelo] = await prisma[clientKey].count();
  }

  resultado.CupomLoja = await prisma.cupomLoja.count();

  return resultado;
}

function imprimirResumo(titulo, dados) {
  console.log(`\n${titulo}`);
  console.log("=".repeat(titulo.length));

  for (const [modelo, total] of Object.entries(dados)) {
    console.log(`${modelo}: ${total}`);
  }
}

async function limparBaseTeste() {
  console.log("\nLIMPEZA OPERACIONAL DA BASE DE TESTES");
  console.log("Esta ação apaga pedidos, vendas, compras, estoque, clientes e históricos.");
  console.log("Produtos, categorias, imagens e configurações da loja serão preservados.\n");

  if (CONFIRMACAO !== "SIM") {
    console.error("Operação bloqueada.");
    console.error("Para executar, rode:");
    console.error("CONFIRMAR_LIMPEZA=SIM npm run db:limpar-teste");
    process.exit(1);
  }

  const antes = await contarRegistros();
  imprimirResumo("Registros antes da limpeza", antes);

  const resultado = await prisma.$transaction(
    async (tx) => {
      const apagados = {};

      // Pedidos online e dependências
      apagados.PedidoOnlineItemAdicional = await tx.pedidoOnlineItemAdicional.deleteMany();
      apagados.PedidoOnlineItem = await tx.pedidoOnlineItem.deleteMany();
      apagados.PedidoEnvio = await tx.pedidoEnvio.deleteMany();
      apagados.PedidoStatusHistorico = await tx.pedidoStatusHistorico.deleteMany();
      apagados.PedidoOnline = await tx.pedidoOnline.deleteMany();

      // Vendas
      apagados.VendaItem = await tx.vendaItem.deleteMany();
      apagados.Venda = await tx.venda.deleteMany();

      // Compras
      apagados.CompraItem = await tx.compraItem.deleteMany();
      apagados.Compra = await tx.compra.deleteMany();

      // Movimentações
      apagados.MovimentacaoAdicional = await tx.movimentacaoAdicional.deleteMany();
      apagados.Movimentacao = await tx.movimentacao.deleteMany();

      // Cashback e clientes
      apagados.ClienteCashbackMovimentacao = await tx.clienteCashbackMovimentacao.deleteMany();
      apagados.Cliente = await tx.cliente.deleteMany();

      // Estoque
      apagados.EstoqueProduto = await tx.estoqueProduto.deleteMany();
      apagados.EstoqueAdicional = await tx.estoqueAdicional.deleteMany();

      // Formulários/leads de teste
      apagados.LojaFormularioResposta = await tx.lojaFormularioResposta.deleteMany();

      // Como os pedidos foram apagados, zera contador operacional dos cupons
      const cuponsAtualizados = await tx.cupomLoja.updateMany({
        data: {
          quantidadeUsada: 0,
        },
      });

      apagados.CupomLoja_quantidadeUsada_resetada = cuponsAtualizados;

      return apagados;
    },
    {
      maxWait: 10000,
      timeout: 60000,
    }
  );

  console.log("\nRegistros apagados");
  console.log("=================");

  for (const [modelo, retorno] of Object.entries(resultado)) {
    if (typeof retorno === "object" && retorno !== null && "count" in retorno) {
      console.log(`${modelo}: ${retorno.count}`);
    } else {
      console.log(`${modelo}: ${JSON.stringify(retorno)}`);
    }
  }

  const depois = await contarRegistros();
  imprimirResumo("Registros depois da limpeza", depois);

  console.log("\nLimpeza concluída com sucesso.");
  console.log("Produtos, imagens, categorias e configurações da loja foram preservados.\n");
}

limparBaseTeste()
  .catch((erro) => {
    console.error("\nErro ao limpar a base de testes:");
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });