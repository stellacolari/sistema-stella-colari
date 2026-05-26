"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export default function PagarPedidoStripeButton({
  codigo,
}: {
  codigo: string;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function pagar() {
    setErro("");
    setCarregando(true);

    try {
      const response = await fetch("/api/loja/stripe/criar-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codigo,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErro(data.error || "Erro ao iniciar pagamento.");
        return;
      }

      if (!data.url) {
        setErro("URL de pagamento não retornada.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setErro("Erro ao iniciar pagamento.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pagar}
        disabled={carregando}
        className="inline-flex h-11 w-full items-center justify-center gap-2 brand-button px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" />
        {carregando ? "Abrindo pagamento..." : "Pagar agora"}
      </button>

      {erro && <p className="mt-2 text-xs leading-5 text-red-700">{erro}</p>}
    </div>
  );
}
