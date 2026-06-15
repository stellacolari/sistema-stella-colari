import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import CashbackConfiguracaoClient from "@/components/configuracoes/loja/CashbackConfiguracaoClient";

export const metadata: Metadata = {
  title: "Cashback | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

const CHAVE_CONFIG = "PADRAO";

export default async function CashbackConfiguracaoPage() {
  const config = await prisma.lojaCashbackConfiguracao.upsert({
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
    select: {
      id: true,
      ativo: true,
      percentualPrimeiraCompra: true,
      percentualCompraRecorrente: true,
      somenteClienteCadastrado: true,
      permitirComCupom: true,
      permitirProdutoComDesconto: true,
      diasValidade: true,
    },
  });

  return (
    <main className="space-y-6">
      <LojaConfigHeader
        title="Cashback"
        description="Configure regras de cashback da loja online."
      />

      <CashbackConfiguracaoClient config={config} />
    </main>
  );
}
