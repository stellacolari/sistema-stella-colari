import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CANAIS_VALIDOS = new Set([
  "MERCADO_LIVRE",
  "SHOPEE",
  "TIKTOK_SHOP",
  "OUTRO",
]);

const STATUS_PEDIDO_VALIDOS = new Set([
  "PEDIDO_RECEBIDO",
  "PEDIDO_SEPARADO",
  "PEDIDO_ENVIADO",
  "PEDIDO_ENTREGUE",
  "CANCELADO",
  "PROBLEMA",
]);

const STATUS_PAGAMENTO_VALIDOS = new Set([
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "RECUSADO",
  "ESTORNADO",
  "CANCELADO",
]);

const STATUS_ENVIO_VALIDOS = new Set([
  "PENDENTE",
  "COTADO",
  "ETIQUETA_GERADA",
  "POSTADO",
  "ENTREGUE",
  "PROBLEMA",
]);

type ItemExternoInput = {
  produtoId?: unknown;
  codigoInterno?: unknown;
  skuExterno?: unknown;
  nomeProduto?: unknown;
  imagemUrl?: unknown;
  categoria?: unknown;
  tamanhoAnel?: unknown;
  quantidade?: unknown;
  precoUnitario?: unknown;
  precoOriginal?: unknown;
  descontoPercentual?: unknown;
  total?: unknown;
};

function parseString(value: unknown, fallback = "") {
  const parsed = String(value ?? "").trim();

  return parsed || fallback;
}

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function parseNumero(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");

  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return fallback;
  }

  return numero;
}

function parseInteiro(value: unknown, fallback = 0) {
  const numero = parseNumero(value, fallback);

  return Math.trunc(numero);
}

function normalizarTamanhoPedidoExterno(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || "UNICO";
}

function gerarCodigoBasePedidoExterno(origemCanal: string) {
  const prefixo =
    origemCanal === "MERCADO_LIVRE"
      ? "ML"
      : origemCanal === "SHOPEE"
      ? "SH"
      : origemCanal === "TIKTOK_SHOP"
      ? "TK"
      : "EXT";

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");
  const segundo = String(agora.getSeconds()).padStart(2, "0");

  return `${prefixo}-${ano}${mes}${dia}-${hora}${minuto}${segundo}`;
}

async function gerarCodigoPedidoUnico(origemCanal: string) {
  const base = gerarCodigoBasePedidoExterno(origemCanal);

  for (let tentativa = 1; tentativa <= 20; tentativa += 1) {
    const sufixo = String(tentativa).padStart(2, "0");
    const codigo = `${base}-${sufixo}`;

    const existente = await prisma.pedidoOnline.findUnique({
      where: { codigo },
      select: { id: true },
    });

    if (!existente) {
      return codigo;
    }
  }

  return `${base}-${Date.now()}`;
}

async function buscarProdutoPorVinculoCanal({
  origemCanal,
  skuExterno,
}: {
  origemCanal: string;
  skuExterno: string;
}) {
  if (!skuExterno) {
    return null;
  }

  const vinculo = await prisma.produtoCanal.findFirst({
    where: {
      canal: origemCanal,
      skuExterno,
      ativo: true,
    },
    include: {
      produto: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          imagemUrl: true,
          categoria: true,
          precoVenda: true,
        },
      },
    },
  });

  return vinculo?.produto || null;
}

async function buscarProdutoFallbackPorCodigoInterno(codigoInterno: string) {
  if (!codigoInterno) {
    return null;
  }

  return prisma.produto.findUnique({
    where: {
      codigoInterno,
    },
    select: {
      id: true,
      codigoInterno: true,
      nome: true,
      imagemUrl: true,
      categoria: true,
      precoVenda: true,
    },
  });
}

async function montarItensPedido({
  origemCanal,
  itensInput,
}: {
  origemCanal: string;
  itensInput: ItemExternoInput[];
}) {
  const itens = [];

  for (const item of itensInput) {
    const codigoDigitado = parseString(item.codigoInterno);
    const skuExterno = parseString(item.skuExterno, codigoDigitado);
    const quantidade = Math.max(1, parseInteiro(item.quantidade, 1));
    const precoUnitario = parseNumero(item.precoUnitario, 0);
    const totalInformado = parseNumero(item.total, quantidade * precoUnitario);

  const produto =
    (await buscarProdutoPorVinculoCanal({
      origemCanal,
      skuExterno,
    })) || (await buscarProdutoFallbackPorCodigoInterno(codigoDigitado));

    const nomeProduto =
      parseString(item.nomeProduto) || produto?.nome || "Produto externo";

    const precoFinal =
      precoUnitario > 0 ? precoUnitario : Number(produto?.precoVenda || 0);

    itens.push({
      produtoId: parseStringOrNull(item.produtoId) || produto?.id || null,
      codigoInterno:
        produto?.codigoInterno || codigoDigitado || skuExterno || "EXTERNO",
      nomeProduto,
      imagemUrl: parseStringOrNull(item.imagemUrl) || produto?.imagemUrl || null,
      categoria: parseString(item.categoria, produto?.categoria || "Externo"),
      tamanhoAnel: normalizarTamanhoPedidoExterno(item.tamanhoAnel),
      quantidade,
      precoUnitario: precoFinal,
      precoOriginal:
        item.precoOriginal === null || typeof item.precoOriginal === "undefined"
          ? null
          : parseNumero(item.precoOriginal, precoFinal),
      descontoPercentual:
        item.descontoPercentual === null ||
        typeof item.descontoPercentual === "undefined"
          ? null
          : parseNumero(item.descontoPercentual, 0),
      geraCashback: false,
      cashbackBaseValor: 0,
      total: totalInformado > 0 ? totalInformado : quantidade * precoFinal,
    });
  }

  return itens;
}

function calcularSubtotalItens(
  itens: {
    total: number;
  }[]
) {
  return itens.reduce((total, item) => total + Number(item.total || 0), 0);
}

function getDatasEnvio(statusEnvio: string) {
  const agora = new Date();

  if (statusEnvio === "POSTADO") {
    return {
      postadoEm: agora,
      entregueEm: null,
    };
  }

  if (statusEnvio === "ENTREGUE") {
    return {
      postadoEm: agora,
      entregueEm: agora,
    };
  }

  return {
    postadoEm: null,
    entregueEm: null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const origemCanal = parseString(body.origemCanal);
    const codigoPedidoExterno = parseString(body.codigoPedidoExterno);

    if (!CANAIS_VALIDOS.has(origemCanal)) {
      return NextResponse.json(
        {
          error:
            "Canal inválido. Use MERCADO_LIVRE, SHOPEE, TIKTOK_SHOP ou OUTRO.",
        },
        { status: 400 }
      );
    }

    if (!codigoPedidoExterno) {
      return NextResponse.json(
        { error: "Código externo do pedido é obrigatório." },
        { status: 400 }
      );
    }

    const nomeCliente = parseString(body.nomeCliente, "Cliente externo");
    const telefoneCliente = parseString(body.telefoneCliente, "SEM_TELEFONE");

    const status = parseString(body.status, "PEDIDO_RECEBIDO");
    const statusPagamento = parseString(
      body.statusPagamento,
      "AGUARDANDO_PAGAMENTO"
    );

    if (!STATUS_PEDIDO_VALIDOS.has(status)) {
      return NextResponse.json(
        { error: "Status operacional inválido." },
        { status: 400 }
      );
    }

    if (!STATUS_PAGAMENTO_VALIDOS.has(statusPagamento)) {
      return NextResponse.json(
        { error: "Status de pagamento inválido." },
        { status: 400 }
      );
    }

    const itensInput = Array.isArray(body.itens) ? body.itens : [];

    if (itensInput.length === 0) {
      return NextResponse.json(
        { error: "Inclua ao menos um item no pedido externo." },
        { status: 400 }
      );
    }

    const itens = await montarItensPedido({
      origemCanal,
      itensInput,
    });

    const subtotalCalculado = calcularSubtotalItens(itens);
    const subtotal = parseNumero(body.subtotal, subtotalCalculado);
    const frete = parseNumero(body.frete, 0);
    const total = parseNumero(body.total, subtotal + frete);
    const valorPago = parseNumero(
      body.valorPago,
      statusPagamento === "PAGO" ? total : 0
    );

    const statusEnvio = parseString(body.envio?.statusEnvio, "PENDENTE");

    if (!STATUS_ENVIO_VALIDOS.has(statusEnvio)) {
      return NextResponse.json(
        { error: "Status de envio inválido." },
        { status: 400 }
      );
    }

    const datasEnvio = getDatasEnvio(statusEnvio);

    const existente = await prisma.pedidoOnline.findFirst({
      where: {
        origemCanal,
        codigoPedidoExterno,
      },
      select: {
        id: true,
        codigo: true,
        status: true,
      },
    });

    const resultado = await prisma.$transaction(async (tx) => {
      if (existente) {
        const pedido = await tx.pedidoOnline.update({
          where: {
            id: existente.id,
          },
          data: {
            origemCanal,
            codigoPedidoExterno,
            statusExterno: parseStringOrNull(body.statusExterno),
            substatusExterno: parseStringOrNull(body.substatusExterno),
            dadosOriginaisJson: body.dadosOriginaisJson ?? body,

            nomeCliente,
            telefoneCliente,
            emailCliente: parseStringOrNull(body.emailCliente),
            documento: parseStringOrNull(body.documento),

            cep: parseStringOrNull(body.cep),
            rua: parseStringOrNull(body.rua),
            numero: parseStringOrNull(body.numero),
            complemento: parseStringOrNull(body.complemento),
            bairro: parseStringOrNull(body.bairro),
            cidade: parseStringOrNull(body.cidade),
            estado: parseStringOrNull(body.estado),

            subtotal,
            frete,
            total,

            status,
            statusPagamento,
            metodoPagamento: parseStringOrNull(body.metodoPagamento),
            gatewayPagamento: parseStringOrNull(body.gatewayPagamento),
            gatewayPedidoId: parseStringOrNull(body.gatewayPedidoId),
            gatewayPagamentoId: parseStringOrNull(body.gatewayPagamentoId),
            pagoEm: statusPagamento === "PAGO" ? new Date() : null,
            valorPago,
            pagamentoObservacao: parseStringOrNull(body.pagamentoObservacao),
            observacoes: parseStringOrNull(body.observacoes),
          },
          select: {
            id: true,
            codigo: true,
            origemCanal: true,
            codigoPedidoExterno: true,
            status: true,
            statusPagamento: true,
          },
        });

        await tx.pedidoOnlineItem.deleteMany({
          where: {
            pedidoOnlineId: existente.id,
          },
        });

        await tx.pedidoOnlineItem.createMany({
          data: itens.map((item) => ({
            pedidoOnlineId: existente.id,
            ...item,
          })),
        });

        await tx.pedidoEnvio.upsert({
          where: {
            pedidoOnlineId: existente.id,
          },
          create: {
            pedidoOnlineId: existente.id,
            tipoEntrega: parseString(body.envio?.tipoEntrega, "ENTREGA"),
            transportadora: parseStringOrNull(body.envio?.transportadora),
            servico: parseStringOrNull(body.envio?.servico),
            statusEnvio,
            cepOrigem: parseStringOrNull(body.envio?.cepOrigem),
            cepDestino:
              parseStringOrNull(body.envio?.cepDestino) ||
              parseStringOrNull(body.cep),
            valorFrete: frete,
            prazoDias:
              typeof body.envio?.prazoDias === "undefined"
                ? null
                : parseInteiro(body.envio?.prazoDias, 0),
            codigoRastreio: parseStringOrNull(body.envio?.codigoRastreio),
            etiquetaUrl: parseStringOrNull(body.envio?.etiquetaUrl),
            etiquetaPdfUrl: parseStringOrNull(body.envio?.etiquetaPdfUrl),
            declaracaoConteudoUrl: parseStringOrNull(
              body.envio?.declaracaoConteudoUrl
            ),
            gatewayLogistico: parseStringOrNull(body.envio?.gatewayLogistico),
            gatewayEnvioId: parseStringOrNull(body.envio?.gatewayEnvioId),
            observacoes: parseStringOrNull(body.envio?.observacoes),
            postadoEm: datasEnvio.postadoEm,
            entregueEm: datasEnvio.entregueEm,
          },
          update: {
            tipoEntrega: parseString(body.envio?.tipoEntrega, "ENTREGA"),
            transportadora: parseStringOrNull(body.envio?.transportadora),
            servico: parseStringOrNull(body.envio?.servico),
            statusEnvio,
            cepOrigem: parseStringOrNull(body.envio?.cepOrigem),
            cepDestino:
              parseStringOrNull(body.envio?.cepDestino) ||
              parseStringOrNull(body.cep),
            valorFrete: frete,
            prazoDias:
              typeof body.envio?.prazoDias === "undefined"
                ? null
                : parseInteiro(body.envio?.prazoDias, 0),
            codigoRastreio: parseStringOrNull(body.envio?.codigoRastreio),
            etiquetaUrl: parseStringOrNull(body.envio?.etiquetaUrl),
            etiquetaPdfUrl: parseStringOrNull(body.envio?.etiquetaPdfUrl),
            declaracaoConteudoUrl: parseStringOrNull(
              body.envio?.declaracaoConteudoUrl
            ),
            gatewayLogistico: parseStringOrNull(body.envio?.gatewayLogistico),
            gatewayEnvioId: parseStringOrNull(body.envio?.gatewayEnvioId),
            observacoes: parseStringOrNull(body.envio?.observacoes),
            postadoEm: datasEnvio.postadoEm,
            entregueEm: datasEnvio.entregueEm,
          },
        });

        if (status !== existente.status) {
          await tx.pedidoStatusHistorico.create({
            data: {
              pedidoOnlineId: existente.id,
              statusAnterior: existente.status,
              statusNovo: status,
              tipoEvento: "SISTEMA",
              origem: origemCanal,
              usuarioNome: "Integração",
              observacao: "Pedido externo atualizado por importação.",
            },
          });
        }

        return {
          acao: "ATUALIZADO",
          pedido,
        };
      }

      const codigo = await gerarCodigoPedidoUnico(origemCanal);

      const pedido = await tx.pedidoOnline.create({
        data: {
          codigo,
          origemCanal,
          codigoPedidoExterno,
          statusExterno: parseStringOrNull(body.statusExterno),
          substatusExterno: parseStringOrNull(body.substatusExterno),
          dadosOriginaisJson: body.dadosOriginaisJson ?? body,

          nomeCliente,
          telefoneCliente,
          emailCliente: parseStringOrNull(body.emailCliente),
          documento: parseStringOrNull(body.documento),

          cep: parseStringOrNull(body.cep),
          rua: parseStringOrNull(body.rua),
          numero: parseStringOrNull(body.numero),
          complemento: parseStringOrNull(body.complemento),
          bairro: parseStringOrNull(body.bairro),
          cidade: parseStringOrNull(body.cidade),
          estado: parseStringOrNull(body.estado),

          subtotal,
          frete,
          total,

          status,
          statusPagamento,
          metodoPagamento: parseStringOrNull(body.metodoPagamento),
          gatewayPagamento: parseStringOrNull(body.gatewayPagamento),
          gatewayPedidoId: parseStringOrNull(body.gatewayPedidoId),
          gatewayPagamentoId: parseStringOrNull(body.gatewayPagamentoId),
          pagoEm: statusPagamento === "PAGO" ? new Date() : null,
          valorPago,
          pagamentoObservacao: parseStringOrNull(body.pagamentoObservacao),
          observacoes: parseStringOrNull(body.observacoes),

          cashbackBaseValor: 0,
          cashbackPrevistoValor: 0,
          cashbackCreditadoValor: 0,
          cashbackStatus: "NAO_APLICAVEL",

          itens: {
            create: itens,
          },
          envio: {
            create: {
              tipoEntrega: parseString(body.envio?.tipoEntrega, "ENTREGA"),
              transportadora: parseStringOrNull(body.envio?.transportadora),
              servico: parseStringOrNull(body.envio?.servico),
              statusEnvio,
              cepOrigem: parseStringOrNull(body.envio?.cepOrigem),
              cepDestino:
                parseStringOrNull(body.envio?.cepDestino) ||
                parseStringOrNull(body.cep),
              valorFrete: frete,
              prazoDias:
                typeof body.envio?.prazoDias === "undefined"
                  ? null
                  : parseInteiro(body.envio?.prazoDias, 0),
              codigoRastreio: parseStringOrNull(body.envio?.codigoRastreio),
              etiquetaUrl: parseStringOrNull(body.envio?.etiquetaUrl),
              etiquetaPdfUrl: parseStringOrNull(body.envio?.etiquetaPdfUrl),
              declaracaoConteudoUrl: parseStringOrNull(
                body.envio?.declaracaoConteudoUrl
              ),
              gatewayLogistico: parseStringOrNull(body.envio?.gatewayLogistico),
              gatewayEnvioId: parseStringOrNull(body.envio?.gatewayEnvioId),
              observacoes: parseStringOrNull(body.envio?.observacoes),
              postadoEm: datasEnvio.postadoEm,
              entregueEm: datasEnvio.entregueEm,
            },
          },
          statusHistorico: {
            create: {
              statusAnterior: null,
              statusNovo: status,
              tipoEvento: "SISTEMA",
              origem: origemCanal,
              usuarioNome: "Integração",
              observacao: "Pedido externo importado.",
            },
          },
        },
        select: {
          id: true,
          codigo: true,
          origemCanal: true,
          codigoPedidoExterno: true,
          status: true,
          statusPagamento: true,
        },
      });

      return {
        acao: "CRIADO",
        pedido,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao importar pedido externo:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao importar pedido externo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}