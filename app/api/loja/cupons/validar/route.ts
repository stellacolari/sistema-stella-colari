import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterClienteAutenticadoId } from "@/lib/loja/cliente-sessao.server";

function normalizarCodigoCupom(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function parseNumero(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) return fallback;

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");
  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : fallback;
}

function calcularDescontoCupom({
  tipo,
  valor,
  subtotal,
}: {
  tipo: string;
  valor: number;
  subtotal: number;
}) {
  if (tipo === "PERCENTUAL") {
    return Math.min(subtotal, subtotal * (valor / 100));
  }

  if (tipo === "VALOR_FIXO") {
    return Math.min(subtotal, valor);
  }

  return 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const clienteId = await obterClienteAutenticadoId();
    const codigo = normalizarCodigoCupom(body.codigo);
    const subtotal = parseNumero(body.subtotal, 0);

    if (!codigo) {
      return NextResponse.json(
        { error: "Informe o código do cupom." },
        { status: 400 }
      );
    }

    if (subtotal <= 0) {
      return NextResponse.json(
        { error: "Subtotal inválido para aplicar cupom." },
        { status: 400 }
      );
    }

    const cupom = await prisma.cupomLoja.findUnique({
      where: {
        codigo,
      },
    });

    if (!cupom || !cupom.ativo) {
      return NextResponse.json(
        { error: "Cupom inválido ou inativo." },
        { status: 404 }
      );
    }

    const agora = new Date();

    if (cupom.dataInicio && cupom.dataInicio > agora) {
      return NextResponse.json(
        { error: "Este cupom ainda não está disponível." },
        { status: 400 }
      );
    }

    if (cupom.dataFim) {
      const dataFimLimite = new Date(cupom.dataFim);
      dataFimLimite.setHours(23, 59, 59, 999);

      if (dataFimLimite < agora) {
        return NextResponse.json(
          { error: "Este cupom expirou." },
          { status: 400 }
        );
      }
    }

    if (subtotal < Number(cupom.valorMinimoPedido || 0)) {
      return NextResponse.json(
        {
          error: `Pedido mínimo para este cupom: ${new Intl.NumberFormat(
            "pt-BR",
            {
              style: "currency",
              currency: "BRL",
            }
          ).format(Number(cupom.valorMinimoPedido || 0))}.`,
        },
        { status: 400 }
      );
    }

    if (
      cupom.limiteUsoTotal !== null &&
      cupom.limiteUsoTotal !== undefined &&
      cupom.quantidadeUsada >= cupom.limiteUsoTotal
    ) {
      return NextResponse.json(
        { error: "Este cupom atingiu o limite de uso." },
        { status: 400 }
      );
    }

    if (
      clienteId &&
      cupom.limiteUsoPorCliente !== null &&
      cupom.limiteUsoPorCliente !== undefined
    ) {
      const usosCliente = await prisma.pedidoOnline.count({
        where: {
          clienteId,
          cupomId: cupom.id,
        },
      });

      if (usosCliente >= cupom.limiteUsoPorCliente) {
        return NextResponse.json(
          { error: "Você já atingiu o limite de uso deste cupom." },
          { status: 400 }
        );
      }
    }

    const descontoValor = calcularDescontoCupom({
      tipo: cupom.tipo,
      valor: Number(cupom.valor || 0),
      subtotal,
    });

    return NextResponse.json({
      cupom: {
        id: cupom.id,
        codigo: cupom.codigo,
        nome: cupom.nome,
        tipo: cupom.tipo,
        valor: Number(cupom.valor || 0),
        valorMinimoPedido: Number(cupom.valorMinimoPedido || 0),
        bloqueiaCashback: cupom.bloqueiaCashback,
        limiteUsoPorCliente: cupom.limiteUsoPorCliente,
        clienteLogado: Boolean(clienteId),
        descontoValor,
      },
    });
  } catch (error) {
    console.error("Erro ao validar cupom:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao validar cupom.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
