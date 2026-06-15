import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";

export const metadata: Metadata = {
  title: "Cashback | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

const CHAVE_CONFIG = "PADRAO";

export default async function CashbackConfiguracaoPage() {
  await prisma.lojaCashbackConfiguracao.upsert({
    where: {
      chave: CHAVE_CONFIG,
    },
    create: {
      chave: CHAVE_CONFIG,
      ativo: true,
      percentualPrimeiraCompra: 10,
      percentualCompraRecorrente: 5,
      somenteClienteCadastrado: true,
      permitirComCupom: false,
      permitirProdutoComDesconto: true,
    },
    update: {},
  });

return (
  <main className="space-y-6">
    <LojaConfigHeader
      title="Cashback"
      description="Defina percentuais, regras de uso, bloqueios com cupons e condições para clientes cadastrados."
    />

    {/* mantenha aqui o componente atual da página */}
  </main>
);
}
