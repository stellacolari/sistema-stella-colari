import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_RESTAURACAO_PADRAO = "NOVO";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const acao = String(body.acao || "").trim();

    if (!["MOVER", "RESTAURAR"].includes(acao)) {
      return NextResponse.json(
        { error: "Ação inválida para lixeira." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        statusAntesLixeira: true,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const statusAtual = cliente.status || STATUS_RESTAURACAO_PADRAO;

    if (acao === "MOVER") {
      if (statusAtual === "NA_LIXEIRA") {
        return NextResponse.json(
          { error: "Este cliente já está na lixeira." },
          { status: 400 }
        );
      }

      await prisma.cliente.update({
        where: { id },
        data: {
          statusAntesLixeira: statusAtual,
          status: "NA_LIXEIRA",
        },
      });

      return NextResponse.json({ ok: true, status: "NA_LIXEIRA" });
    }

    if (statusAtual !== "NA_LIXEIRA") {
      return NextResponse.json(
        { error: "Este cliente não está na lixeira." },
        { status: 400 }
      );
    }

    const statusRestaurado =
      cliente.statusAntesLixeira || STATUS_RESTAURACAO_PADRAO;

    await prisma.cliente.update({
      where: { id },
      data: {
        status: statusRestaurado,
        statusAntesLixeira: null,
      },
    });

    return NextResponse.json({ ok: true, status: statusRestaurado });
  } catch (error) {
    console.error("Erro na lixeira de clientes:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar lixeira.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}