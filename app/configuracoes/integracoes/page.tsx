import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  PackageSearch,
  Plug,
  ShoppingBag,
  Truck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Integrações | Sistema Stella",
};

const integracoes = [
  {
    titulo: "Importar pedido externo",
    descricao:
      "Tela técnica para testar entrada de pedidos de Mercado Livre, Shopee, TikTok Shop e outros canais.",
    href: "/configuracoes/integracoes/importar-pedido",
    status: "Disponível para teste",
    icon: PackageSearch,
  },
  {
  titulo: "Produtos por canal",
  descricao:
    "Vincule SKUs e IDs externos dos marketplaces aos produtos internos do Stella.",
  href: "/configuracoes/integracoes/produtos-canais",
  status: "Disponível para teste",
  icon: PackageSearch,
},
  {
    titulo: "Mercado Livre",
    descricao:
      "Base futura para conexão da conta, importação de pedidos, estoque, frete e etiquetas.",
    href: "#",
    status: "Planejado",
    icon: ShoppingBag,
  },
  {
    titulo: "Shopee",
    descricao:
      "Base futura para pedidos, etiquetas, rastreio e sincronização de estoque.",
    href: "#",
    status: "Planejado",
    icon: ShoppingBag,
  },
  {
    titulo: "TikTok Shop",
    descricao:
      "Base futura para pedidos, creators, fulfillment, etiquetas e produtos por canal.",
    href: "#",
    status: "Planejado",
    icon: ShoppingBag,
  },
  {
    titulo: "Gateway de pagamento",
    descricao:
      "Base futura para checkout seguro, webhook assinado, conciliação e status automático de pagamento.",
    href: "#",
    status: "Planejado",
    icon: CreditCard,
  },
  {
    titulo: "Gateway de frete",
    descricao:
      "Base futura para cotação, geração de etiqueta, rastreio e impressão em lote.",
    href: "#",
    status: "Planejado",
    icon: Truck,
  },
];

export default function IntegracoesPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Sistema
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Integrações
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Central para conectar canais de venda, gateways de pagamento,
              frete, etiquetas e futuras automações do Stella.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Plug className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integracoes.map((integracao) => {
          const Icone = integracao.icon;
          const ativo = integracao.href !== "#";

          const conteudo = (
            <article
              className={`group h-full rounded-[2rem] border bg-white p-5 shadow-sm transition ${
                ativo
                  ? "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  : "border-slate-200 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icone className="h-5 w-5" />
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    ativo
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {integracao.status}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-slate-950">
                {integracao.titulo}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {integracao.descricao}
              </p>

              {ativo && (
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Abrir
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              )}
            </article>
          );

          if (!ativo) {
            return <div key={integracao.titulo}>{conteudo}</div>;
          }

          return (
            <Link key={integracao.titulo} href={integracao.href}>
              {conteudo}
            </Link>
          );
        })}
      </section>
    </main>
  );
}