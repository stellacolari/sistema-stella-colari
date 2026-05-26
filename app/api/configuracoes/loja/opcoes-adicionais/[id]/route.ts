import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const existente = await prisma.categoriaOpcaoAdicional.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Opção adicional não encontrada." },
        { status: 404 }
      );
    }

    const categoriaId = String(body.categoriaId || "").trim();
    const nome = String(body.nome || "").trim();
    const descricao = parseStringOrNull(body.descricao);
    const itemPadraoSubstituidoId = parseStringOrNull(
      body.itemPadraoSubstituidoId
    );
    const itemAdicionalConsumidoId = String(
      body.itemAdicionalConsumidoId || ""
    ).trim();
    const valorVenda = parseNumero(body.valorVenda, 0);
    const ativo = parseBoolean(body.ativo, true);

    if (!categoriaId) {
      return NextResponse.json(
        { error: "Selecione uma categoria." },
        { status: 400 }
      );
    }

    if (!nome) {
      return NextResponse.json(
        { error: "Informe o nome da opção." },
        { status: 400 }
      );
    }

    if (!itemAdicionalConsumidoId) {
      return NextResponse.json(
        { error: "Selecione o item adicional consumido." },
        { status: 400 }
      );
    }

    if (valorVenda < 0) {
      return NextResponse.json(
        { error: "Valor de venda não pode ser negativo." },
        { status: 400 }
      );
    }

    const opcao = await prisma.categoriaOpcaoAdicional.update({
      where: { id },
      data: {
        categoriaId,
        nome,
        descricao,
        itemPadraoSubstituidoId,
        itemAdicionalConsumidoId,
        valorVenda,
        ativo,
      },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        itemPadraoSubstituido: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            custoBase: true,
          },
        },
        itemAdicionalConsumido: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            custoBase: true,
          },
        },
      },
    });

    return NextResponse.json({ opcao });
  } catch (error) {
    console.error("Erro ao atualizar opção adicional:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar opção adicional.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existente = await prisma.categoriaOpcaoAdicional.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Opção adicional não encontrada." },
        { status: 404 }
      );
    }

    await prisma.categoriaOpcaoAdicional.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir opção adicional:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao excluir opção adicional.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}