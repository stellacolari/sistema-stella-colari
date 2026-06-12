import type { Metadata } from "next";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import { prisma } from "@/lib/prisma";
import CuponsLojaClient, {
  type CupomLojaItem,
} from "@/components/configuracoes/loja/CuponsLojaClient";

export const metadata: Metadata = {
  title: "Cupons | Plataforma Stella Colari",
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
    <LojaConfigHeader
      title="Cupons"
      description="Configure códigos promocionais, regras de desconto, validade, uso máximo e impacto no cashback."
    />

    {/* mantenha aqui o componente atual da página */}
  </main>
);
}
