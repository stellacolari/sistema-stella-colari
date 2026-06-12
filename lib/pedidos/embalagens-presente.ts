import type { Prisma } from "@prisma/client";

export type PedidoItemEmbalagemPresente = {
  pedidoOnlineItemId: string;
  nome: string;
  imagemUrl: string | null;
  descricao: string | null;
  precoUnitario: number;
  valorTotal: number;
  mensagem: string | null;
};

export type PedidoItemEmbalagemPresenteEstruturada = {
  pedidoOnlineItemId: string;
  nomeSnapshot: string;
  imagemUrlSnapshot: string | null;
  descricaoSnapshot: string | null;
  precoUnitario: number;
  valorTotal: number;
  mensagem: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  const texto = String(value || "").trim();
  return texto.length > 0 ? texto : null;
}

function numberOrZero(value: unknown) {
  const numero = Number(value || 0);
  return Number.isFinite(numero) ? numero : 0;
}

export function extrairEmbalagensPresentePedido(
  dadosOriginaisJson: Prisma.JsonValue | null | undefined,
): PedidoItemEmbalagemPresente[] {
  if (!isRecord(dadosOriginaisJson)) {
    return [];
  }

  const embalagens = dadosOriginaisJson.embalagensPresente;

  if (!Array.isArray(embalagens)) {
    return [];
  }

  return embalagens.flatMap((embalagem) => {
    if (!isRecord(embalagem)) {
      return [];
    }

    const pedidoOnlineItemId = stringOrNull(embalagem.pedidoOnlineItemId);

    if (!pedidoOnlineItemId) {
      return [];
    }

    return [
      {
        pedidoOnlineItemId,
        nome: stringOrNull(embalagem.nome) || "Embalagem para presente",
        imagemUrl: stringOrNull(embalagem.imagemUrl),
        descricao: stringOrNull(embalagem.descricao),
        precoUnitario: numberOrZero(embalagem.precoUnitario),
        valorTotal: numberOrZero(embalagem.valorTotal),
        mensagem: stringOrNull(embalagem.mensagem),
      },
    ];
  });
}

export function mapearEmbalagensPresentePorItem(
  dadosOriginaisJson: Prisma.JsonValue | null | undefined,
  embalagensEstruturadas: PedidoItemEmbalagemPresenteEstruturada[] = [],
) {
  const embalagensPorItem = new Map(
    extrairEmbalagensPresentePedido(dadosOriginaisJson).map((embalagem) => [
      embalagem.pedidoOnlineItemId,
      embalagem,
    ]),
  );

  for (const embalagem of embalagensEstruturadas) {
    const pedidoOnlineItemId = stringOrNull(embalagem.pedidoOnlineItemId);

    if (!pedidoOnlineItemId) {
      continue;
    }

    embalagensPorItem.set(pedidoOnlineItemId, {
      pedidoOnlineItemId,
      nome:
        stringOrNull(embalagem.nomeSnapshot) || "Embalagem para presente",
      imagemUrl: stringOrNull(embalagem.imagemUrlSnapshot),
      descricao: stringOrNull(embalagem.descricaoSnapshot),
      precoUnitario: numberOrZero(embalagem.precoUnitario),
      valorTotal: numberOrZero(embalagem.valorTotal),
      mensagem: stringOrNull(embalagem.mensagem),
    });
  }

  return embalagensPorItem;
}
