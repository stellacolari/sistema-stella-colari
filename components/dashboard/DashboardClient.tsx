"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Lightbulb,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Warehouse,
} from "lucide-react";
import type {
  AreaAcaoAdmin,
  CentralAcoesAdminData,
} from "@/lib/dashboard/central-acoes";

const DASHBOARD_DESTAQUE_IMAGEM_URL =
  "/uploads/loja/1777647841602-banner-stella.jpg";
const DASHBOARD_DESTAQUE_LINK_URL = "/loja";

export type DashboardStatusItem = {
  status: string;
  label: string;
  quantidade: number;
};

export type DashboardEstoqueAlertaItem = {
  id: string;
  tipo: string;
  codigo: string;
  nome: string;
  quantidadeAtual: number;
  valorAcumulado: number;
  situacao: string;
};

export type DashboardMovimentacaoItem = {
  id: string;
  codigoMovimentacao: string;
  tipoMovimentacao: string;
  tipoMovimentacaoLabel: string;
  origemTipo: string;
  codigoItem: string;
  itemTipo: string;
  quantidade: number;
  tamanhoAnel: string | null;
  custo: number;
  faturamento: number;
  criadoEm: string;
  status: string;
};

export type DashboardAtalhoRapido = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  destaque?: boolean;
};

export type DashboardPermissoes = {
  pedidos: boolean;
  vendas: boolean;
  clientes: boolean;
  produtos: boolean;
  estoque: boolean;
  recomendacoes: boolean;
  intencaoComercial: boolean;
  lojaOnline: boolean;
  notificacoes: boolean;
  relatorios: boolean;
};

export type DashboardData = {
  geradoEm: string;
  podeVerDadosFinanceiros: boolean;
  permissoes: DashboardPermissoes;
  atalhosRapidos: DashboardAtalhoRapido[];
  cards: {
    totalVendido: number;
    lucroTotal: number;
    gastoTotalVendas: number;
    totalComprado: number;
    clientesAtivos: number;
    vendasAtivas: number;
    pedidosOnlinePagos: number;
    totalPedidosOnlinePagos: number;
    comprasAtivas: number;
    quantidadeItensVendidos: number;
    quantidadeItensComprados: number;
    quantidadeProdutosEmEstoque: number;
    quantidadeAdicionaisEmEstoque: number;
    valorEstoqueProdutos: number;
    valorEstoqueAdicionais: number;
    alertasEstoque: number;
  };
  vendasPorStatus: DashboardStatusItem[];
  alertasEstoque: DashboardEstoqueAlertaItem[];
  ultimasMovimentacoes: DashboardMovimentacaoItem[];
};

type DashboardClientProps = {
  data: DashboardData;
  centralAcoes: CentralAcoesAdminData;
  usuarioNome?: string | null;
  usuarioEmail?: string | null;
};

type Tone = "slate" | "emerald" | "blue" | "amber" | "red" | "violet";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function dataCompleta(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function periodoCurto(dataIso: string) {
  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) return "Hoje";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(data);
}

function primeiroNomeUsuario(nome?: string | null, email?: string | null) {
  const nomeLimpo = String(nome || "").trim();

  if (nomeLimpo) {
    return nomeLimpo.split(/\s+/)[0];
  }

  const emailLimpo = String(email || "").trim();
  const prefixoEmail = emailLimpo.includes("@") ? emailLimpo.split("@")[0] : "";
  const nomePorEmail = prefixoEmail.replace(/[._-]+/g, " ").trim();

  return nomePorEmail ? nomePorEmail.split(/\s+/)[0] : "";
}

function saudacaoDashboard(nome?: string | null, email?: string | null) {
  const primeiroNome = primeiroNomeUsuario(nome, email);

  return primeiroNome ? `Olá, ${primeiroNome}` : "Olá";
}

function toneClasses(tone: Tone) {
  const map: Record<
    Tone,
    {
      card: string;
      soft: string;
      icon: string;
      text: string;
      bar: string;
    }
  > = {
    slate: {
      card: "border-slate-200 bg-white text-slate-950",
      soft: "bg-slate-50 text-slate-600",
      icon: "bg-slate-100 text-slate-700",
      text: "text-slate-600",
      bar: "bg-slate-900",
    },
    emerald: {
      card: "border-emerald-200 bg-emerald-50 text-emerald-950",
      soft: "bg-emerald-100 text-emerald-700",
      icon: "bg-white text-emerald-700",
      text: "text-emerald-800",
      bar: "bg-emerald-600",
    },
    blue: {
      card: "border-blue-200 bg-blue-50 text-blue-950",
      soft: "bg-blue-100 text-blue-700",
      icon: "bg-white text-blue-700",
      text: "text-blue-800",
      bar: "bg-blue-600",
    },
    amber: {
      card: "border-amber-200 bg-amber-50 text-amber-950",
      soft: "bg-amber-100 text-amber-700",
      icon: "bg-white text-amber-700",
      text: "text-amber-800",
      bar: "bg-amber-500",
    },
    red: {
      card: "border-red-200 bg-red-50 text-red-950",
      soft: "bg-red-100 text-red-700",
      icon: "bg-white text-red-700",
      text: "text-red-800",
      bar: "bg-red-600",
    },
    violet: {
      card: "border-violet-200 bg-violet-50 text-violet-950",
      soft: "bg-violet-100 text-violet-700",
      icon: "bg-white text-violet-700",
      text: "text-violet-800",
      bar: "bg-violet-600",
    },
  };

  return map[tone];
}

function resumoPorId(data: CentralAcoesAdminData, ids: string[]) {
  return data.resumo.find((item) => ids.includes(item.id));
}

function quantidadePorArea(
  data: CentralAcoesAdminData,
  areas: AreaAcaoAdmin[],
) {
  return data.acoes
    .filter((acao) => areas.includes(acao.area))
    .reduce((total, acao) => total + (acao.quantidade ?? 1), 0);
}

function prioridadeAlta(data: CentralAcoesAdminData) {
  return data.acoes.filter((acao) =>
    ["CRITICA", "ALTA"].includes(acao.prioridade),
  );
}

function statusOperacaoTexto(totalPrioritario: number) {
  if (totalPrioritario > 0) {
    return `Hoje sua loja precisa de atenção em ${numero(totalPrioritario)} ponto${totalPrioritario === 1 ? "" : "s"}.`;
  }

  return "A operação está sem alerta crítico no momento.";
}

function indicador({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/65">{detail}</p>
    </div>
  );
}

function QuickActionLink({ atalho }: { atalho: DashboardAtalhoRapido }) {
  return (
    <Link
      href={atalho.href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
        atalho.destaque
          ? "bg-slate-950 text-white hover:bg-slate-800"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {atalho.titulo}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function DashboardDestaqueExterno() {
  const imagemUrl = DASHBOARD_DESTAQUE_IMAGEM_URL.trim();

  return (
    <section
      className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-200 bg-cover bg-center shadow-sm"
      style={
        imagemUrl
          ? {
              backgroundImage: `url("${imagemUrl}")`,
            }
          : undefined
      }
    >
      {!imagemUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-300" />
      ) : null}
      <Link
        href={DASHBOARD_DESTAQUE_LINK_URL}
        className="absolute bottom-4 right-4 z-10 inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-sm ring-1 ring-slate-900/10 transition hover:bg-white"
      >
        Ver loja
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function AreaCard({
  title,
  value,
  description,
  href,
  cta,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  value: string;
  description: string;
  href?: string;
  cta: string;
  icon: ElementType;
  tone: Tone;
  children?: ReactNode;
}) {
  const colors = toneClasses(tone);
  const content = (
    <article
      className={`flex h-full flex-col rounded-[2rem] border p-5 shadow-sm transition hover:shadow-md ${colors.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.soft}`}
        >
          {title}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-3xl ${colors.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 min-h-[48px] text-sm leading-6 ${colors.text}`}>
        {description}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function StatusBars({ itens }: { itens: DashboardStatusItem[] }) {
  const max = Math.max(...itens.map((item) => item.quantidade), 1);

  if (itens.length === 0) {
    return (
      <p className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Ainda sem dados suficientes para gráfico.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {itens.slice(0, 5).map((item) => (
        <div key={item.status}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span className="truncate">{item.label}</span>
            <span>{numero(item.quantidade)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900"
              style={{
                width: `${Math.max(8, (item.quantidade / max) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AtividadeRecente({ itens }: { itens: DashboardMovimentacaoItem[] }) {
  if (itens.length === 0) {
    return (
      <p className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Ainda sem movimentações recentes.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
      {itens.slice(0, 4).map((item) => (
        <div
          key={item.id}
          className="grid gap-3 px-4 py-4 sm:grid-cols-[120px_minmax(0,1fr)_80px]"
        >
          <p className="text-xs font-semibold text-slate-500">
            {dataCompleta(item.criadoEm)}
          </p>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">
              {item.codigoItem}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {item.tipoMovimentacaoLabel} em {item.origemTipo}
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-900 sm:text-right">
            {numero(item.quantidade)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function DashboardClient({
  data,
  centralAcoes,
  usuarioNome,
  usuarioEmail,
}: DashboardClientProps) {
  const criticas = prioridadeAlta(centralAcoes);
  const acaoPrincipal = centralAcoes.acoes[0] || null;
  const resumoPedidos = resumoPorId(centralAcoes, ["pedidos"]);
  const resumoCatalogo = resumoPorId(centralAcoes, ["catalogo"]);
  const resumoRecomendacoes = resumoPorId(centralAcoes, [
    "recomendacoes",
    "impactos-recomendacoes",
  ]);
  const quantidadeClientes = quantidadePorArea(centralAcoes, ["CLIENTES"]);
  const quantidadeMarketing = quantidadePorArea(centralAcoes, ["MARKETING"]);
  const totalEstoque =
    data.cards.quantidadeProdutosEmEstoque +
    data.cards.quantidadeAdicionaisEmEstoque;
  const valorOperacao = data.podeVerDadosFinanceiros
    ? moeda(data.cards.totalVendido)
    : numero(data.cards.quantidadeItensVendidos);
  const valorOperacaoLabel = data.podeVerDadosFinanceiros
    ? "Vendido"
    : "Itens vendidos";

  const cardsArea = [
    data.permissoes.pedidos
      ? {
          title: "Operação",
          value: numero(resumoPedidos?.valor ?? 0),
          description:
            resumoPedidos?.descricao ||
            "Pedidos e rotinas que precisam de acompanhamento.",
          href: resumoPedidos?.href || "/pedidos",
          cta: "Abrir operação",
          icon: ClipboardList,
          tone: (resumoPedidos?.tom === "critico" ? "red" : "blue") as Tone,
        }
      : null,
    data.permissoes.pedidos || data.permissoes.vendas
      ? {
          title: "Vendas/Pedidos",
          value: numero(data.cards.vendasAtivas),
          description: `${numero(data.cards.pedidosOnlinePagos)} pedido(s) online pago(s) dentro da leitura atual.`,
          href: data.permissoes.pedidos ? "/pedidos" : "/vendas",
          cta: "Ver vendas",
          icon: ShoppingBag,
          tone: "emerald" as Tone,
        }
      : null,
    data.permissoes.clientes
      ? {
          title: "Clientes/CRM",
          value: numero(data.cards.clientesAtivos),
          description: `${numero(quantidadeClientes)} sinal(is) de relacionamento em atenção.`,
          href: "/clientes/relacionamento/campanhas",
          cta: "Abrir CRM",
          icon: MessageCircle,
          tone: "violet" as Tone,
        }
      : null,
    data.permissoes.produtos ||
    data.permissoes.estoque ||
    data.permissoes.lojaOnline
      ? {
          title: "Loja/Catálogo",
          value: numero(data.cards.alertasEstoque),
          description:
            resumoCatalogo?.descricao ||
            `${numero(totalEstoque)} item(ns) mapeados em estoque e catálogo.`,
          href: data.permissoes.estoque
            ? "/estoque"
            : data.permissoes.produtos
              ? "/produtos"
              : "/configuracoes/loja",
          cta: "Revisar catálogo",
          icon: PackageSearch,
          tone: (data.cards.alertasEstoque > 0 ? "amber" : "emerald") as Tone,
        }
      : null,
    data.permissoes.recomendacoes
      ? {
          title: "Copiloto",
          value: numero(resumoRecomendacoes?.valor ?? 0),
          description:
            resumoRecomendacoes?.descricao ||
            "Recomendações prontas para revisão administrativa.",
          href: resumoRecomendacoes?.href || "/compras/recomendacoes",
          cta: "Ver recomendações",
          icon: Lightbulb,
          tone: "amber" as Tone,
        }
      : null,
    data.permissoes.intencaoComercial || data.permissoes.lojaOnline
      ? {
          title: "Funil/Analytics",
          value: numero(quantidadeMarketing),
          description:
            "Sinais de busca, funil e intenção comercial para acompanhar.",
          href: data.permissoes.intencaoComercial
            ? "/compras/intencao"
            : "/configuracoes/loja",
          cta: "Abrir funil",
          icon: BarChart3,
          tone: "blue" as Tone,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card));

  return (
    <section className="space-y-8">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Dashboard administrativo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {saudacaoDashboard(usuarioNome, usuarioEmail)}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {periodoCurto(data.geradoEm)}. Painel executivo da operação.
            </p>
          </div>

          {data.atalhosRapidos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.atalhosRapidos.map((atalho) => (
                <QuickActionLink key={atalho.id} atalho={atalho} />
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 shadow-sm">
          <div className="p-6 sm:p-7">
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/55">
                    Resumo executivo
                  </p>
                  <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {statusOperacaoTexto(criticas.length)}
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                    {acaoPrincipal
                      ? acaoPrincipal.descricao
                      : "Use os atalhos para revisar pedidos, clientes, catálogo e recomendações sem perder o ritmo da loja."}
                  </p>
                </div>
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white text-slate-950 sm:flex">
                  {criticas.length > 0 ? (
                    <Sparkles className="h-6 w-6" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6" />
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {indicador({
                  label: "Ações",
                  value: numero(centralAcoes.acoes.length),
                  detail: `${numero(criticas.length)} alta prioridade`,
                })}
                {indicador({
                  label: "Pedidos",
                  value: numero(data.cards.pedidosOnlinePagos),
                  detail: "online pagos",
                })}
                {indicador({
                  label: "Clientes",
                  value: numero(data.cards.clientesAtivos),
                  detail: "fora da lixeira",
                })}
                {indicador({
                  label: valorOperacaoLabel,
                  value: valorOperacao,
                  detail: data.podeVerDadosFinanceiros
                    ? "valor operacional"
                    : "sem dado financeiro",
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                {acaoPrincipal?.href ? (
                  <Link
                    href={acaoPrincipal.href}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    {acaoPrincipal.cta || "Abrir prioridade"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
                <Link
                  href="#central-acoes-detalhada"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Central de ações
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <DashboardDestaqueExterno />
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cardsArea.map((card) => (
          <AreaCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
            href={card.href}
            cta={card.cta}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                Gráfico simples
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Vendas por status
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6">
            <StatusBars itens={data.vendasPorStatus} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                Movimento
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Atividade recente
              </h2>
            </div>
            <Link
              href={data.permissoes.estoque ? "/movimentacoes" : "/dashboard"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              Ver detalhes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <AtividadeRecente itens={data.ultimasMovimentacoes} />
          </div>
        </section>
      </section>

      {data.podeVerDadosFinanceiros ? (
        <section className="grid gap-4 md:grid-cols-3">
          <AreaCard
            title="Receita"
            value={moeda(data.cards.totalVendido)}
            description={`Pedidos e vendas ativos. Online pago: ${moeda(data.cards.totalPedidosOnlinePagos)}.`}
            href={data.permissoes.relatorios ? "/relatorios" : undefined}
            cta="Ver relatórios"
            icon={ReceiptText}
            tone="emerald"
          />
          <AreaCard
            title="Margem"
            value={moeda(data.cards.lucroTotal)}
            description={`Gasto vinculado a vendas/pedidos: ${moeda(data.cards.gastoTotalVendas)}.`}
            href={data.permissoes.relatorios ? "/relatorios" : undefined}
            cta="Analisar resultado"
            icon={ShieldCheck}
            tone="blue"
          />
          <AreaCard
            title="Estoque"
            value={moeda(
              data.cards.valorEstoqueProdutos +
                data.cards.valorEstoqueAdicionais,
            )}
            description="Valor em produtos e adicionais, visível apenas para perfis autorizados."
            href={data.permissoes.estoque ? "/estoque" : undefined}
            cta="Ver estoque"
            icon={Warehouse}
            tone="slate"
          />
        </section>
      ) : null}
    </section>
  );
}
