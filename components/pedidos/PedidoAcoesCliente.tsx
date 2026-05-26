"use client";

import { Copy, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";

type PedidoAcoesClienteProps = {
  codigo: string;
  nomeCliente: string;
  telefoneCliente: string;
  total: number;
  status: string;
  codigoRastreio?: string | null;
  endereco: {
    cep?: string | null;
    rua?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AGUARDANDO_PAGAMENTO: "aguardando pagamento",
    PAGO: "pago",
    EM_SEPARACAO: "em separação",
    PRONTO_PARA_ENVIO: "pronto para envio",
    ENVIADO: "enviado",
    ENTREGUE: "entregue",
    CANCELADO: "cancelado",
    PROBLEMA: "com pendência",
  };

  return labels[status] || status.toLowerCase();
}

function normalizarTelefoneWhatsApp(telefone: string) {
  const somenteNumeros = telefone.replace(/\D/g, "");

  if (!somenteNumeros) {
    return "";
  }

  if (somenteNumeros.startsWith("55")) {
    return somenteNumeros;
  }

  return `55${somenteNumeros}`;
}

export default function PedidoAcoesCliente({
  codigo,
  nomeCliente,
  telefoneCliente,
  total,
  status,
  codigoRastreio,
  endereco,
}: PedidoAcoesClienteProps) {
  const [copiado, setCopiado] = useState("");

  const enderecoCompleto = [
    [endereco.rua, endereco.numero].filter(Boolean).join(", "),
    endereco.complemento,
    endereco.bairro,
    [endereco.cidade, endereco.estado].filter(Boolean).join(" / "),
    endereco.cep ? `CEP: ${endereco.cep}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const mensagemCliente = [
    `Olá, ${nomeCliente}! Tudo bem?`,
    "",
    `Seu pedido ${codigo} está ${statusLabel(status)}.`,
    `Valor total: ${moeda(total)}.`,
    codigoRastreio ? `Código de rastreio: ${codigoRastreio}.` : "",
    "",
    "Qualquer dúvida, estamos à disposição.",
  ]
    .filter((linha) => linha !== "")
    .join("\n");

  async function copiarTexto(texto: string, tipo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);

      window.setTimeout(() => {
        setCopiado("");
      }, 1800);
    } catch {
      setCopiado("erro");

      window.setTimeout(() => {
        setCopiado("");
      }, 1800);
    }
  }

  function abrirWhatsApp() {
    const telefone = normalizarTelefoneWhatsApp(telefoneCliente);

    if (!telefone) {
      return;
    }

    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
      mensagemCliente
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ações rápidas
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Cliente e envio
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Copie dados importantes ou abra uma mensagem pronta no WhatsApp do
            cliente.
          </p>
        </div>

        {copiado && (
          <div
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
              copiado === "erro"
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {copiado === "erro" ? "Não foi possível copiar" : "Copiado!"}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => copiarTexto(enderecoCompleto, "endereco")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <MapPin className="h-4 w-4" />
          Copiar endereço
        </button>

        <button
          type="button"
          onClick={() => copiarTexto(mensagemCliente, "mensagem")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Copy className="h-4 w-4" />
          Copiar mensagem
        </button>

        <button
          type="button"
          onClick={abrirWhatsApp}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir WhatsApp
        </button>
      </div>
    </section>
  );
}