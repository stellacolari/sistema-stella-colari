import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cotarFreteMelhorEnvio } from "@/lib/frete/melhor-envio";
import type { FreteProdutoPayload } from "@/lib/frete/types";

type ItemCotacaoPayload = {
  produtoId?: unknown;
  quantidade?: unknown;
};

function normalizarCep(cep: unknown) {
  return String(cep || "").replace(/\D/g, "");
}

function normalizarItens(itens: unknown): { produtoId: string; quantidade: number }[] {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens
    .map((item: ItemCotacaoPayload) => ({
      produtoId: String(item?.produtoId || "").trim(),
      quantidade: Math.max(Math.round(Number(item?.quantidade || 1)), 1),
    }))
    .filter((item) => item.produtoId);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cepDestino = normalizarCep(body.cepDestino);
    const itens = normalizarItens(body.itens);

    if (cepDestino.length !== 8) {
      return NextResponse.json(
        { error: "Informe um CEP de destino válido." },
        { status: 400 }
      );
    }

    if (itens.length === 0) {
      return NextResponse.json(
        { error: "Informe os itens do carrinho para cotar frete." },
        { status: 400 }
      );
    }

    const produtos = await prisma.produto.findMany({
      where: {
        id: {
          in: itens.map((item) => item.produtoId),
        },
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
      select: {
        id: true,
        nome: true,
        precoVenda: true,
      },
    });

    if (produtos.length !== new Set(itens.map((item) => item.produtoId)).size) {
      return NextResponse.json(
        { error: "Um dos produtos do carrinho não está disponível." },
        { status: 400 }
      );
    }

    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

    const produtosFrete: FreteProdutoPayload[] = itens.map((item) => {
      const produto = produtosPorId.get(item.produtoId);

      if (!produto) {
        throw new Error("Produto não encontrado para cotação.");
      }

      return {
        id: produto.id,
        nome: produto.nome,
        quantidade: item.quantidade,
        valorUnitario: Number(produto.precoVenda || 0),
      };
    });

    const opcoes = await cotarFreteMelhorEnvio({
      cepDestino,
      produtos: produtosFrete,
    });

    return NextResponse.json({
      opcoes,
    });
  } catch (error) {
    console.error("Erro ao cotar frete:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao cotar frete.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
