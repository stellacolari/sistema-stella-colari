import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = new Set(["PERCENTUAL", "VALOR_FIXO", "FRETE_GRATIS"]);

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

  return Number.isFinite(numero) ? numero : fallback;
}

function parseInteiroOuNull(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const numero = Number(raw);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return Math.trunc(numero);
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function parseDataOuNull(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const data = new Date(`${raw}T00:00:00`);

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
}

function normalizarCodigoCupom(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export async function GET() {
  try {
    const cupons = await prisma.cupomLoja.findMany({
      orderBy: {
        criadoEm: "desc",
      },
    });

    return NextResponse.json({ cupons });
  } catch (error) {
    console.error("Erro ao listar cupons:", error);

    return NextResponse.json(
      { error: "Erro ao listar cupons." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const codigo = normalizarCodigoCupom(body.codigo);
    const nome = parseStringOrNull(body.nome);
    const tipo = String(body.tipo || "PERCENTUAL").trim().toUpperCase();
    const valor = parseNumero(body.valor, 0);
    const valorMinimoPedido = parseNumero(body.valorMinimoPedido, 0);
    const ativo = parseBoolean(body.ativo, true);
    const dataInicio = parseDataOuNull(body.dataInicio);
    const dataFim = parseDataOuNull(body.dataFim);
    const limiteUsoTotal = parseInteiroOuNull(body.limiteUsoTotal);
    const limiteUsoPorCliente = parseInteiroOuNull(body.limiteUsoPorCliente);
    const bloqueiaCashback = parseBoolean(body.bloqueiaCashback, true);

    if (!codigo) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório." },
        { status: 400 }
      );
    }

    if (!TIPOS_VALIDOS.has(tipo)) {
      return NextResponse.json(
        { error: "Tipo de cupom inválido." },
        { status: 400 }
      );
    }

    if (tipo !== "FRETE_GRATIS" && valor <= 0) {
      return NextResponse.json(
        { error: "Valor do cupom deve ser maior que zero." },
        { status: 400 }
      );
    }

    if (tipo === "PERCENTUAL" && valor > 100) {
      return NextResponse.json(
        { error: "Cupom percentual não pode ser maior que 100%." },
        { status: 400 }
      );
    }

    const cupomExistente = await prisma.cupomLoja.findUnique({
      where: {
        codigo,
      },
      select: {
        id: true,
      },
    });

    if (cupomExistente) {
      return NextResponse.json(
        { error: "Já existe um cupom com este código." },
        { status: 400 }
      );
    }

    const cupom = await prisma.cupomLoja.create({
      data: {
        codigo,
        nome,
        tipo,
        valor: tipo === "FRETE_GRATIS" ? 0 : valor,
        valorMinimoPedido,
        ativo,
        dataInicio,
        dataFim,
        limiteUsoTotal,
        limiteUsoPorCliente,
        bloqueiaCashback,
      },
    });

    return NextResponse.json({ cupom });
  } catch (error) {
    console.error("Erro ao criar cupom:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar cupom.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}