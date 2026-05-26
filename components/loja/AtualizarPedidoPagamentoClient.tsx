"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export default function AtualizarPedidoPagamentoClient({
  statusPagamento,
  pagamentoRetorno,
}: {
  statusPagamento: string;
  pagamentoRetorno: string | null;
}) {
  const router = useRouter();
  const [tentativas, setTentativas] = useState(0);

  const pagamentoConfirmado = statusPagamento === "PAGO";
  const voltouComSucesso = pagamentoRetorno === "sucesso";
  const voltouCancelado = pagamentoRetorno === "cancelado";

  useEffect(() => {
    if (!voltouComSucesso || pagamentoConfirmado) {
      return;
    }

    if (tentativas >= 8) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.refresh();
      setTentativas((atual) => atual + 1);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [voltouComSucesso, pagamentoConfirmado, tentativas, router]);

  if (!pagamentoRetorno) {
    return null;
  }

  if (pagamentoConfirmado) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Pagamento confirmado. Seu pedido já foi atualizado e seguirá para a
          próxima etapa.
        </p>
      </div>
    );
  }

  if (voltouCancelado) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          O pagamento não foi concluído. Você pode tentar novamente clicando em
          “Pagar agora”.
        </p>
      </div>
    );
  }

  if (voltouComSucesso) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Estamos confirmando seu pagamento. A página será atualizada
          automaticamente em alguns segundos.
        </p>
      </div>
    );
  }

  return null;
}