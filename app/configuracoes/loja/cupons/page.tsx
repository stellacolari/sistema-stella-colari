import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CuponsLojaClient, {
  type CupomLojaItem,
} from "@/components/configuracoes/loja/CuponsLojaClient";

export const metadata: Metadata = {
  title: "Cupons | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function CuponsLojaPage() {
  const cuponsRaw = await prisma.cupomLoja.findMany({
    orderBy: {
      criadoEm: "desc",
    },
  });

  const cupons: CupomLojaItem[] = cuponsRaw.map((cupom) => ({
    id: cupom.id,
    codigo: cupom.codigo,
    nome: cupom.nome,
    tipo: cupom.tipo,
    valor: Number(cupom.valor || 0),
    valorMinimoPedido: Number(cupom.valorMinimoPedido || 0),
    ativo: cupom.ativo,
    dataInicio: cupom.dataInicio ? cupom.dataInicio.toISOString() : null,
    dataFim: cupom.dataFim ? cupom.dataFim.toISOString() : null,
    limiteUsoTotal: cupom.limiteUsoTotal,
    limiteUsoPorCliente: cupom.limiteUsoPorCliente,
    quantidadeUsada: cupom.quantidadeUsada,
    bloqueiaCashback: cupom.bloqueiaCashback,
    criadoEm: cupom.criadoEm.toISOString(),
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Loja
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Cupons
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Crie e gerencie cupons promocionais para a loja. Cupons podem
            bloquear cashback para evitar benefício duplicado.
          </p>
        </div>
      </section>

      <CuponsLojaClient cupons={cupons} />
    </main>
  );
}