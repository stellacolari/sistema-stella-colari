import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHAVE_CONFIG = "PADRAO";

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

function parseNumero(value: unknown, fallback = 0) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  const normalizado = raw.replace(",", ".");
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

export async function GET() {
  try {
    const config = await prisma.lojaCashbackConfiguracao.upsert({
      where: {
        chave: CHAVE_CONFIG,
      },
      create: {
        chave: CHAVE_CONFIG,
        ativo: true,
        percentualPrimeiraCompra: 10,
        percentualCompraRecorrente: 5,
        somenteClienteCadastrado: true,
        permitirComCupom: false,
        permitirProdutoComDesconto: true,
      },
      update: {},
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Erro ao buscar configuração de cashback:", error);

    return NextResponse.json(
      { error: "Erro ao buscar configuração de cashback." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const ativo = parseBoolean(body.ativo, true);
    const percentualPrimeiraCompra = parseNumero(
      body.percentualPrimeiraCompra,
      10
    );
    const percentualCompraRecorrente = parseNumero(
      body.percentualCompraRecorrente,
      5
    );
    const somenteClienteCadastrado = parseBoolean(
      body.somenteClienteCadastrado,
      true
    );
    const permitirComCupom = parseBoolean(body.permitirComCupom, false);
    const permitirProdutoComDesconto = parseBoolean(
      body.permitirProdutoComDesconto,
      true
    );
    const diasValidade = parseInteiroOuNull(body.diasValidade);

    if (percentualPrimeiraCompra < 0 || percentualPrimeiraCompra > 100) {
      return NextResponse.json(
        { error: "Percentual da primeira compra deve estar entre 0 e 100." },
        { status: 400 }
      );
    }

    if (percentualCompraRecorrente < 0 || percentualCompraRecorrente > 100) {
      return NextResponse.json(
        { error: "Percentual recorrente deve estar entre 0 e 100." },
        { status: 400 }
      );
    }

    const config = await prisma.lojaCashbackConfiguracao.upsert({
      where: {
        chave: CHAVE_CONFIG,
      },
      create: {
        chave: CHAVE_CONFIG,
        ativo,
        percentualPrimeiraCompra,
        percentualCompraRecorrente,
        somenteClienteCadastrado,
        permitirComCupom,
        permitirProdutoComDesconto,
        diasValidade,
      },
      update: {
        ativo,
        percentualPrimeiraCompra,
        percentualCompraRecorrente,
        somenteClienteCadastrado,
        permitirComCupom,
        permitirProdutoComDesconto,
        diasValidade,
      },
    });

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("Erro ao salvar configuração de cashback:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar configuração de cashback.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}