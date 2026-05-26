import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CANAIS_VALIDOS = new Set([
  "MERCADO_LIVRE",
  "SHOPEE",
  "TIKTOK_SHOP",
  "OUTRO",
]);

function parseStringOrNull(value: unknown) {
  const parsed = String(value ?? "").trim();

  return parsed || null;
}

function parseNumeroOuNull(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");
  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

function parseInteiroOuNull(value: unknown) {
  const numero = parseNumeroOuNull(value);

  if (numero === null) {
    return null;
  }

  return Math.trunc(numero);
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export async function GET() {
  try {
    const vinculos = await prisma.produtoCanal.findMany({
      orderBy: [{ canal: "asc" }, { criadoEm: "desc" }],
      include: {
        produto: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            imagemUrl: true,
            precoVenda: true,
            ativo: true,
          },
        },
      },
    });

    return NextResponse.json({ vinculos });
  } catch (error) {
    console.error("Erro ao listar produtos por canal:", error);

    return NextResponse.json(
      { error: "Erro ao listar produtos por canal." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const produtoId = String(body.produtoId || "").trim();
    const canal = String(body.canal || "").trim();
    const skuExterno = parseStringOrNull(body.skuExterno);

    if (!produtoId) {
      return NextResponse.json(
        { error: "Selecione um produto do Stella." },
        { status: 400 }
      );
    }

    if (!CANAIS_VALIDOS.has(canal)) {
      return NextResponse.json(
        { error: "Canal inválido." },
        { status: 400 }
      );
    }

    const produto = await prisma.produto.findUnique({
      where: { id: produtoId },
      select: { id: true },
    });

    if (!produto) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    if (skuExterno) {
      const existente = await prisma.produtoCanal.findUnique({
        where: {
          canal_skuExterno: {
            canal,
            skuExterno,
          },
        },
        select: {
          id: true,
          produto: {
            select: {
              codigoInterno: true,
              nome: true,
            },
          },
        },
      });

      if (existente) {
        return NextResponse.json(
          {
            error: `Este SKU externo já está vinculado ao produto ${existente.produto.codigoInterno} — ${existente.produto.nome}.`,
          },
          { status: 400 }
        );
      }
    }

    const vinculo = await prisma.produtoCanal.create({
      data: {
        produtoId,
        canal,
        skuExterno,
        produtoExternoId: parseStringOrNull(body.produtoExternoId),
        variacaoExternaId: parseStringOrNull(body.variacaoExternaId),
        tituloExterno: parseStringOrNull(body.tituloExterno),
        precoCanal: parseNumeroOuNull(body.precoCanal),
        estoqueAnunciado: parseInteiroOuNull(body.estoqueAnunciado),
        sincronizarEstoque: parseBoolean(body.sincronizarEstoque, true),
        sincronizarPreco: parseBoolean(body.sincronizarPreco, false),
        ativo: parseBoolean(body.ativo, true),
      },
      include: {
        produto: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            imagemUrl: true,
            precoVenda: true,
            ativo: true,
          },
        },
      },
    });

    return NextResponse.json({ vinculo });
  } catch (error) {
    console.error("Erro ao criar vínculo de produto por canal:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar vínculo de produto por canal.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}