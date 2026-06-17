import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  Lightbulb,
  Megaphone,
  MousePointerClick,
  Package,
  Plus,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { contarNotificacoesNaoLidas } from "@/lib/notificacoes/notificacoes";

export const dynamic = "force-dynamic";

const atalhosRelacionados = [
  { label: "Produtos", href: "/produtos", icon: Package },
  { label: "Itens adicionais", href: "/itens-adicionais", icon: Boxes },
  { label: "Embalagens", href: "/configuracoes/loja/embalagens", icon: Store },
  { label: "Configuracoes de loja", href: "/configuracoes/loja", icon: Settings },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default async function ComprasPage() {
  const usuario = await exigirAdmin();
  const podeVerEstrategico = usuario.perfil === "ACESSO_GERAL";
  const [
    totalComprasEstoque,
    totalGastos,
    gastosAbertos,
    gastosPagosMes,
    recomendacoesNovas,
    campanhasEmAberto,
    produtosSemCusto,
    produtosEstoqueCritico,
    colecoesAbertas,
    contadoresNotificacao,
  ] = await Promise.all([
    prisma.compra.count({
      where: { status: { not: "NA_LIXEIRA" } },
    }),
    prisma.lancamentoFinanceiro.count({
      where: { status: { not: "NA_LIXEIRA" } },
    }),
    prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: { in: ["PENDENTE", "VENCIDO"] },
      },
      _sum: { valorReal: true },
    }),
    prisma.lancamentoFinanceiro.aggregate({
      where: {
        status: { not: "NA_LIXEIRA" },
        statusPagamento: "PAGO",
        dataPagamento: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { valorReal: true },
    }),
    podeVerEstrategico
      ? prisma.recomendacaoGerencial.count({ where: { status: "NOVA" } })
      : Promise.resolve(0),
    podeVerEstrategico
      ? prisma.campanhaComercial.count({
          where: { status: { in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"] } },
        })
      : Promise.resolve(0),
    podeVerEstrategico
      ? prisma.produto.count({
          where: {
            status: { not: "NA_LIXEIRA" },
            custoBase: 0,
          },
        })
      : Promise.resolve(0),
    prisma.estoqueProduto.count({
      where: {
        quantidadeAtual: { lte: 1 },
        produto: {
          ativo: true,
          status: { not: "NA_LIXEIRA" },
        },
      },
    }),
    podeVerEstrategico
      ? prisma.colecaoInteligente.count({
          where: { status: { in: ["RASCUNHO", "ATIVA"] } },
        })
      : Promise.resolve(0),
    podeVerEstrategico
      ? contarNotificacoesNaoLidas(usuario.id, usuario.perfil)
      : Promise.resolve({
          total: 0,
          pedidos: 0,
          reposicao: 0,
          recomendacoes: 0,
          campanhas: 0,
          precificacao: 0,
        }),
  ]);

  const temAtencao =
    contadoresNotificacao.pedidos > 0 ||
    contadoresNotificacao.reposicao > 0 ||
    produtosEstoqueCritico > 0 ||
    recomendacoesNovas > 0 ||
    produtosSemCusto > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Compras e Gestao
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Hub comercial e financeiro
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Acompanhe pendencias, demanda da loja, recomendacoes, reposicao,
              compras de estoque e financeiro em uma visao organizada.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/compras/estoque"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ShoppingCart className="h-4 w-4" />
              Compras de estoque
            </Link>
            <Link
              href="/compras/gastos"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <CreditCard className="h-4 w-4" />
              Gastos financeiros
            </Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Atencao agora"
          description="Itens que merecem revisao antes de iniciar novas acoes."
        />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AcaoPendenteCard
            titulo={`${contadoresNotificacao.pedidos} pedidos precisam de atencao`}
            href="/notificacoes?categoria=PEDIDO"
            ativo={contadoresNotificacao.pedidos > 0}
          />
          <AcaoPendenteCard
            titulo={`${Math.max(contadoresNotificacao.reposicao, produtosEstoqueCritico)} reposicoes ou estoques criticos`}
            href="/compras/reposicao"
            ativo={contadoresNotificacao.reposicao > 0 || produtosEstoqueCritico > 0}
          />
          <AcaoPendenteCard
            titulo={`${recomendacoesNovas} recomendacoes novas`}
            href="/compras/recomendacoes"
            ativo={podeVerEstrategico && recomendacoesNovas > 0}
          />
          <AcaoPendenteCard
            titulo={`${produtosSemCusto} produtos sem custo`}
            href="/compras/precificacao"
            ativo={podeVerEstrategico && produtosSemCusto > 0}
          />
          {!temAtencao && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-800 xl:col-span-4">
              Nenhuma pendencia critica no momento.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Compras de estoque" valor={totalComprasEstoque} />
        <ResumoCard titulo="Gastos cadastrados" valor={totalGastos} />
        <ResumoCard
          titulo="Gastos em aberto"
          valor={moeda(Number(gastosAbertos._sum.valorReal ?? 0))}
        />
        <ResumoCard
          titulo="Pago este mes"
          valor={moeda(Number(gastosPagosMes._sum.valorReal ?? 0))}
        />
      </section>

      <section>
        <SectionHeader
          title="Gestao comercial"
          description="Demanda, recomendacoes, campanhas, margem e colecoes para a loja."
        />
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HubCard
            icon={MousePointerClick}
            title="Intencao Comercial"
            description="Sinais anonimos da loja: busca, favoritos, carrinho, banners e checkout."
            primaryLabel="Ver intencao"
            primaryHref="/compras/intencao"
          />

          {podeVerEstrategico && (
            <HubCard
              icon={Lightbulb}
              title="Recomendacoes Gerenciais"
              description="Acoes sugeridas pela inteligencia da plataforma e decisoes registradas."
              primaryLabel="Ver recomendacoes"
              primaryHref="/compras/recomendacoes"
              badge={recomendacoesNovas > 0 ? `${recomendacoesNovas} novas` : undefined}
              tone={recomendacoesNovas > 0 ? "attention" : "default"}
            />
          )}

          {podeVerEstrategico && (
            <HubCard
              icon={Megaphone}
              title="Campanhas Comerciais"
              description="Planeje acoes a partir de recomendacoes, intencao de compra e estoque."
              primaryLabel="Ver campanhas"
              primaryHref="/compras/campanhas"
              badge={campanhasEmAberto > 0 ? `${campanhasEmAberto} abertas` : undefined}
              tone={campanhasEmAberto > 0 ? "attention" : "default"}
            />
          )}

          {podeVerEstrategico && (
            <HubCard
              icon={Tags}
              title="Precificacao e Descontos"
              description="Margem, preco minimo, desconto seguro e protecao de margem por produto."
              primaryLabel="Ver precificacao"
              primaryHref="/compras/precificacao"
              badge={produtosSemCusto > 0 ? `${produtosSemCusto} sem custo` : undefined}
              tone={produtosSemCusto > 0 ? "critical" : "default"}
            />
          )}

          {podeVerEstrategico && (
            <HubCard
              icon={Store}
              title="Colecoes Inteligentes"
              description="Grupos aprovados de produtos para alimentar o builder da loja."
              primaryLabel="Ver colecoes"
              primaryHref="/configuracoes/loja/colecoes-inteligentes"
              badge={colecoesAbertas > 0 ? `${colecoesAbertas} abertas` : undefined}
            />
          )}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Estoque e reposicao"
          description="Entradas de estoque, recompras e cadastros usados na operacao."
        />
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HubCard
            icon={RefreshCcw}
            title="Reposicao"
            description="Produtos, embalagens e insumos que precisam ser recomprados."
            primaryLabel="Ver reposicao"
            primaryHref="/compras/reposicao"
            badge={produtosEstoqueCritico > 0 ? `${produtosEstoqueCritico} criticos` : undefined}
            tone={produtosEstoqueCritico > 0 ? "attention" : "default"}
          />

          <HubCard
            icon={ShoppingCart}
            title="Compras de estoque"
            description="Compras que entram no estoque, como produtos, embalagens e insumos."
            primaryLabel="Ver compras"
            primaryHref="/compras/estoque"
            secondaryLabel="Nova compra"
            secondaryHref="/compras/nova-v2"
          />

          <HubCard
            icon={Boxes}
            title="Cadastros de apoio"
            description="Produtos, itens adicionais, embalagens e configuracoes usadas por compras."
            primaryLabel="Ver atalhos"
            primaryHref="#cadastros-relacionados"
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Financeiro"
          description="Gastos, resultado e distribuicao financeira."
        />
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <HubCard
            icon={CreditCard}
            title="Gastos financeiros"
            description="Assinaturas, compras unicas, estrutura, marketing, trafego e permutas sem alterar estoque."
            primaryLabel="Ver gastos"
            primaryHref="/compras/gastos"
            secondaryLabel="Novo lancamento"
            secondaryHref="/compras/gastos?novo=1"
          />

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Resultado e distribuicao
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Apuracao mensal, caixa, reserva, investimentos e pro-labore.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {["Apuracao mensal", "Caixa", "Reserva", "Trafego", "Investimentos", "Pro-labore"].map((item) => (
                <span key={item} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/compras/resultado"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Resultado
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/compras/financeiro"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Central Financeira
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="cadastros-relacionados" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Cadastros relacionados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Atalhos para cadastros usados por compras, estoque e loja.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {atalhosRelacionados.map((atalho) => {
            const Icon = atalho.icon;

            return (
              <Link
                key={atalho.href}
                href={atalho.href}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  {atalho.label}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function AcaoPendenteCard({
  titulo,
  href,
  ativo,
}: {
  titulo: string;
  href: string;
  ativo: boolean;
}) {
  if (!ativo) return null;

  return (
    <Link
      href={href}
      className="flex min-h-20 items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 shadow-sm transition hover:bg-amber-100"
    >
      {titulo}
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {valor}
      </p>
    </div>
  );
}

function HubCard({
  icon: Icon,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  badge,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  badge?: string;
  tone?: "default" | "attention" | "critical";
}) {
  const toneClass =
    tone === "critical"
      ? "bg-red-50 ring-red-200"
      : tone === "attention"
        ? "bg-amber-50 ring-amber-200"
        : "bg-white ring-slate-200";

  return (
    <article className={`flex h-full flex-col rounded-3xl p-5 shadow-sm ring-1 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </div>
        {badge ? (
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
            {badge}
          </span>
        ) : null}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={primaryHref}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {secondaryLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
