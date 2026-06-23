import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  ClipboardList,
  Heart,
  Info,
  Repeat2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type {
  ConfiabilidadeOportunidadeCliente,
  CrmAcionavelClientes,
  OportunidadeCliente,
  PrioridadeOportunidadeCliente,
  SegmentoCrmCliente,
  TipoOportunidadeCliente,
} from "@/lib/clientes/crm-acionavel";

type CrmAcionavelClientesProps = {
  dados: CrmAcionavelClientes;
};

const tipoLabels: Record<TipoOportunidadeCliente, string> = {
  RECOMPRA: "Recompra",
  ATENDIMENTO: "Atendimento",
  PRESENTE: "Presente",
  INTENCAO: "Intencao",
  INATIVO: "Inativo",
  OPERACIONAL: "Operacional",
};

const prioridadeClasses: Record<PrioridadeOportunidadeCliente, string> = {
  ALTA: "border-red-200 bg-red-50 text-red-700",
  MEDIA: "border-amber-200 bg-amber-50 text-amber-700",
  BAIXA: "border-slate-200 bg-slate-50 text-slate-600",
};

const confiabilidadeClasses: Record<ConfiabilidadeOportunidadeCliente, string> = {
  ALTA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIA: "border-blue-200 bg-blue-50 text-blue-700",
  BAIXA: "border-slate-200 bg-slate-50 text-slate-600",
};

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCurta(dataIso: string | null) {
  if (!dataIso) return "-";

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function consentimentoLabel(status: string) {
  if (status === "AUTORIZADO") return "contato autorizado";
  if (status === "REVOGADO") return "contato revogado";

  return "sem consentimento";
}

function consentimentoClass(status: string) {
  if (status === "AUTORIZADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REVOGADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
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
      detalhe: "text-blue-800/80",
    },
    emerald: {
      card: "bg-emerald-50 ring-emerald-200",
      icon: "bg-emerald-100 text-emerald-700",
      label: "text-emerald-700",
      valor: "text-emerald-950",
      detalhe: "text-emerald-800/80",
    },
    amber: {
      card: "bg-amber-50 ring-amber-200",
      icon: "bg-amber-100 text-amber-700",
      label: "text-amber-700",
      valor: "text-amber-950",
      detalhe: "text-amber-800/80",
    },
    red: {
      card: "bg-red-50 ring-red-200",
      icon: "bg-red-100 text-red-700",
      label: "text-red-700",
      valor: "text-red-950",
      detalhe: "text-red-800/80",
    },
  };
  const classes = tones[tone];

  return (
    <div className={`rounded-3xl p-5 shadow-sm ring-1 ${classes.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${classes.label}`}>{label}</p>
          <p className={`mt-2 text-2xl font-bold ${classes.valor}`}>{valor}</p>
          <p className={`mt-1 text-sm ${classes.detalhe}`}>{detalhe}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${classes.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
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

function SegmentoCard({ segmento }: { segmento: SegmentoCrmCliente }) {
  return (
    <article
      className={`rounded-3xl p-5 shadow-sm ring-1 ${
        segmento.disponivel
          ? "bg-white ring-slate-200"
          : "bg-slate-50 ring-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {segmento.nome}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {segmento.quantidade === null ? "-" : numero(segmento.quantidade)}
          </p>
        </div>

        <Badge className={confiabilidadeClasses[segmento.confiabilidade]}>
          {segmento.confiabilidade.toLowerCase()}
        </Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {segmento.explicacao}
      </p>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
        {segmento.acaoSugerida}
      </p>

      <Link
        href={segmento.href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
      >
        Ver contexto
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function OportunidadeItem({
  oportunidade,
  indice,
}: {
  oportunidade: OportunidadeCliente;
  indice: number;
}) {
  return (
    <article className="grid gap-4 border-b border-slate-100 px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {indice + 1}
          </span>
          <Badge className={prioridadeClasses[oportunidade.prioridade]}>
            {oportunidade.prioridade.toLowerCase()}
          </Badge>
          <Badge className={confiabilidadeClasses[oportunidade.confiabilidade]}>
            {oportunidade.confiabilidade.toLowerCase()}
          </Badge>
          <span className="text-xs font-semibold uppercase text-slate-400">
            {tipoLabels[oportunidade.tipo]}
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-950">
          {oportunidade.clienteNome}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Cliente {oportunidade.clienteCodigo}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {oportunidade.descricao}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
          {oportunidade.acaoSugerida}
        </p>
      </div>

      <div className="flex items-start lg:justify-end">
        <Link
          href={oportunidade.href}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Abrir ficha
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function CrmAcionavelClientes({
  dados,
}: CrmAcionavelClientesProps) {
  const semDados = dados.resumo.clientesTotais === 0;
  const dadosDisponiveis: { label: string; disponivel: boolean }[] = [
    { label: "Clientes", disponivel: dados.dados.clientes },
    { label: "Vendas internas", disponivel: dados.dados.vendasInternas },
    { label: "Pedidos online", disponivel: dados.dados.pedidosOnline },
    { label: "Eventos comerciais", disponivel: dados.dados.eventosComerciais },
    { label: "Favoritos persistidos", disponivel: dados.dados.favoritosPersistidos },
    {
      label: "Consentimento de marketing persistido",
      disponivel: dados.dados.consentimentoMarketingPersistido,
    },
    { label: "Datas especiais", disponivel: dados.dados.dataEspecial },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              CRM acionavel
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Relacionamento com clientes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Identifique oportunidades de atendimento, recompra e cuidado.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Voltar para clientes
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-sm font-semibold text-blue-950">
              Privacidade e atendimento manual
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              Acoes de relacionamento devem respeitar consentimento e canais
              autorizados. Nenhuma mensagem e enviada automaticamente por esta
              tela.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <CardResumo
          label="Clientes totais"
          valor={numero(dados.resumo.clientesTotais)}
          detalhe="Ativos no cadastro"
          icon={<Users className="h-5 w-5" />}
        />
        <CardResumo
          label="Recorrentes"
          valor={numero(dados.resumo.clientesRecorrentes)}
          detalhe="Mais de uma compra"
          icon={<Repeat2 className="h-5 w-5" />}
          tone="emerald"
        />
        <CardResumo
          label="Novos"
          valor={numero(dados.resumo.clientesNovos)}
          detalhe="Sem historico forte"
          icon={<UserRoundPlus className="h-5 w-5" />}
          tone="blue"
        />
        <CardResumo
          label="Inativos"
          valor={numero(dados.resumo.clientesInativos)}
          detalhe="Sem compra recente"
          icon={<UserRoundCheck className="h-5 w-5" />}
          tone="amber"
        />
        <CardResumo
          label="Oportunidades"
          valor={numero(dados.resumo.clientesComOportunidade)}
          detalhe="Ate 10 priorizadas"
          icon={<Sparkles className="h-5 w-5" />}
          tone="blue"
        />
        <CardResumo
          label="Atencao operacional"
          valor={numero(dados.resumo.clientesComAtencaoOperacional)}
          detalhe="Pedido/pagamento"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Segmentos acionaveis
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Grupos calculados em memoria com dados ja existentes.
            </p>
          </div>
          <Badge className="border-slate-200 bg-slate-50 text-slate-600">
            Sem automacao
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dados.segmentos.map((segmento) => (
            <SegmentoCard key={segmento.id} segmento={segmento} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Lista de oportunidades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Priorizacao manual para atendimento cuidadoso.
            </p>
          </div>
          <BellRing className="h-5 w-5 text-slate-400" />
        </div>

        {semDados ? (
          <div className="px-6 py-12 text-center">
            <Info className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-950">
              CRM pronto para receber dados
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              O CRM ficara mais util apos pedidos, vendas internas e eventos
              reais da loja publica.
            </p>
          </div>
        ) : dados.oportunidades.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Info className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-950">
              Nenhuma oportunidade urgente encontrada
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Continue acompanhando clientes recorrentes, compras recentes e
              sinais de intencao conforme o historico crescer.
            </p>
          </div>
        ) : (
          <div>
            {dados.oportunidades.map((oportunidade, index) => (
              <OportunidadeItem
                key={oportunidade.id}
                oportunidade={oportunidade}
                indice={index}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">
              Ficha rapida
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Clientes recentes por compra ou interacao vinculada.
          </p>

          {dados.fichasRapidas.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Sem fichas rapidas nesta versao. Elas aparecem quando houver
              compras ou eventos vinculados a clientes.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-100 rounded-3xl border border-slate-200">
              {dados.fichasRapidas.map((cliente) => (
                <div
                  key={cliente.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_160px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {cliente.nome}
                      </h3>
                      <Badge
                        className={
                          cliente.contato === "COMPLETO"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                      >
                        {cliente.contato === "COMPLETO"
                          ? "contato completo"
                          : "contato incompleto"}
                      </Badge>
                      <Badge className={consentimentoClass(cliente.consentimento)}>
                        {consentimentoLabel(cliente.consentimento)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {cliente.codigo} - {cliente.status}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {cliente.sinalPrincipal}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {numero(cliente.quantidadeCompras)} compra
                      {cliente.quantidadeCompras === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {moeda(cliente.totalComprado)} - ticket{" "}
                      {moeda(cliente.ticketMedio)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ultima compra: {dataCurta(cliente.ultimaCompraEm)}
                    </p>
                    <Link
                      href={cliente.href}
                      className="mt-3 inline-flex items-center justify-end gap-1 text-xs font-semibold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                    >
                      Abrir ficha
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">
              Dados usados
            </h2>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            {dadosDisponiveis.map(({ label, disponivel }) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
              >
                <span className="text-slate-600">{label}</span>
                <span
                  className={`text-xs font-semibold ${
                    disponivel ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  {disponivel ? "disponivel" : "indisponivel"}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
