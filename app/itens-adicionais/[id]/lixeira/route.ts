import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function moverItemAdicionalParaLixeira(id: string) {
  const item = await prisma.itemAdicional.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      status: true,
      ativo: true,
    },
  });

  if (!item) {
    return {
      ok: false,
      status: 404,
      error: "Item adicional não encontrado.",
    };
  }

  if (item.status === "NA_LIXEIRA") {
    return {
      ok: true,
      status: 200,
      data: item,
    };
  }

  const itemAtualizado = await prisma.itemAdicional.update({
    where: {
      id,
    },
    data: {
      statusAntesLixeira: item.status,
      status: "NA_LIXEIRA",
      ativo: false,
    },
  });

  return {
    ok: true,
    status: 200,
    data: itemAtualizado,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await moverItemAdicionalParaLixeira(id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      item: result.data,
    });
  } catch (error) {
    console.error("Erro ao mover item adicional para a lixeira:", error);

    return NextResponse.json(
      { error: "Erro ao mover item adicional para a lixeira." },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await moverItemAdicionalParaLixeira(id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      item: result.data,
    });
  } catch (error) {
    console.error("Erro ao mover item adicional para a lixeira:", error);

    return NextResponse.json(
      { error: "Erro ao mover item adicional para a lixeira." },
      { status: 500 }
    );
  }
}