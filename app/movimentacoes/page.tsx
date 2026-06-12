import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MovimentacoesClient, {
  type MovimentacaoAdicionalDetalhe,
  type MovimentacaoListItem,
} from "@/components/movimentacoes/MovimentacoesClient";

export const metadata: Metadata = {
  title: "Movimentações | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

function getString(
  record: Record<string, unknown>,
  key: string,
  fallback = ""
): string {
  const value = record[key];

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function getNullableString(
  record: Record<string, unknown>,
  key: string
): string | null {
  const value = record[key];

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function getNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateIso(record: Record<string, unknown>): string {
  const value =
    record.criadoEm ??
    record.createdAt ??
    record.dataCriacao ??
    record.data ??
    record.updatedAt ??
    record.atualizadoEm;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export default async function MovimentacoesPage() {
  const [movimentacoesRaw, produtos, adicionais, regrasCategoria] =
    await Promise.all([
      prisma.movimentacao.findMany({
        orderBy: {
          id: "desc",
        },
        take: 1000,
        include: {
          adicionaisConsumidos: {
            orderBy: {
              id: "asc",
            },
          },
        },
      }),

      prisma.produto.findMany({
        select: {
          codigoInterno: true,
          nome: true,
          categoria: true,
        },
      }),

      prisma.itemAdicional.findMany({
        select: {
          codigoInterno: true,
          nome: true,
        },
      }),

      prisma.regraCategoria.findMany({
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          categoria: true,
          quantidade: true,
          itemAdicional: {
            select: {
              codigoInterno: true,
              nome: true,
            },
          },
        },
      }),
    ]);

  const itensPorCodigo = new Map<
    string,
    {
      nome: string;
      categoria: string | null;
      tipo: "produto" | "adicional";
    }
  >();

  produtos.forEach((produto) => {
    itensPorCodigo.set(produto.codigoInterno, {
      nome: produto.nome,
      categoria: produto.categoria,
      tipo: "produto",
    });
  });

  adicionais.forEach((adicional) => {
    itensPorCodigo.set(adicional.codigoInterno, {
      nome: adicional.nome,
      categoria: null,
      tipo: "adicional",
    });
  });

  const regrasPorCategoria = new Map<
    string,
    {
      codigo: string;
      nome: string;
      quantidade: number;
    }[]
  >();

  regrasCategoria.forEach((regra) => {
    const adicionaisDaCategoria =
      regrasPorCategoria.get(regra.categoria) ?? [];

    adicionaisDaCategoria.push({
      codigo: regra.itemAdicional.codigoInterno,
      nome: regra.itemAdicional.nome,
      quantidade: regra.quantidade,
    });

    regrasPorCategoria.set(regra.categoria, adicionaisDaCategoria);
  });

  const movimentacoes: MovimentacaoListItem[] = movimentacoesRaw.map(
    (movimentacao) => {
      const record = movimentacao as unknown as Record<string, unknown>;
      const codigoItem = getString(record, "codigoItem", "-");
      const itemEncontrado = itensPorCodigo.get(codigoItem);

      const gastoProdutoPrincipal = getNumber(
        record,
        "gastoProdutoPrincipal"
      );

      const gastosAdicionaisLegados = [
        getNumber(record, "gastoAdd1"),
        getNumber(record, "gastoAdd2"),
        getNumber(record, "gastoAdd3"),
      ];

      const adicionaisConsumidosRaw = Array.isArray(
        record.adicionaisConsumidos
      )
        ? (record.adicionaisConsumidos as Record<string, unknown>[])
        : [];

      const adicionaisHistoricos: MovimentacaoAdicionalDetalhe[] =
        adicionaisConsumidosRaw.map((adicional, index) => ({
          posicao: index + 1,
          codigo: getNullableString(adicional, "codigoItem"),
          nome: getNullableString(adicional, "nomeItem"),
          quantidadeUtilizada: getNumber(adicional, "quantidade"),
          valor: getNumber(adicional, "custoTotal"),
          origem: "historico",
        }));

      const regrasDoProduto =
        itemEncontrado?.tipo === "produto" && itemEncontrado.categoria
          ? regrasPorCategoria.get(itemEncontrado.categoria) ?? []
          : [];

      const adicionaisLegados: MovimentacaoAdicionalDetalhe[] =
        gastosAdicionaisLegados.map((valor, index) => {
          const regra = regrasDoProduto[index];
          const quantidadeMovimentada = getNumber(record, "quantidade");

          return {
            posicao: index + 1,
            codigo: regra?.codigo ?? null,
            nome: regra?.nome ?? null,
            quantidadeUtilizada:
              regra?.quantidade !== undefined
                ? regra.quantidade * quantidadeMovimentada
                : null,
            valor,
            origem: "regraAtual",
          };
        });

      const adicionaisDetalhe =
        adicionaisHistoricos.length > 0
          ? adicionaisHistoricos
          : adicionaisLegados;

      return {
        id: getString(record, "id"),
        data: getDateIso(record),
        codigoMovimentacao: getString(record, "codigoMovimentacao", "-"),
        tipoMovimentacao: getString(record, "tipoMovimentacao", "-"),
        origemTipo: getString(record, "origemTipo", "-"),
        origemId: getNullableString(record, "origemId"),
        codigoItem,
        nomeItem: itemEncontrado?.nome ?? "Item não localizado",
        categoriaItem: itemEncontrado?.categoria ?? null,
        itemTipo: getString(record, "itemTipo", "-"),
        quantidade: getNumber(record, "quantidade"),
        tamanhoAnel: getNullableString(record, "tamanhoAnel"),
        custo: getNumber(record, "custo"),
        faturamento: getNumber(record, "faturamento"),
        documentoCliente: getNullableString(record, "documentoCliente"),
        status: getNullableString(record, "status"),
        relacionadoA: getNullableString(record, "relacionadoA"),
        gastoProdutoPrincipal,
        gastoAdd1: gastosAdicionaisLegados[0],
        gastoAdd2: gastosAdicionaisLegados[1],
        gastoAdd3: gastosAdicionaisLegados[2],
        adicionaisDetalhe,
        adicionaisOrigem:
          adicionaisHistoricos.length > 0 ? "historico" : "regraAtual",
      };
    }
  );

  return <MovimentacoesClient movimentacoes={movimentacoes} />;
}
