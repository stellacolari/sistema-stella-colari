import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cotarFreteMelhorEnvio } from "@/lib/frete/melhor-envio";
import {
  buscarConfiguracaoFrete,
  FRETE_MANUAL_ID,
  FRETE_RETIRADA_LOCAL_ID,
} from "@/lib/frete/configuracao";
import type { FreteOpcao, FreteProdutoPayload } from "@/lib/frete/types";

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

function montarOpcaoRetiradaLocal(texto: string): FreteOpcao {
  return {
    id: FRETE_RETIRADA_LOCAL_ID,
    servicoId: FRETE_RETIRADA_LOCAL_ID,
    nome: "Retirada local",
    transportadora: "Retirada local",
    valor: 0,
    prazoDias: 0,
    descricao: texto || "Retirada local sem custo de frete.",
    provider: "RETIRADA_LOCAL",
    tipoEntrega: "RETIRADA",
  };
}

function montarOpcaoManual(valor: number, prazoDias: number): FreteOpcao {
  return {
    id: FRETE_MANUAL_ID,
    servicoId: FRETE_MANUAL_ID,
    nome: "Frete manual",
    transportadora: "Frete manual",
    valor,
    prazoDias,
    descricao:
      prazoDias > 0
        ? `Frete configurado manualmente - ${prazoDias} dia${
            prazoDias === 1 ? "" : "s"
          }`
        : "Frete configurado manualmente.",
    provider: "MANUAL",
    tipoEntrega: "ENTREGA",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cepDestino = normalizarCep(body.cepDestino);
    const itens = normalizarItens(body.itens);
    const freteConfig = await buscarConfiguracaoFrete();
    const opcoesBase: FreteOpcao[] = [];

    if (freteConfig.retiradaLocalHabilitada) {
      opcoesBase.push(montarOpcaoRetiradaLocal(freteConfig.retiradaLocalTexto));
    }

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

    if (freteConfig.provedor === "DESATIVADO") {
      return NextResponse.json({
        opcoes: opcoesBase,
        freteDesativado: true,
        message:
          opcoesBase.length > 0
            ? "Frete por entrega está desativado. Use retirada local."
            : "Frete está desativado no momento.",
      });
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

    let opcoesEntrega: FreteOpcao[] = [];

    if (freteConfig.provedor === "MANUAL") {
      opcoesEntrega = [
        montarOpcaoManual(
          freteConfig.valorAdicional,
          freteConfig.prazoAdicionalDias
        ),
      ];
    } else {
      if (!freteConfig.melhorEnvioTokenConfigurado) {
        return NextResponse.json(
          {
            error:
              "Token do Melhor Envio não configurado. Configure MELHOR_ENVIO_TOKEN no ambiente.",
            opcoes: opcoesBase,
          },
          { status: 400 }
        );
      }

      if (freteConfig.cepOrigem.length !== 8) {
        return NextResponse.json(
          {
            error:
              "CEP de origem do frete não configurado. Ajuste em Configurações > Frete e entrega.",
            opcoes: opcoesBase,
          },
          { status: 400 }
        );
      }

      opcoesEntrega = await cotarFreteMelhorEnvio(
        {
          cepDestino,
          produtos: produtosFrete,
        },
        freteConfig
      );
    }

    return NextResponse.json({
      opcoes: [...opcoesBase, ...opcoesEntrega],
    });
  } catch (error) {
    console.error("Erro ao cotar frete:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao cotar frete.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
