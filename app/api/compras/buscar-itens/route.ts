import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizarTamanho(tamanho: string | null | undefined) {
  const value = String(tamanho ?? "").trim();

  if (!value || value === "UNICO") {
    return null;
  }

  return value;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ itens: [] });
    }

    const [produtos, adicionais] = await Promise.all([
      prisma.produto.findMany({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
          OR: [
            {
              codigoInterno: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              codigoFornecedor: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              nome: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          codigoInterno: true,
          codigoFornecedor: true,
          nome: true,
          custoBase: true,
          categoria: true,
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
        orderBy: {
          nome: "asc",
        },
        take: 8,
      }),

      prisma.itemAdicional.findMany({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
          OR: [
            {
              codigoInterno: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              codigoFornecedor: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              nome: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          codigoInterno: true,
          codigoFornecedor: true,
          nome: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
        take: 8,
      }),
    ]);

    const produtosFormatados = produtos.map((produto) => {
      const tamanhos = Array.from(
        new Set(
          produto.estoque
            .map((estoque) => normalizarTamanho(estoque.tamanhoAnel))
            .filter(Boolean) as string[]
        )
      );

      return {
        id: produto.id,
        tipoItem: "produto",
        codigoInterno: produto.codigoInterno,
        codigoFornecedor: produto.codigoFornecedor,
        codigoPreferencial: produto.codigoInterno,
        nome: produto.nome,
        categoria: produto.categoria,
        valorUnitarioBase: Number(produto.custoBase || 0),
        tamanhos,
        temTamanho: tamanhos.length > 0,
      };
    });

    const adicionaisFormatados = adicionais.map((item) => ({
      id: item.id,
      tipoItem: "adicional",
      codigoInterno: item.codigoInterno,
      codigoFornecedor: item.codigoFornecedor,
      codigoPreferencial: item.codigoInterno,
      nome: item.nome,
      categoria: "Item adicional",
      valorUnitarioBase: Number(item.custoBase || 0),
      tamanhos: [],
      temTamanho: false,
    }));

    return NextResponse.json({
      itens: [...produtosFormatados, ...adicionaisFormatados].slice(0, 12),
    });
  } catch (error) {
    console.error("Erro ao buscar itens para compra:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar itens.",
      },
      {
        status: 500,
      }
    );
  }
}