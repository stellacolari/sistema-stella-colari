import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ExternalLink, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ImpressaoEtiquetasClient from "./ImpressaoEtiquetasClient";

export const metadata: Metadata = {
  title: "Impressão de etiquetas | Sistema Stella",
};

export const dynamic = "force-dynamic";

function parseIds(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : value || "";

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
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
    pedido.origemCanal === "LOJA_STELLA" &&
    pedido.statusPagamento === "PAGO" &&
    pedido.envio?.tipoEntrega === "ENTREGA" &&
    pedido.envio?.gatewayLogistico === "MELHOR_ENVIO" &&
    pedido.envio?.statusEnvio === "ETIQUETA_GERADA" &&
    Boolean(pedido.envio.etiquetaPdfUrl || pedido.envio.etiquetaUrl)
  );
}

export default async function EtiquetasLotePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = parseIds(idsParam);

  const pedidos =
    ids.length > 0
      ? await prisma.pedidoOnline.findMany({
          where: {
            id: {
              in: ids,
            },
          },
          orderBy: {
            criadoEm: "desc",
          },
          select: {
            id: true,
            codigo: true,
            nomeCliente: true,
            origemCanal: true,
            statusPagamento: true,
            envio: {
              select: {
                tipoEntrega: true,
                transportadora: true,
                servico: true,
                gatewayLogistico: true,
                statusEnvio: true,
                etiquetaUrl: true,
                etiquetaPdfUrl: true,
              },
            },
          },
        })
      : [];

  const pedidosValidos = pedidos.filter(isPedidoImprimivel);
  const pedidosInvalidos = pedidos.filter((pedido) => !isPedidoImprimivel(pedido));
  const idsEncontrados = new Set(pedidos.map((pedido) => pedido.id));
  const idsNaoEncontrados = ids.filter((id) => !idsEncontrados.has(id));

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Pedidos
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Impressão em lote
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {pedidosValidos.length} etiqueta
              {pedidosValidos.length === 1 ? "" : "s"} pronta
              {pedidosValidos.length === 1 ? "" : "s"} para impressão.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pedidos"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar aos pedidos
            </Link>

            {pedidosValidos.length > 0 && <ImpressaoEtiquetasClient />}
          </div>
        </div>

        {(ids.length === 0 || pedidosInvalidos.length > 0 || idsNaoEncontrados.length > 0) && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {ids.length === 0 && <p>Nenhum pedido foi selecionado.</p>}
                {pedidosInvalidos.length > 0 && (
                  <p>
                    {pedidosInvalidos.length} pedido
                    {pedidosInvalidos.length === 1 ? "" : "s"} sem etiqueta
                    válida foram ignorados.
                  </p>
                )}
                {idsNaoEncontrados.length > 0 && (
                  <p>
                    {idsNaoEncontrados.length} pedido
                    {idsNaoEncontrados.length === 1 ? "" : "s"} não foram
                    encontrados.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {pedidosValidos.length === 0 ? (
        <section className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
          <Package className="mx-auto h-8 w-8 text-slate-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Nenhuma etiqueta disponível
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Volte para a aba “Pronto para impressão” e selecione pedidos com
            etiqueta gerada.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {pedidosValidos.map((pedido) => {
            const etiquetaUrl =
              pedido.envio?.etiquetaPdfUrl || pedido.envio?.etiquetaUrl || "";

            return (
              <article
                key={pedido.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">
                      {pedido.codigo}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {pedido.nomeCliente} ·{" "}
                      {[pedido.envio?.transportadora, pedido.envio?.servico]
                        .filter(Boolean)
                        .join(" - ") || "Melhor Envio"}
                    </p>
                  </div>

                  <a
                    href={etiquetaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir etiqueta
                  </a>
                </div>

                <iframe
                  title={`Etiqueta ${pedido.codigo}`}
                  src={etiquetaUrl}
                  className="h-[720px] w-full bg-slate-50"
                />
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
