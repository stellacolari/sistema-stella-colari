"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Copy,
  Filter,
  RefreshCcw,
  ShieldCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import type {
  DestinatarioRascunhoWhatsapp,
  FinalidadeRascunhoWhatsapp,
  PresetRascunhoWhatsapp,
  RascunhoWhatsappClientes,
  SegmentoRascunhoWhatsapp,
} from "@/lib/clientes/crm-whatsapp-rascunho";

type Props = {
  dados: RascunhoWhatsappClientes;
};

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor || 0);
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime())
    ? "-"
    : new Intl.DateTimeFormat("pt-BR").format(data);
}

function dataMensagem(value: string | null) {
  const formatada = dataCurta(value);
  return formatada === "-" ? "sua ultima compra" : formatada;
}

function statusLabel(status: string) {
  if (status === "AUTORIZADO") return "Autorizado";
  if (status === "REVOGADO") return "Revogado";
  return "Sem consentimento";
}

function statusClasses(status: string) {
  if (status === "AUTORIZADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REVOGADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function personalizarMensagem(
  mensagem: string,
  destinatario: DestinatarioRascunhoWhatsapp | null
) {
  if (!destinatario) return mensagem;

  return mensagem
    .replaceAll("{{primeiro_nome}}", destinatario.primeiroNome)
    .replaceAll("{{nome}}", destinatario.nome)
    .replaceAll("{{ultima_compra}}", dataMensagem(destinatario.ultimaCompraEm))
    .replaceAll("{{ticket_medio}}", moeda(destinatario.ticketMedio));
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
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

function ContadorCard({
  label,
  valor,
  detalhe,
  tone = "slate",
}: {
  label: string;
  valor: number;
  detalhe: string;
  tone?: "slate" | "emerald" | "amber" | "red" | "blue";
}) {
  const tones = {
    slate: "bg-white ring-slate-200 text-slate-950",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-950",
    amber: "bg-amber-50 ring-amber-200 text-amber-950",
    red: "bg-red-50 ring-red-200 text-red-950",
    blue: "bg-blue-50 ring-blue-200 text-blue-950",
  };

  return (
    <div className={`rounded-3xl p-4 shadow-sm ring-1 ${tones[tone]}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{numero(valor)}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detalhe}</p>
    </div>
  );
}

export default function CrmWhatsappRascunhoClient({ dados }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [segmento, setSegmento] = useState<SegmentoRascunhoWhatsapp>(
    dados.parametros.segmento
  );
  const [finalidade, setFinalidade] = useState<FinalidadeRascunhoWhatsapp>(
    dados.parametros.finalidade
  );
  const [preset, setPreset] = useState<PresetRascunhoWhatsapp>(
    dados.parametros.preset
  );
  const [ticketMinimo, setTicketMinimo] = useState(
    String(dados.parametros.ticketMinimo)
  );
  const [mensagem, setMensagem] = useState(dados.parametros.mensagem);
  const [copiado, setCopiado] = useState(false);

  const destinatarioReferencia = useMemo(
    () =>
      dados.destinatarios.find((item) => item.elegivel) ||
      dados.destinatarios[0] ||
      null,
    [dados.destinatarios]
  );
  const preview = useMemo(
    () => personalizarMensagem(mensagem, destinatarioReferencia),
    [destinatarioReferencia, mensagem]
  );

  function atualizarUrl() {
    const params = new URLSearchParams();
    params.set("segmento", segmento);
    params.set("finalidade", finalidade);
    params.set("preset", preset);
    params.set("ticketMinimo", ticketMinimo || "0");
    params.set("mensagem", mensagem);

    startTransition(() => {
      router.push(`/clientes/relacionamento/campanhas?${params.toString()}`);
    });
  }

  function limparFiltros() {
    const presetPadrao = dados.presets.find((item) => item.value === "RECORRENTES");

    setSegmento("TODOS");
    setFinalidade("RELACIONAMENTO");
    setPreset("RECORRENTES");
    setTicketMinimo("300");
    setMensagem(presetPadrao?.mensagem || "");

    startTransition(() => {
      router.push("/clientes/relacionamento/campanhas");
    });
  }

  function trocarPreset(value: PresetRascunhoWhatsapp) {
    const item = dados.presets.find((presetItem) => presetItem.value === value);
    if (!item || item.disabled) return;

    setPreset(value);
    setFinalidade(item.finalidade);
    setMensagem(item.mensagem);
  }

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              CRM WhatsApp
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Rascunho de campanha
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Segmentacao, previa e elegibilidade para contato manual com
              consentimento persistido.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/clientes/relacionamento"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              CRM acionavel
            </Link>
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clientes
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-sm font-semibold text-blue-950">
              Rascunho interno. Nenhuma mensagem sera enviada.
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              Esta tela nao chama WhatsApp, API externa, automacao, agenda ou
              publicacao de campanha. Clientes sem telefone valido, sem
              consentimento ou com revogacao ficam bloqueados na elegibilidade
              final.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <ContadorCard
          label="Encontrados"
          valor={dados.contadores.totalEncontrados}
          detalhe="Depois do segmento"
        />
        <ContadorCard
          label="Com telefone"
          valor={dados.contadores.comTelefone}
          detalhe="Campo preenchido"
          tone="blue"
        />
        <ContadorCard
          label="Telefone invalido"
          valor={dados.contadores.telefoneInvalido}
          detalhe="Bloqueia WhatsApp"
          tone="amber"
        />
        <ContadorCard
          label="Autorizados"
          valor={dados.contadores.whatsappAutorizado}
          detalhe="Finalidade escolhida"
          tone="emerald"
        />
        <ContadorCard
          label="Sem consent."
          valor={dados.contadores.semConsentimento}
          detalhe="Ausencia bloqueia"
          tone="amber"
        />
        <ContadorCard
          label="Revogados"
          valor={dados.contadores.consentimentoRevogado}
          detalhe="Revogacao bloqueia"
          tone="red"
        />
        <ContadorCard
          label="Elegiveis"
          valor={dados.contadores.elegiveisFinais}
          detalhe="Telefone + consent."
          tone="emerald"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            atualizarUrl();
          }}
          className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-950">
              Filtros do rascunho
            </h2>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Segmento
            </span>
            <select
              value={segmento}
              onChange={(event) =>
                setSegmento(event.target.value as SegmentoRascunhoWhatsapp)
              }
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            >
              {dados.opcoesSegmento.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {
                dados.opcoesSegmento.find((item) => item.value === segmento)
                  ?.descricao
              }
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Finalidade
            </span>
            <select
              value={finalidade}
              onChange={(event) =>
                setFinalidade(event.target.value as FinalidadeRascunhoWhatsapp)
              }
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            >
              <option value="RELACIONAMENTO">Relacionamento</option>
              <option value="MARKETING">Marketing</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Ticket minimo
            </span>
            <input
              type="number"
              min="0"
              step="10"
              value={ticketMinimo}
              onChange={(event) => setTicketMinimo(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Preset interno
            </span>
            <select
              value={preset}
              onChange={(event) =>
                trocarPreset(event.target.value as PresetRascunhoWhatsapp)
              }
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            >
              {dados.presets.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                >
                  {item.label}
                  {item.disabled ? " (futuro)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              {dados.presets.find((item) => item.value === preset)?.descricao}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Mensagem editavel
            </span>
            <textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              rows={7}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-500"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <RefreshCcw className="h-4 w-4" />
              {isPending ? "Atualizando" : "Atualizar previa"}
            </button>
            <button
              type="button"
              onClick={() => void copiarMensagem()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              {copiado ? "Copiada" : "Copiar mensagem"}
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    Preview personalizado
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Variaveis disponiveis: primeiro nome, nome, ultima compra e
                  ticket medio.
                </p>
              </div>
              {destinatarioReferencia ? (
                <Badge
                  className={
                    destinatarioReferencia.elegivel
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }
                >
                  {destinatarioReferencia.elegivel
                    ? "amostra elegivel"
                    : "amostra bloqueada"}
                </Badge>
              ) : null}
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-800">
              {preview || "Sem mensagem definida."}
            </div>
          </section>

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-950">
                    Destinatarios elegiveis e bloqueados
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Amostra de ate {numero(dados.destinatarios.length)} de{" "}
                  {numero(dados.totalDestinatarios)} cliente
                  {dados.totalDestinatarios === 1 ? "" : "s"} encontrado
                  {dados.totalDestinatarios === 1 ? "" : "s"}.
                </p>
              </div>
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                Sem automacao
              </Badge>
            </div>

            {dados.destinatarios.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <UserX className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 text-base font-semibold text-slate-950">
                  Nenhum cliente no filtro atual
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Ajuste o segmento ou a finalidade para revisar outra amostra.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dados.destinatarios.map((destinatario) => (
                  <article
                    key={destinatario.id}
                    className="grid gap-4 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_320px]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {destinatario.nome}
                        </h3>
                        <Badge className={statusClasses(destinatario.consentimentoStatus)}>
                          {statusLabel(destinatario.consentimentoStatus)}
                        </Badge>
                        <Badge
                          className={
                            destinatario.elegivel
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }
                        >
                          {destinatario.elegivel ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Elegivel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              Bloqueado
                            </span>
                          )}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {destinatario.codigo} - {destinatario.telefoneMascarado}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {destinatario.motivoExclusao ||
                          destinatario.motivoElegibilidade}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{numero(destinatario.quantidadeCompras)} compra(s)</span>
                        <span>Ticket {moeda(destinatario.ticketMedio)}</span>
                        <span>Ultima compra {dataCurta(destinatario.ultimaCompraEm)}</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {personalizarMensagem(mensagem, destinatario)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {dados.dados.dataNascimento ? null : (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Aniversario permanece desabilitado.
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                O cadastro de clientes nao possui data de nascimento neste
                modelo, entao nenhum segmento ou mensagem de aniversario foi
                liberado.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
