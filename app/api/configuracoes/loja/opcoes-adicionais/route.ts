
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

export async function GET() {
  try {
    const opcoes = await prisma.categoriaOpcaoAdicional.findMany({
      orderBy: [{ categoria: { nome: "asc" } }, { criadoEm: "desc" }],
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

    return NextResponse.json({ opcoes });
  } catch (error) {
    console.error("Erro ao listar opções adicionais:", error);

    return NextResponse.json(
      { error: "Erro ao listar opções adicionais." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

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

    const categoria = await prisma.categoriaProduto.findUnique({
      where: { id: categoriaId },
      select: { id: true },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    const itemConsumido = await prisma.itemAdicional.findUnique({
      where: { id: itemAdicionalConsumidoId },
      select: {
        id: true,
        ativo: true,
        status: true,
      },
    });

    if (!itemConsumido) {
      return NextResponse.json(
        { error: "Item adicional consumido não encontrado." },
        { status: 404 }
      );
    }

    if (!itemConsumido.ativo || itemConsumido.status === "NA_LIXEIRA") {
      return NextResponse.json(
        {
          error:
            "Não é possível usar um item adicional consumido inativo ou na lixeira.",
        },
        { status: 400 }
      );
    }

    if (itemPadraoSubstituidoId) {
      const itemPadrao = await prisma.itemAdicional.findUnique({
        where: { id: itemPadraoSubstituidoId },
        select: {
          id: true,
          ativo: true,
          status: true,
        },
      });

      if (!itemPadrao) {
        return NextResponse.json(
          { error: "Item padrão substituído não encontrado." },
          { status: 404 }
        );
      }

      if (!itemPadrao.ativo || itemPadrao.status === "NA_LIXEIRA") {
        return NextResponse.json(
          {
            error:
              "Não é possível substituir um item adicional inativo ou na lixeira.",
          },
          { status: 400 }
        );
      }
    }

    const opcao = await prisma.categoriaOpcaoAdicional.create({
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
    console.error("Erro ao criar opção adicional:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar opção adicional.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}