import type { Prisma } from "@prisma/client";

export type PedidoAlertaOperacional = {
  id: string;
  tipo: string;
  severidade: "INFO" | "ALERTA" | "CRITICO";
  mensagem: string;
  detalhe?: string | null;
  itemPedidoId?: string | null;
  itemNome?: string | null;
  componenteNome?: string | null;
  criadoEm: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizarAlerta(value: unknown): PedidoAlertaOperacional | null {
  if (!isRecord(value)) {
    return null;
  }

  const mensagem = String(value.mensagem ?? "").trim();

  if (!mensagem) {
    return null;
  }

  const severidade = String(value.severidade ?? "ALERTA").trim();

  return {
    id: String(value.id || `alerta-${Date.now()}-${mensagem}`),
    tipo: String(value.tipo || "OPERACIONAL"),
    severidade:
      severidade === "CRITICO" || severidade === "INFO"
        ? severidade
        : "ALERTA",
    mensagem,
    detalhe:
      value.detalhe === null || value.detalhe === undefined
        ? null
        : String(value.detalhe),
    itemPedidoId:
      value.itemPedidoId === null || value.itemPedidoId === undefined
        ? null
        : String(value.itemPedidoId),
    itemNome:
      value.itemNome === null || value.itemNome === undefined
        ? null
        : String(value.itemNome),
    componenteNome:
      value.componenteNome === null || value.componenteNome === undefined
        ? null
        : String(value.componenteNome),
    criadoEm: String(value.criadoEm || new Date().toISOString()),
  };
}

export function extrairAlertasOperacionais(
  dadosOriginaisJson: Prisma.JsonValue | null | undefined,
) {
  if (!isRecord(dadosOriginaisJson)) {
    return [];
  }

  const alertas = dadosOriginaisJson.alertasOperacionais;

  if (!Array.isArray(alertas)) {
    return [];
  }

  return alertas
    .map((alerta) => normalizarAlerta(alerta))
    .filter((alerta): alerta is PedidoAlertaOperacional => Boolean(alerta));
}

export function mergeAlertasOperacionaisJson({
  dadosOriginaisJson,
  alertas,
}: {
  dadosOriginaisJson: Prisma.JsonValue | null | undefined;
  alertas: PedidoAlertaOperacional[];
}) {
  const base = isRecord(dadosOriginaisJson)
    ? (dadosOriginaisJson as Prisma.JsonObject)
    : {};

  const atuais = extrairAlertasOperacionais(dadosOriginaisJson);
  const porId = new Map<string, PedidoAlertaOperacional>();

  for (const alerta of [...atuais, ...alertas]) {
    porId.set(alerta.id, alerta);
  }

  return toPrismaJson({
    ...base,
    alertasOperacionais: Array.from(porId.values()),
  });
}

export async function adicionarAlertasOperacionaisPedido({
  tx,
  pedidoOnlineId,
  alertas,
}: {
  tx: Prisma.TransactionClient;
  pedidoOnlineId: string;
  alertas: PedidoAlertaOperacional[];
}) {
  if (alertas.length === 0) {
    return [];
  }

  const pedido = await tx.pedidoOnline.findUnique({
    where: {
      id: pedidoOnlineId,
    },
    select: {
      dadosOriginaisJson: true,
    },
  });

  if (!pedido) {
    return [];
  }

  const dadosOriginaisJson = mergeAlertasOperacionaisJson({
    dadosOriginaisJson: pedido.dadosOriginaisJson,
    alertas,
  });

  await tx.pedidoOnline.update({
    where: {
      id: pedidoOnlineId,
    },
    data: {
      dadosOriginaisJson,
    },
  });

  return extrairAlertasOperacionais(dadosOriginaisJson as Prisma.JsonValue);
}

export function criarAlertaOperacional(
  alerta: Omit<PedidoAlertaOperacional, "id" | "criadoEm"> & {
    id?: string;
    criadoEm?: string;
  },
): PedidoAlertaOperacional {
  return {
    ...alerta,
    id:
      alerta.id ||
      `${alerta.tipo}-${alerta.itemPedidoId || alerta.componenteNome || Date.now()}`,
    criadoEm: alerta.criadoEm || new Date().toISOString(),
  };
}
