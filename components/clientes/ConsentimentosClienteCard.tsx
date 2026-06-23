"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Ban, CheckCircle2, ShieldCheck } from "lucide-react";

type FinalidadeConsentimentoCliente =
  | "RELACIONAMENTO"
  | "MARKETING"
  | "POS_VENDA"
  | "ATENDIMENTO";
type CanalConsentimentoCliente =
  | "WHATSAPP"
  | "EMAIL"
  | "SMS"
  | "TELEFONE"
  | "INSTAGRAM";
type EstadoResumoConsentimentoCliente =
  | "AUTORIZADO"
  | "REVOGADO"
  | "NAO_REGISTRADO";

type ConsentimentoClienteResumoCanal = {
  canal: CanalConsentimentoCliente;
  finalidade: FinalidadeConsentimentoCliente;
  status: EstadoResumoConsentimentoCliente;
  podeContatoManual: boolean;
  ultimaAtualizacaoEm: string | null;
  origem: string | null;
  registradoPorAdminNome: string | null;
  observacao: string | null;
};

type ConsentimentoClienteResumo = {
  statusGeral: EstadoResumoConsentimentoCliente;
  label: string;
  detalhe: string;
  canaisAutorizados: ConsentimentoClienteResumoCanal[];
  canaisRevogados: ConsentimentoClienteResumoCanal[];
  canaisSemRegistro: ConsentimentoClienteResumoCanal[];
  ultimaAtualizacaoEm: string | null;
  origem: string | null;
  historico: {
    id: string;
    finalidade: FinalidadeConsentimentoCliente;
    canal: CanalConsentimentoCliente;
    status: "AUTORIZADO" | "REVOGADO";
    registradoPorAdminNome: string | null;
    criadoEm: string;
  }[];
};

type ConsentimentosClienteCardProps = {
  clienteId: string;
  resumoInicial: ConsentimentoClienteResumo;
  podeEditar: boolean;
};

const FINALIDADES: {
  value: FinalidadeConsentimentoCliente;
  label: string;
}[] = [
  { value: "RELACIONAMENTO", label: "Relacionamento" },
  { value: "MARKETING", label: "Marketing" },
  { value: "POS_VENDA", label: "Pos-venda" },
  { value: "ATENDIMENTO", label: "Atendimento" },
];

const CANAIS: { value: CanalConsentimentoCliente; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SMS", label: "SMS" },
  { value: "TELEFONE", label: "Telefone" },
  { value: "INSTAGRAM", label: "Instagram" },
];

function dataCurta(dataIso: string | null) {
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

function labelCanal(canal: string) {
  return CANAIS.find((item) => item.value === canal)?.label || canal;
}

function labelFinalidade(finalidade: string) {
  return (
    FINALIDADES.find((item) => item.value === finalidade)?.label || finalidade
  );
}

function statusClass(status: ConsentimentoClienteResumo["statusGeral"]) {
  if (status === "AUTORIZADO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REVOGADO") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function ConsentimentoLinha({
  item,
  podeEditar,
  onRevogar,
  disabled,
}: {
  item: ConsentimentoClienteResumoCanal;
  podeEditar: boolean;
  onRevogar: (item: ConsentimentoClienteResumoCanal) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {labelCanal(item.canal)} - {labelFinalidade(item.finalidade)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Atualizado em {dataCurta(item.ultimaAtualizacaoEm)}
            {item.registradoPorAdminNome
              ? ` por ${item.registradoPorAdminNome}`
              : ""}
          </p>
        </div>

        {podeEditar && item.status === "AUTORIZADO" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRevogar(item)}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ban className="h-3.5 w-3.5" />
            Revogar
          </button>
        ) : null}
      </div>

      {item.observacao ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {item.observacao}
        </p>
      ) : null}
    </div>
  );
}

export default function ConsentimentosClienteCard({
  clienteId,
  resumoInicial,
  podeEditar,
}: ConsentimentosClienteCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resumo, setResumo] = useState(resumoInicial);
  const [finalidade, setFinalidade] =
    useState<FinalidadeConsentimentoCliente>("RELACIONAMENTO");
  const [canal, setCanal] = useState<CanalConsentimentoCliente>("WHATSAPP");
  const [observacao, setObservacao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvarConsentimento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);

    startTransition(async () => {
      const response = await fetch(`/api/clientes/${clienteId}/consentimentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalidade,
          canal,
          status: "AUTORIZADO",
          observacao,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao registrar consentimento.");
        return;
      }

      setResumo(data.resumo);
      setObservacao("");
      setMensagem("Consentimento registrado.");
      router.refresh();
    });
  }

  async function revogar(item: ConsentimentoClienteResumoCanal) {
    const observacaoRevogacao = window.prompt(
      `Motivo da revogacao para ${labelCanal(item.canal)} - ${labelFinalidade(item.finalidade)}`
    );

    if (observacaoRevogacao === null) return;

    setErro(null);
    setMensagem(null);

    startTransition(async () => {
      const response = await fetch(`/api/clientes/${clienteId}/consentimentos`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalidade: item.finalidade,
          canal: item.canal,
          observacao: observacaoRevogacao,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || "Erro ao revogar consentimento.");
        return;
      }

      setResumo(data.resumo);
      setMensagem("Consentimento revogado.");
      router.refresh();
    });
  }

  const autorizados = resumo.canaisAutorizados.slice(0, 5);
  const revogados = resumo.canaisRevogados.slice(0, 5);
  const historico = resumo.historico.slice(0, 5);

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Consentimento e relacionamento
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Use apenas para contato manual responsavel.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {resumo.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {resumo.detalhe}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                resumo.statusGeral
              )}`}
            >
              {resumo.statusGeral === "AUTORIZADO"
                ? "autorizado"
                : resumo.statusGeral === "REVOGADO"
                  ? "revogado"
                  : "sem registro"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Ultima atualizacao: {dataCurta(resumo.ultimaAtualizacaoEm)}
            {resumo.origem ? ` - Origem: ${resumo.origem}` : ""}
          </p>
        </div>

        {autorizados.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Canais autorizados
            </p>
            <div className="space-y-2">
              {autorizados.map((item) => (
                <ConsentimentoLinha
                  key={`${item.finalidade}-${item.canal}-autorizado`}
                  item={item}
                  podeEditar={podeEditar}
                  onRevogar={revogar}
                  disabled={isPending}
                />
              ))}
            </div>
          </div>
        ) : null}

        {revogados.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
              <Ban className="h-4 w-4" />
              Revogados
            </p>
            <div className="space-y-2">
              {revogados.map((item) => (
                <ConsentimentoLinha
                  key={`${item.finalidade}-${item.canal}-revogado`}
                  item={item}
                  podeEditar={false}
                  onRevogar={revogar}
                  disabled={isPending}
                />
              ))}
            </div>
          </div>
        ) : null}

        {resumo.statusGeral === "NAO_REGISTRADO" ? (
          <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 px-4 py-5 text-sm leading-6 text-amber-800">
            Nenhum consentimento registrado. Nao use oportunidade comercial como
            autorizacao de contato.
          </div>
        ) : null}

        {podeEditar ? (
          <form
            onSubmit={salvarConsentimento}
            className="space-y-3 rounded-3xl border border-slate-200 p-4"
          >
            <p className="text-sm font-semibold text-slate-950">
              Registrar autorizacao manual
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Finalidade</span>
                <select
                  value={finalidade}
                  onChange={(event) =>
                    setFinalidade(
                      event.target.value as FinalidadeConsentimentoCliente
                    )
                  }
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  {FINALIDADES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Canal</span>
                <select
                  value={canal}
                  onChange={(event) =>
                    setCanal(event.target.value as CanalConsentimentoCliente)
                  }
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  {CANAIS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Observacao</span>
              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ex: Cliente autorizou contato durante atendimento presencial."
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Registrar consentimento
            </button>
          </form>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            Seu perfil pode consultar consentimento, mas nao registrar ou
            revogar.
          </p>
        )}

        {mensagem ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {mensagem}
          </p>
        ) : null}

        {erro ? (
          <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        ) : null}

        {historico.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-950">
              Historico recente
            </p>
            <div className="space-y-2">
              {historico.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"
                >
                  <span className="font-semibold text-slate-800">
                    {item.status === "AUTORIZADO" ? "Autorizado" : "Revogado"}
                  </span>{" "}
                  {labelCanal(item.canal)} - {labelFinalidade(item.finalidade)}
                  <br />
                  {dataCurta(item.criadoEm)}
                  {item.registradoPorAdminNome
                    ? ` por ${item.registradoPorAdminNome}`
                    : ""}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
