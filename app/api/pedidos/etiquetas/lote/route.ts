import { NextResponse } from "next/server";
import {
  AdminPermissaoError,
  exigirPermissaoExecutarAcaoSensivelPedidoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

function normalizarIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.map((id) => String(id || "").trim()).filter((id) => id.length > 0),
    ),
  );
}

function isPedidoImprimivel(pedido: {
  origemCanal: string;
  statusPagamento: string;
  envio: {
    tipoEntrega: string;
    gatewayLogistico: string | null;
    statusEnvio: string;
    etiquetaUrl: string | null;
    etiquetaPdfUrl: string | null;
  } | null;
}) {
  return (
    ["LOJA_STELLA", "ADMIN_MANUAL"].includes(pedido.origemCanal) &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "ETIQUETA_GERADA" &&
    Boolean(pedido.envio.etiquetaPdfUrl || pedido.envio.etiquetaUrl)
  );
}

export async function POST(request: Request) {
  try {
    await exigirPermissaoExecutarAcaoSensivelPedidoAdmin();

    const body = await request.json().catch(() => ({}));
    const ids = normalizarIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Selecione ao menos uma etiqueta para impressão." },
        { status: 400 },
      );
    }

    const pedidos = await prisma.pedidoOnline.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: {
        id: true,
        origemCanal: true,
        statusPagamento: true,
        envio: {
          select: {
            tipoEntrega: true,
            gatewayLogistico: true,
            statusEnvio: true,
            etiquetaUrl: true,
            etiquetaPdfUrl: true,
          },
        },
      },
    });

    if (pedidos.length !== ids.length) {
      return NextResponse.json(
        { error: "Um ou mais pedidos selecionados não foram encontrados." },
        { status: 400 },
      );
    }

    const pedidosInvalidos = pedidos.filter(
      (pedido) => !isPedidoImprimivel(pedido),
    );

    if (pedidosInvalidos.length > 0) {
      return NextResponse.json(
        {
          error:
            "A seleção contém pedido sem etiqueta gerada ou sem link de impressão.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: `/pedidos/etiquetas/lote?ids=${encodeURIComponent(ids.join(","))}`,
    });
  } catch (error) {
    console.error("Erro ao preparar impressão em lote:", error);

    return NextResponse.json(
      { error: "Erro ao preparar impressão em lote." },
      { status: error instanceof AdminPermissaoError ? 403 : 500 },
    );
  }
}
