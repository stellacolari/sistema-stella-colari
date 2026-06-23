"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Save } from "lucide-react";

export type PedidoPagamentoInfo = {
  id: string;
  total: number;
  statusPagamento: string;
  metodoPagamento: string | null;
  gatewayPagamento: string | null;
  gatewayPedidoId: string | null;
  gatewayPagamentoId: string | null;
  pagoEm: string | null;
  valorPago: number;
  pagamentoObservacao: string | null;
};

const STATUS_PAGAMENTO = [
  { value: "AGUARDANDO_PAGAMENTO", label: "Aguardando pagamento" },
  { value: "PAGO", label: "Pago" },
  { value: "RECUSADO", label: "Recusado" },
  { value: "ESTORNADO", label: "Estornado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const METODOS_PAGAMENTO = [
  { value: "", label: "Não informado" },
  { value: "PIX", label: "Pix" },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CARTAO_DEBITO", label: "Cartão de débito" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "OUTRO", label: "Outro" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCompleta(dataIso: string | null) {
  if (!dataIso) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataIso));
}

function statusPagamentoLabel(status: string) {
  return (
    STATUS_PAGAMENTO.find((item) => item.value === status)?.label || status
  );
}

function getStatusPagamentoClass(status: string) {
  switch (status) {
    case "PAGO":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "AGUARDANDO_PAGAMENTO":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "RECUSADO":
    case "CANCELADO":
      return "bg-red-50 text-red-700 ring-red-200";
    case "ESTORNADO":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function PedidoPagamentoClient({
  pagamento,
  podeGerenciarPagamento = false,
}: {
  pagamento: PedidoPagamentoInfo;
  podeGerenciarPagamento?: boolean;
}) {
  const router = useRouter();

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    statusPagamento: pagamento.statusPagamento || "AGUARDANDO_PAGAMENTO",
    metodoPagamento: pagamento.metodoPagamento || "",
    gatewayPagamento: pagamento.gatewayPagamento || "",
    gatewayPedidoId: pagamento.gatewayPedidoId || "",
    gatewayPagamentoId: pagamento.gatewayPagamentoId || "",
    valorPago:
      pagamento.valorPago > 0
        ? String(pagamento.valorPago)
        : String(pagamento.total || 0),
    pagamentoObservacao: pagamento.pagamentoObservacao || "",
  });

  function atualizarCampo(campo: keyof typeof form, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function confirmarAlteracaoPagamento(statusDestino: string) {
    if (statusDestino === "PAGO" && pagamento.statusPagamento !== "PAGO") {
      return window.confirm(
        "Marcar este pedido como pago? Use apenas quando o pagamento foi confirmado fora do fluxo automatico. Para pagamentos Stripe, confira a transacao antes de continuar. Esta acao altera o status de pagamento e pode acionar a efetivacao do pedido.",
      );
    }

    if (statusDestino === "ESTORNADO" || statusDestino === "CANCELADO") {
      return window.confirm(
        `Alterar o pagamento deste pedido para ${statusPagamentoLabel(
          statusDestino,
        )}? Esta acao deve ser feita somente apos conferencia administrativa.`,
      );
    }

    return true;
  }

  async function salvarPagamento(statusRapido?: string) {
    if (!podeGerenciarPagamento) {
      setErro("Seu perfil nao permite alterar pagamentos de pedidos.");
      return;
    }

    setErro("");
    setSucesso("");

    try {
      const payload = {
        ...form,
        statusPagamento: statusRapido || form.statusPagamento,
      };

      if (!confirmarAlteracaoPagamento(payload.statusPagamento)) {
        return;
      }

      setSalvando(true);

      const response = await fetch(`/api/pedidos/${pagamento.id}/pagamento`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao salvar pagamento.");
        return;
      }

      setForm((atual) => ({
        ...atual,
        statusPagamento: statusRapido || atual.statusPagamento,
      }));

      setSucesso("Pagamento atualizado com sucesso.");
      router.refresh();
    } catch {
      setErro("Erro ao salvar pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-slate-500" />

            <h2 className="text-lg font-semibold text-slate-950">
              Pagamento
            </h2>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Controle financeiro separado do status operacional do pedido.
          </p>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusPagamentoClass(
            pagamento.statusPagamento
          )}`}
        >
          {statusPagamentoLabel(pagamento.statusPagamento)}
        </span>
      </div>

      {(erro || sucesso) && (
        <div className="mt-4 space-y-2">
          {erro && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {sucesso}
            </div>
          )}
        </div>
      )}

      {!podeGerenciarPagamento && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Seu perfil pode consultar o pagamento, mas nao pode alterar status ou
          dados financeiros do pedido.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total do pedido
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-950">
            {moeda(pagamento.total)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Valor pago
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-950">
            {moeda(pagamento.valorPago)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pago em
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-950">
            {dataCompleta(pagamento.pagoEm)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Status do pagamento
          </span>

          <select
            value={form.statusPagamento}
            onChange={(event) =>
              atualizarCampo("statusPagamento", event.target.value)
            }
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          >
            {STATUS_PAGAMENTO.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Método
          </span>

          <select
            value={form.metodoPagamento}
            onChange={(event) =>
              atualizarCampo("metodoPagamento", event.target.value)
            }
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          >
            {METODOS_PAGAMENTO.map((metodo) => (
              <option key={metodo.value} value={metodo.value}>
                {metodo.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Valor pago
          </span>

          <input
            value={form.valorPago}
            onChange={(event) => atualizarCampo("valorPago", event.target.value)}
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Gateway
          </span>

          <input
            value={form.gatewayPagamento}
            onChange={(event) =>
              atualizarCampo("gatewayPagamento", event.target.value)
            }
            placeholder="Ex: Mercado Pago, Stripe, Pagar.me"
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            ID pedido gateway
          </span>

          <input
            value={form.gatewayPedidoId}
            onChange={(event) =>
              atualizarCampo("gatewayPedidoId", event.target.value)
            }
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            ID pagamento gateway
          </span>

          <input
            value={form.gatewayPagamentoId}
            onChange={(event) =>
              atualizarCampo("gatewayPagamentoId", event.target.value)
            }
            disabled={!podeGerenciarPagamento}
            className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Observação de pagamento
        </span>

        <textarea
          value={form.pagamentoObservacao}
          onChange={(event) =>
            atualizarCampo("pagamentoObservacao", event.target.value)
          }
          rows={3}
          placeholder="Ex: pagamento confirmado manualmente via Pix."
          disabled={!podeGerenciarPagamento}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-500"
        />
      </label>

      {podeGerenciarPagamento && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => salvarPagamento("PAGO")}
            disabled={salvando}
            className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marcar como pago
          </button>

          <button
            type="button"
            onClick={() => salvarPagamento("AGUARDANDO_PAGAMENTO")}
            disabled={salvando}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Aguardando
          </button>

          <button
            type="button"
            onClick={() => salvarPagamento()}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar pagamento"}
          </button>
        </div>
      )}
    </section>
  );
}
