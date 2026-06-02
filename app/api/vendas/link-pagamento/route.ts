import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calcularEstoqueProdutoVenda } from "@/lib/loja/estoque";

type ItemLinkPagamentoPayload = {
  id: string;
  quantidade: number;
  tamanhoAnel?: string | null;
};

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const url = new URL(req.url);

  return `${url.protocol}//${url.host}`;
}

function gerarCodigoPedido(numero: number) {
  return `PO${String(numero).padStart(6, "0")}`;
}

async function gerarProximoCodigoPedido(tx: Prisma.TransactionClient) {
  const ultimoPedido = await tx.pedidoOnline.findFirst({
    where: {
      codigo: {
        startsWith: "PO",
      },
    },
    orderBy: {
      codigo: "desc",
    },
    select: {
      codigo: true,
    },
  });

  let proximoNumero = 1;

  if (ultimoPedido?.codigo) {
    const numeroAtual = Number(ultimoPedido.codigo.replace("PO", ""));

    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const codigo = gerarCodigoPedido(proximoNumero + tentativa);
    const existente = await tx.pedidoOnline.findUnique({
      where: { codigo },
      select: { id: true },
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar um código único para o pedido.");
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clienteId = String(body.clienteId || "").trim();
    const meioVenda = String(body.meioVenda || "").trim();
    const descontoPercentual = Number(body.descontoPercentual || 0);
    const observacoes = String(body.observacoes || "").trim();
    const itens: ItemLinkPagamentoPayload[] = Array.isArray(body.itens)
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

    if (meioVenda.trim().toUpperCase() === "SITE") {
      return NextResponse.json(
        { error: "Site é reservado para pedidos online." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0) {
      return NextResponse.json(
        { error: "Desconto inválido." },
        { status: 400 }
      );
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um produto." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        documento: true,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const pedido = await prisma.$transaction(async (tx) => {
      const codigo = await gerarProximoCodigoPedido(tx);
      let subtotal = 0;

      const itensProcessados = [];

      for (const item of itens) {
        const quantidade = Number(item.quantidade || 0);

        if (!item.id || !Number.isFinite(quantidade) || quantidade <= 0) {
          throw new Error("Existe um item inválido na venda.");
        }

        const produto = await tx.produto.findUnique({
          where: { id: item.id },
          include: {
            imagens: {
              orderBy: {
                ordem: "asc",
              },
              select: {
                imagemUrl: true,
              },
              take: 1,
            },
            estoque: {
              select: {
                tamanhoAnel: true,
                quantidadeAtual: true,
              },
              orderBy: {
                tamanhoAnel: "asc",
              },
            },
            componentesDoKit: {
              select: {
                quantidade: true,
                componenteProduto: {
                  select: {
                    id: true,
                    codigoInterno: true,
                    nome: true,
                    estoque: {
                      select: {
                        tamanhoAnel: true,
                        quantidadeAtual: true,
                      },
                      orderBy: {
                        tamanhoAnel: "asc",
                      },
                    },
                  },
                },
              },
              orderBy: {
                criadoEm: "asc",
              },
            },
          },
        });

        if (!produto || !produto.ativo || produto.status === "NA_LIXEIRA") {
          throw new Error("Um dos produtos selecionados está indisponível.");
        }

        const estoque = calcularEstoqueProdutoVenda({
          tipoProduto: produto.tipoProduto,
          estoque: produto.estoque,
          componentesDoKit: produto.componentesDoKit,
        });

        if (quantidade > estoque.estoqueAtual) {
          throw new Error(
            `Saldo insuficiente para ${produto.nome}. Saldo atual: ${estoque.estoqueAtual}.`
          );
        }

        const exigeTamanho =
          produto.tipoProduto !== "KIT" && produtoExigeTamanhoAnel(produto.categoria);
        const tamanhoAnel = exigeTamanho
          ? normalizarTamanhoAnel(item.tamanhoAnel)
          : null;

        if (exigeTamanho && !tamanhoAnel) {
          throw new Error(`Informe o tamanho do anel para ${produto.nome}.`);
        }

        if (exigeTamanho) {
          const estoqueTamanho =
            estoque.estoquesPorTamanho.find(
              (estoqueItem) =>
                normalizarTamanhoAnel(estoqueItem.tamanhoAnel) === tamanhoAnel
            )?.quantidadeAtual ?? 0;

          if (quantidade > estoqueTamanho) {
            throw new Error(
              `Saldo insuficiente para ${produto.nome} tamanho ${tamanhoAnel}. Saldo atual: ${estoqueTamanho}.`
            );
          }
        }

        const precoOriginal = Number(produto.precoVenda);
        const precoUnitario =
          precoOriginal * (1 - Number(descontoPercentual || 0) / 100);

        if (precoUnitario <= 0) {
          throw new Error("O total do pedido é inválido para pagamento.");
        }

        const total = precoUnitario * quantidade;
        subtotal += total;

        itensProcessados.push({
          produto,
          quantidade,
          tamanhoAnel,
          precoOriginal,
          precoUnitario,
          total,
        });
      }

      if (subtotal <= 0) {
        throw new Error("O total do pedido é inválido para pagamento.");
      }

      return tx.pedidoOnline.create({
        data: {
          codigo,
          clienteId: cliente.id,
          nomeCliente: cliente.nome,
          telefoneCliente: cliente.telefone,
          emailCliente: cliente.email,
          documento: cliente.documento,
          subtotal,
          frete: 0,
          total: subtotal,
          valorPago: 0,
          status: "AGUARDANDO_PAGAMENTO",
          statusPagamento: "AGUARDANDO_PAGAMENTO",
          origemCanal: "ADMIN_MANUAL",
          observacoes: observacoes || null,
          dadosOriginaisJson: {
            origem: "ADMIN_MANUAL",
            meioVenda,
            descontoPercentual,
          },
          statusHistorico: {
            create: {
              statusAnterior: null,
              statusNovo: "AGUARDANDO_PAGAMENTO",
              tipoEvento: "CRIACAO",
              origem: "ADMIN_MANUAL",
              usuarioNome: "Sistema",
              observacao: "Link de pagamento manual gerado pelo admin.",
            },
          },
          itens: {
            create: itensProcessados.map((item) => ({
              produtoId: item.produto.id,
              codigoInterno: item.produto.codigoInterno,
              nomeProduto: item.produto.nome,
              imagemUrl:
                item.produto.imagens[0]?.imagemUrl ??
                item.produto.imagemUrl ??
                null,
              categoria: item.produto.categoria,
              tamanhoAnel: item.tamanhoAnel,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              precoOriginal: item.precoOriginal,
              descontoPercentual,
              total: item.total,
            })),
          },
        },
        select: {
          id: true,
          codigo: true,
          total: true,
          nomeCliente: true,
          emailCliente: true,
        },
      });
    });

    const totalCentavos = Math.round(Number(pedido.total || 0) * 100);

    if (totalCentavos <= 0) {
      return NextResponse.json(
        { error: "O total do pedido é inválido para pagamento." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: pedido.emailCliente || undefined,
      client_reference_id: pedido.id,
      metadata: {
        pedidoId: pedido.id,
        pedidoCodigo: pedido.codigo,
        clienteId: cliente.id,
        origem: "ADMIN_MANUAL",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: totalCentavos,
            product_data: {
              name: `Pedido ${pedido.codigo} - Stella`,
              description: `Venda manual para ${pedido.nomeCliente}`,
            },
          },
        },
      ],
      success_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=sucesso`,
      cancel_url: `${baseUrl}/loja/pedido/${pedido.codigo}?pagamento=cancelado`,
    });

    await prisma.pedidoOnline.update({
      where: { id: pedido.id },
      data: {
        gatewayPagamento: "STRIPE",
        gatewayPedidoId: session.id,
        metodoPagamento: "STRIPE_CHECKOUT",
        pagamentoObservacao: "Link de pagamento manual criado via Stripe.",
      },
    });

    return NextResponse.json({
      ok: true,
      pedidoId: pedido.id,
      pedidoCodigo: pedido.codigo,
      paymentUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Erro ao gerar link de pagamento:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao gerar link de pagamento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
