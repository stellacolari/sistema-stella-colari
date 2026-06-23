import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  History,
  Info,
  Mail,
  PackageCheck,
  Phone,
  Repeat2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import ConsentimentosClienteCard from "@/components/clientes/ConsentimentosClienteCard";
import type {
  ConfiabilidadeFichaCliente,
  Ficha360Cliente as Ficha360ClienteData,
  Ficha360HistoricoItem,
  Ficha360Oportunidade,
  Ficha360SinalCliente,
  Ficha360TimelineItem,
  PrioridadeFichaCliente,
  StatusRelacionamentoCliente,
} from "@/lib/clientes/ficha-360";

type Ficha360ClienteProps = {
  ficha: Ficha360ClienteData;
  podeEditarConsentimento: boolean;
};

const confiabilidadeClasses: Record<ConfiabilidadeFichaCliente, string> = {
  ALTA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIA: "border-blue-200 bg-blue-50 text-blue-700",
  BAIXA: "border-slate-200 bg-slate-50 text-slate-600",
};

const prioridadeClasses: Record<PrioridadeFichaCliente, string> = {
  ALTA: "border-red-200 bg-red-50 text-red-700",
  MEDIA: "border-amber-200 bg-amber-50 text-amber-700",
  BAIXA: "border-slate-200 bg-slate-50 text-slate-600",
};

const relacionamentoClasses: Record<StatusRelacionamentoCliente, string> = {
  NOVO: "border-blue-200 bg-blue-50 text-blue-700",
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RECORRENTE: "border-violet-200 bg-violet-50 text-violet-700",
  INATIVO: "border-amber-200 bg-amber-50 text-amber-700",
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function dataCurta(dataIso: string | null) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function dataCompleta(dataIso: string | null) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function CardResumo({
  label,
  valor,
  detalhe,
  icon,
  tone = "slate",
}: {
  label: string;
  valor: string;
  detalhe: string;
  icon: ReactNode;
  tone?: "slate" | "blue" | "emerald" | "amber" | "red";
}) {
  const tones = {
    slate: {
      card: "bg-white ring-slate-200",
      icon: "bg-slate-100 text-slate-700",
      label: "text-slate-500",
      valor: "text-slate-950",
      detalhe: "text-slate-500",
    },
    blue: {
      card: "bg-blue-50 ring-blue-200",
      icon: "bg-blue-100 text-blue-700",
      label: "text-blue-700",
      valor: "text-blue-950",
      detalhe: "text-blue-900/80",
    },
    emerald: {
      card: "bg-emerald-50 ring-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-700",
      valor: "text-emerald-950",
      detalhe: "text-emerald-900/80",
    },
    amber: {
      card: "bg-amber-50 ring-amber-200",
      icon: "bg-amber-100 text-amber-700",
      label: "text-amber-700",
      valor: "text-amber-950",
      detalhe: "text-amber-900/80",
    },
    red: {
      card: "bg-red-50 ring-red-200",
      icon: "bg-red-100 text-red-700",
      label: "text-red-700",
      valor: "text-red-950",
      detalhe: "text-red-900/80",
    },
  };
  const classes = tones[tone];

  return (
    <article className={`rounded-3xl p-5 shadow-sm ring-1 ${classes.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${classes.label}`}>{label}</p>
          <p className={`mt-2 text-2xl font-bold ${classes.valor}`}>{valor}</p>
          <p className={`mt-1 text-sm leading-5 ${classes.detalhe}`}>
            {detalhe}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

function InfoContato({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TimelineIcon({ tipo }: { tipo: Ficha360TimelineItem["tipo"] }) {
  if (tipo === "OPERACIONAL") {
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  }

  if (tipo === "PEDIDO") {
    return <PackageCheck className="h-4 w-4 text-blue-700" />;
  }

  if (tipo === "VENDA") {
    return <ShoppingBag className="h-4 w-4 text-emerald-700" />;
  }

  return <Sparkles className="h-4 w-4 text-slate-600" />;
}

function TimelineItem({ item }: { item: Ficha360TimelineItem }) {
  return (
    <article className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[36px_minmax(0,1fr)_140px]">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <TimelineIcon tipo={item.tipo} />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-950">
            {item.titulo}
          </h3>
          <Badge className={confiabilidadeClasses[item.confiabilidade]}>
            {item.confiabilidade.toLowerCase()}
          </Badge>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {item.descricao}
        </p>
      </div>

      <div className="text-left md:text-right">
        <p className="text-xs font-semibold text-slate-500">
          {dataCompleta(item.data)}
        </p>
        {item.href ? (
          <Link
            href={item.href}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            Abrir
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function SinalItem({ sinal }: { sinal: Ficha360SinalCliente }) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-slate-400">
          {sinal.tipo}
        </p>
        <Badge className={confiabilidadeClasses[sinal.confiabilidade]}>
          {sinal.confiabilidade.toLowerCase()}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">
        {sinal.valor}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{sinal.detalhe}</p>
    </article>
  );
}

function OportunidadeItem({
  oportunidade,
}: {
  oportunidade: Ficha360Oportunidade;
}) {
  return (
    <article className="border-b border-slate-100 px-5 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={prioridadeClasses[oportunidade.prioridade]}>
          {oportunidade.prioridade.toLowerCase()}
        </Badge>
        <Badge className={confiabilidadeClasses[oportunidade.confiabilidade]}>
          {oportunidade.confiabilidade.toLowerCase()}
        </Badge>
        <span className="text-xs font-semibold uppercase text-slate-400">
          {oportunidade.tipo}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">
        {oportunidade.titulo}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {oportunidade.motivo}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
        {oportunidade.acaoSugerida}
      </p>
      {oportunidade.avisoPrivacidade ? (
        <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          {oportunidade.avisoPrivacidade}
        </p>
      ) : null}
    </article>
  );
}

function HistoricoRow({ item }: { item: Ficha360HistoricoItem }) {
  return (
    <tr className="text-sm text-slate-700">
      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
        {item.codigo}
      </td>
      <td className="whitespace-nowrap px-4 py-4">{dataCurta(item.data)}</td>
      <td className="px-4 py-4">{item.tipo}</td>
      <td className="px-4 py-4">{item.canal}</td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <span>{item.status}</span>
          {item.pagamento ? (
            <span className="text-xs text-slate-500">{item.pagamento}</span>
          ) : null}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
        {moeda(item.total)}
      </td>
      <td className="px-4 py-4 text-right">
        <Link
          href={item.href}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Abrir
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function DisponibilidadeDado({
  label,
  disponivel,
}: {
  label: string;
  disponivel: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span
        className={`text-xs font-semibold ${
          disponivel ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {disponivel ? "disponivel" : "indisponivel"}
      </span>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm leading-6 text-slate-500">
      {children}
    </div>
  );
}

export default function Ficha360Cliente({
  ficha,
  podeEditarConsentimento,
}: Ficha360ClienteProps) {
  const dadosDisponiveis = [
    { label: "Clientes", disponivel: ficha.dados.clientes },
    { label: "Pedidos online", disponivel: ficha.dados.pedidosOnline },
    { label: "Vendas internas", disponivel: ficha.dados.vendasInternas },
    { label: "Eventos comerciais", disponivel: ficha.dados.eventosComerciais },
    {
      label: "Favoritos persistidos",
      disponivel: ficha.dados.favoritosPersistidos,
    },
    {
      label: "Consentimento persistido",
      disponivel: ficha.dados.consentimentoMarketingPersistido,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              Clientes
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Ficha 360 - {ficha.cliente.nome}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Antes de falar com este cliente, revise historico, sinais,
              oportunidades manuais e cuidados operacionais.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                {ficha.cliente.codigo}
              </Badge>
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                {ficha.cliente.status}
              </Badge>
              <Badge
                className={relacionamentoClasses[ficha.relacionamento.status]}
              >
                {ficha.relacionamento.label}
              </Badge>
              <Badge
                className={
                  ficha.cliente.contato === "COMPLETO"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }
              >
                {ficha.cliente.contato === "COMPLETO"
                  ? "contato completo"
                  : "contato incompleto"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/clientes/relacionamento"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              CRM
            </Link>
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Clientes
            </Link>
            <Link
              href={`/clientes/${ficha.cliente.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Editar cadastro
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoContato
          icon={<UserRound className="h-4 w-4" />}
          label="Tipo"
          value={ficha.cliente.tipoCliente}
        />
        <InfoContato
          icon={<Phone className="h-4 w-4" />}
          label="Telefone"
          value={ficha.cliente.telefone || "Nao informado"}
        />
        <InfoContato
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          value={ficha.cliente.email || "Nao informado"}
        />
        <InfoContato
          icon={<CalendarClock className="h-4 w-4" />}
          label="Cadastro"
          value={dataCurta(ficha.cliente.criadoEm)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          label="Compras"
          valor={numero(ficha.resumo.totalCompras)}
          detalhe={`${ficha.resumo.pedidosOnline} online - ${ficha.resumo.vendasInternas} internas`}
          icon={<ShoppingBag className="h-5 w-5" />}
          tone="blue"
        />
        <CardResumo
          label="Total comprado"
          valor={moeda(ficha.resumo.totalComprado)}
          detalhe={`Ticket medio ${moeda(ficha.resumo.ticketMedio)}`}
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <CardResumo
          label="Ultima compra"
          valor={dataCurta(ficha.relacionamento.ultimaCompraEm)}
          detalhe={ficha.relacionamento.detalhe}
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <CardResumo
          label="Recorrencia"
          valor={ficha.relacionamento.label}
          detalhe={ficha.resumo.recorrencia}
          icon={<Repeat2 className="h-5 w-5" />}
        />
        <CardResumo
          label="Atencao"
          valor={numero(ficha.resumo.pedidosComAtencao)}
          detalhe="Pedidos com problema ou pagamento pendente"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={ficha.resumo.pedidosComAtencao > 0 ? "red" : "slate"}
        />
        <CardResumo
          label="Sinais recentes"
          valor={numero(ficha.resumo.sinaisRecentes)}
          detalhe="Eventos vinculados nos ultimos 30 dias"
          icon={<Sparkles className="h-5 w-5" />}
          tone={ficha.resumo.sinaisRecentes > 0 ? "amber" : "slate"}
        />
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <p className="text-sm leading-6 text-blue-950">
            {ficha.avisoPrivacidade}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
              <History className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Linha do tempo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Eventos recentes em ordem cronologica inversa.
                </p>
              </div>
            </div>

            {ficha.timeline.length === 0 ? (
              <div className="p-5">
                <EmptyState>
                  A linha do tempo ficara mais util quando houver pedidos,
                  vendas ou eventos vinculados ao cliente.
                </EmptyState>
              </div>
            ) : (
              <div>{ficha.timeline.map((item) => <TimelineItem key={item.id} item={item} />)}</div>
            )}
          </section>

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
              <ClipboardList className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Historico de pedidos e vendas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Valores cobrados ao cliente e status do atendimento.
                </p>
              </div>
            </div>

            {ficha.historico.length === 0 ? (
              <div className="p-5">
                <EmptyState>Nenhum pedido ou venda vinculado.</EmptyState>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-sm text-slate-600">
                      <th className="px-4 py-3 font-semibold">Codigo</th>
                      <th className="px-4 py-3 font-semibold">Data</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Canal</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ficha.historico.map((item) => (
                      <HistoricoRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <ConsentimentosClienteCard
            clienteId={ficha.cliente.id}
            resumoInicial={ficha.consentimento}
            podeEditar={podeEditarConsentimento}
          />

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
              <Sparkles className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Oportunidades manuais
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Sugestoes sem automacao ou disparo.
                </p>
              </div>
            </div>

            {ficha.oportunidades.length === 0 ? (
              <div className="p-5">
                <EmptyState>Nenhuma oportunidade manual priorizada.</EmptyState>
              </div>
            ) : (
              <div>
                {ficha.oportunidades.map((oportunidade) => (
                  <OportunidadeItem
                    key={oportunidade.id}
                    oportunidade={oportunidade}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Preferencias e sinais
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compras reais pesam mais que eventos de intencao.
                </p>
              </div>
            </div>

            {ficha.sinais.length === 0 ? (
              <div className="mt-5">
                <EmptyState>
                  Sem sinais suficientes. Evite inferir preferencia com dado
                  fraco.
                </EmptyState>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {ficha.sinais.map((sinal) => (
                  <SinalItem key={sinal.id} sinal={sinal} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-950">
              Dados usados
            </h2>
            <div className="mt-5 space-y-3">
              {dadosDisponiveis.map((dado) => (
                <DisponibilidadeDado
                  key={dado.label}
                  label={dado.label}
                  disponivel={dado.disponivel}
                />
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
