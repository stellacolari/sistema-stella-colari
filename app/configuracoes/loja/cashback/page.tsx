import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CashbackConfiguracaoClient, {
  type CashbackConfiguracao,
} from "@/components/configuracoes/loja/CashbackConfiguracaoClient";

export const metadata: Metadata = {
  title: "Cashback | Sistema Stella",
};

export const dynamic = "force-dynamic";

const CHAVE_CONFIG = "PADRAO";

export default async function CashbackConfiguracaoPage() {
  const configRaw = await prisma.lojaCashbackConfiguracao.upsert({
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

  const config: CashbackConfiguracao = {
    id: configRaw.id,
    ativo: configRaw.ativo,
    percentualPrimeiraCompra: Number(configRaw.percentualPrimeiraCompra || 0),
    percentualCompraRecorrente: Number(
      configRaw.percentualCompraRecorrente || 0
    ),
    somenteClienteCadastrado: configRaw.somenteClienteCadastrado,
    permitirComCupom: configRaw.permitirComCupom,
    permitirProdutoComDesconto: configRaw.permitirProdutoComDesconto,
    diasValidade: configRaw.diasValidade,
  };

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Loja
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Cashback
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Configure as regras de cashback da loja, incluindo primeira compra,
            compras recorrentes, uso com cupons e validade do benefício.
          </p>
        </div>
      </section>

      <CashbackConfiguracaoClient config={config} />
    </main>
  );
}