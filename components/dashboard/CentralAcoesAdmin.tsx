import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Lightbulb,
  PackageSearch,
  SearchX,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  AcaoAdmin,
  AreaAcaoAdmin,
  CentralAcoesAdminData,
  PrioridadeAcaoAdmin,
  ResumoCentralAcoesItem,
} from "@/lib/dashboard/central-acoes";

type CentralAcoesAdminProps = {
  data: CentralAcoesAdminData;
};

const AREA_LABEL: Record<AreaAcaoAdmin, string> = {
  PEDIDOS: "Pedidos",
  CATALOGO: "Catalogo",
  CLIENTES: "Clientes",
  MARKETING: "Marketing",
  OPERACAO: "Operacao",
  FINANCEIRO: "Financeiro",
  SISTEMA: "Sistema",
};

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function prioridadeClasse(prioridade: PrioridadeAcaoAdmin) {
  if (prioridade === "CRITICA") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (prioridade === "ALTA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (prioridade === "MEDIA") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function resumoClasse(tom: ResumoCentralAcoesItem["tom"]) {
  if (tom === "critico") {
    return {
      card: "border-red-200 bg-red-50",
      icon: "bg-white text-red-700 ring-red-200",
      value: "text-red-950",
      text: "text-red-700",
    };
  }

  if (tom === "alerta") {
    return {
      card: "border-amber-200 bg-amber-50",
      icon: "bg-white text-amber-700 ring-amber-200",
      value: "text-amber-950",
      text: "text-amber-700",
    };
  }

  if (tom === "positivo") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      icon: "bg-white text-emerald-700 ring-emerald-200",
      value: "text-emerald-950",
      text: "text-emerald-700",
    };
  }

  return {
    card: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-700 ring-slate-200",
    value: "text-slate-950",
    text: "text-slate-500",
  };
}

function areaIcone(area: AreaAcaoAdmin) {
  if (area === "PEDIDOS" || area === "OPERACAO") return ClipboardList;
  if (area === "CATALOGO") return PackageSearch;
  if (area === "CLIENTES") return Users;
  if (area === "MARKETING") return SearchX;
  if (area === "SISTEMA") return Bell;
  return Sparkles;
}

function resumoIcone(id: string) {
  if (id === "pedidos") return ClipboardList;
  if (id === "catalogo") return PackageSearch;
  if (id === "recomendacoes") return Lightbulb;
  if (id === "impactos-recomendacoes") return CheckCircle2;
  return AlertTriangle;
}

function ResumoCard({ item }: { item: ResumoCentralAcoesItem }) {
  const classe = resumoClasse(item.tom);
  const Icone = resumoIcone(item.id);
  const conteudo = (
    <div className={`h-full rounded-3xl border p-4 shadow-sm ${classe.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${classe.text}`}>
            {item.titulo}
          </p>
          <p className={`mt-2 text-3xl font-black ${classe.value}`}>
            {numero(item.valor)}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${classe.icon}`}
        >
          <Icone className="h-5 w-5" />
        </div>
      </div>
      <p className={`mt-3 text-sm leading-5 ${classe.text}`}>
        {item.descricao}
      </p>
      {item.href && item.cta ? (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-900">
          {item.cta}
          <ArrowRight className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );

  if (!item.href) {
    return conteudo;
  }

  return (
    <Link href={item.href} className="block h-full">
      {conteudo}
    </Link>
  );
}

function AcaoItem({ acao }: { acao: AcaoAdmin }) {
  const Icone = areaIcone(acao.area);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            <Icone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${prioridadeClasse(
                  acao.prioridade
                )}`}
              >
                {acao.prioridade}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                {AREA_LABEL[acao.area]}
              </span>
              {typeof acao.quantidade === "number" ? (
                <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
                  {numero(acao.quantidade)}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-950">
              {acao.titulo}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {acao.descricao}
            </p>
            {acao.explicacao ? (
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                {acao.explicacao}
              </p>
            ) : null}
          </div>
        </div>
        {acao.href && acao.cta ? (
          <Link
            href={acao.href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {acao.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function CentralAcoesAdmin({ data }: CentralAcoesAdminProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Central de comando
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Central de acoes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Prioridades para operar a Stella Colari hoje.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">Perfil: </span>
            {data.perfilAtual}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.resumo.map((item) => (
          <ResumoCard key={item.id} item={item} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Acoes prioritarias
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ate 8 sinais ordenados por urgencia e impacto operacional.
              </p>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">
              {numero(data.acoes.length)}
            </span>
          </div>

          {data.acoes.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <h3 className="font-black">Nenhuma acao critica agora.</h3>
                  <p className="mt-1 text-sm leading-6">
                    A operacao esta em dia. Use os links rapidos para revisar
                    rotinas ou acompanhar indicadores.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.acoes.map((acao) => (
                <AcaoItem key={acao.id} acao={acao} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-slate-700" />
              <h2 className="text-base font-black text-slate-950">
                Proximos passos
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.proximosPassos.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">
                  Nenhum proximo passo adicional para o perfil atual.
                </p>
              ) : (
                data.proximosPassos.map((passo) => (
                  <Link
                    key={passo.id}
                    href={passo.href}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-white hover:shadow-sm"
                  >
                    <p className="text-sm font-bold text-slate-950">
                      {passo.titulo}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {passo.descricao}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">
              Links rapidos
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {data.linksRapidos.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm transition hover:bg-slate-50"
                >
                  <span>
                    <span className="block font-bold text-slate-950">
                      {link.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {link.descricao}
                    </span>
                  </span>
                  {link.href.startsWith("/loja") ? (
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
