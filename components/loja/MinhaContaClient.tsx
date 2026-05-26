"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentProps } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  History,
  Package,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import MenuPublicoLoja from "@/components/loja/MenuPublicoLoja";
import SairClienteButton from "@/components/loja/SairClienteButton";

type MenuPublicoLojaProps = ComponentProps<typeof MenuPublicoLoja>;

type AbaConta = "PEDIDOS" | "CASHBACK" | "DADOS";

export type MinhaContaClienteData = {
  id: string;
  codigo: string;
  nome: string;
  telefone: string;
  email: string | null;
  documento: string;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  tipoCliente: string;
  cashbackSaldo: number;
  criadoEm: string;
  pedidos: {
    id: string;
    codigo: string;
    status: string;
    statusPagamento: string;
    total: number;
    valorPago: number;
    cupomCodigo: string | null;
    cupomDescontoValor: number;
    cashbackBaseValor: number;
    cashbackPrevistoValor: number;
    cashbackCreditadoValor: number;
    cashbackUsadoValor: number;
    cashbackStatus: string;
    criadoEm: string;
    quantidadeItens: number;
    envio: {
      statusEnvio: string;
      codigoRastreio: string | null;
      transportadora: string | null;
      postadoEm: string | null;
      entregueEm: string | null;
    } | null;
  }[];
  cashbackMovimentacoes: {
    id: string;
    tipo: string;
    status: string;
    origemTipo: string;
    origemId: string;
    valor: number;
    observacao: string | null;
    criadoEm: string;
  }[];
};

type MinhaContaClientProps = {
  menus: MenuPublicoLojaProps["menus"];
  categoriasMenu: MenuPublicoLojaProps["categorias"];
  cliente: MinhaContaClienteData;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function dataCurta(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getNomeCliente(cliente: MinhaContaClienteData | null | undefined) {
  return String(cliente?.nome || "Cliente").trim() || "Cliente";
}

function getPrimeiroNomeCliente(cliente: MinhaContaClienteData | null | undefined) {
  return getNomeCliente(cliente).split(" ")[0] || "Cliente";
}

function labelStatusPedido(status: string) {
  if (status === "PEDIDO_RECEBIDO") return "Pedido recebido";
  if (status === "PEDIDO_SEPARADO") return "Em separação";
  if (status === "PEDIDO_ENVIADO") return "Enviado";
  if (status === "PEDIDO_ENTREGUE") return "Entregue";
  if (status === "CANCELADO") return "Cancelado";
  if (status === "PROBLEMA") return "Em análise";

  return status.replaceAll("_", " ");
}

function labelPagamento(status: string) {
  if (status === "AGUARDANDO_PAGAMENTO") return "Aguardando pagamento";
  if (status === "PAGO") return "Pagamento confirmado";
  if (status === "RECUSADO") return "Pagamento recusado";
  if (status === "ESTORNADO") return "Pagamento estornado";
  if (status === "CANCELADO") return "Pagamento cancelado";

  return status.replaceAll("_", " ");
}

function labelEnvio(status: string | null | undefined) {
  if (!status) return "Envio pendente";
  if (status === "PENDENTE") return "Envio pendente";
  if (status === "EM_PREPARACAO") return "Em preparação";
  if (status === "POSTADO") return "Postado";
  if (status === "ENTREGUE") return "Entregue";
  if (status === "PROBLEMA") return "Problema no envio";

  return status.replaceAll("_", " ");
}

function pedidoClass(status: string) {
  if (status === "PEDIDO_RECEBIDO") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "PEDIDO_SEPARADO" || status === "PEDIDO_ENVIADO") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  }

  if (status === "PEDIDO_ENTREGUE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "CANCELADO" || status === "PROBLEMA") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function pagamentoClass(status: string) {
  if (status === "PAGO") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "AGUARDANDO_PAGAMENTO") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "RECUSADO" || status === "CANCELADO") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "ESTORNADO") {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function labelCashbackTipo(tipo: string) {
  if (tipo === "CREDITO") return "Crédito";
  if (tipo === "USO") return "Uso";
  if (tipo === "ESTORNO") return "Estorno";

  return tipo.replaceAll("_", " ");
}

function cashbackTipoClass(tipo: string) {
  if (tipo === "CREDITO") {
    return "text-emerald-700";
  }

  if (tipo === "USO" || tipo === "ESTORNO") {
    return "text-red-700";
  }

  return "text-slate-700";
}

function AbaButton({
  ativa,
  children,
  onClick,
}: {
  ativa: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-2xl border px-5 text-sm font-medium transition ${
        ativa
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-950 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>

      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-blue)] disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

export default function MinhaContaClient({
  menus,
  categoriasMenu,
  cliente,
}: MinhaContaClientProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaConta>("PEDIDOS");
  const [editandoDados, setEditandoDados] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroDados, setErroDados] = useState("");
  const [sucessoDados, setSucessoDados] = useState("");

  const [formDados, setFormDados] = useState({
    nome: getNomeCliente(cliente),
    telefone: cliente.telefone || "",
    email: cliente.email || "",
    documento: cliente.documento || "",
    cep: cliente.cep || "",
    rua: cliente.rua || "",
    numero: cliente.numero || "",
    complemento: cliente.complemento || "",
    bairro: cliente.bairro || "",
    cidade: cliente.cidade || "",
    estado: cliente.estado || "",
  });

  const totalPedidos = cliente.pedidos.length;

  const pedidosAbertos = useMemo(() => {
    return cliente.pedidos.filter(
      (pedido) =>
        pedido.status !== "PEDIDO_ENTREGUE" &&
        pedido.status !== "CANCELADO" &&
        pedido.status !== "PROBLEMA"
    ).length;
  }, [cliente.pedidos]);

  const valorTotalComprado = useMemo(() => {
    return cliente.pedidos.reduce(
      (total, pedido) => total + Number(pedido.total || 0),
      0
    );
  }, [cliente.pedidos]);

  function atualizarDados(campo: keyof typeof formDados, valor: string) {
    setErroDados("");
    setSucessoDados("");

    setFormDados((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function buscarCep() {
    const cep = formDados.cep.replace(/\D/g, "");

    setErroDados("");
    setSucessoDados("");

    if (!cep) {
      setErroDados("Informe o CEP.");
      return;
    }

    if (cep.length !== 8) {
      setErroDados("O CEP deve ter 8 dígitos.");
      return;
    }

    setBuscandoCep(true);

    try {
      const response = await fetch(`/api/loja/cep?cep=${cep}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroDados(data.error || "CEP não encontrado.");
        return;
      }

      setFormDados((atual) => ({
        ...atual,
        cep: data.endereco.cep || cep,
        rua: data.endereco.rua || atual.rua,
        bairro: data.endereco.bairro || atual.bairro,
        cidade: data.endereco.cidade || atual.cidade,
        estado: data.endereco.estado || atual.estado,
      }));

      setSucessoDados("Endereço preenchido pelo CEP.");
    } catch {
      setErroDados("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvarDados() {
    setErroDados("");
    setSucessoDados("");
    setSalvandoDados(true);

    try {
      const response = await fetch("/api/loja/minha-conta/dados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDados),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErroDados(data.error || "Erro ao salvar dados.");
        return;
      }

      setSucessoDados("Dados atualizados com sucesso.");
      setEditandoDados(false);
    } catch {
      setErroDados("Erro ao salvar dados.");
    } finally {
      setSalvandoDados(false);
    }
  }

  function cancelarEdicaoDados() {
    setErroDados("");
    setSucessoDados("");

    setFormDados({
      nome: getNomeCliente(cliente),
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      documento: cliente.documento || "",
      cep: cliente.cep || "",
      rua: cliente.rua || "",
      numero: cliente.numero || "",
      complemento: cliente.complemento || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
    });

    setEditandoDados(false);
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MenuPublicoLoja
        menus={menus}
        categorias={categoriasMenu}
        mostrarBusca
        mostrarPerfil
        mostrarCarrinho
      />

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] brand-text">
                Minha conta
              </p>

              <h1 className="mt-3 text-3xl font-light tracking-tight text-slate-950 md:text-5xl">
                Olá, {getPrimeiroNomeCliente(cliente)}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-light leading-6 text-slate-500">
                Acompanhe suas compras e gerencie seus dados da conta Stella.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
              <div className="inline-flex h-11 items-center gap-3 rounded-2xl border border-[var(--brand-blue)] bg-[var(--brand-blue-soft)] px-4">
                <Wallet className="h-4 w-4 shrink-0 text-[var(--brand-blue)]" />

                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-blue)]">
                    Cashback
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {moeda(cliente.cashbackSaldo)}
                  </p>
                </div>
              </div>

              <SairClienteButton />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pedidos
                </p>
              </div>

              <p className="mt-2 text-2xl font-light text-slate-950">
                {totalPedidos}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Em andamento
                </p>
              </div>

              <p className="mt-2 text-2xl font-light text-slate-950">
                {pedidosAbertos}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-slate-400" />

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total comprado
                </p>
              </div>

              <p className="mt-2 text-2xl font-light text-slate-950">
                {moeda(valorTotalComprado)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap gap-2">
            <AbaButton
              ativa={abaAtiva === "PEDIDOS"}
              onClick={() => setAbaAtiva("PEDIDOS")}
            >
              Pedidos
            </AbaButton>

            <AbaButton
              ativa={abaAtiva === "CASHBACK"}
              onClick={() => setAbaAtiva("CASHBACK")}
            >
              Cashback
            </AbaButton>

            <AbaButton
              ativa={abaAtiva === "DADOS"}
              onClick={() => setAbaAtiva("DADOS")}
            >
              Dados
            </AbaButton>
          </div>

          <div className="mt-4 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {abaAtiva === "PEDIDOS" && (
              <div>
                <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-slate-500" />

                      <h2 className="text-lg font-medium text-slate-950">
                        Meus pedidos
                      </h2>
                    </div>

                    <p className="mt-1 text-sm font-light text-slate-500">
                      Acompanhe suas compras recentes.
                    </p>
                  </div>

                  <Link
                    href="/loja"
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                  >
                    Continuar comprando
                  </Link>
                </div>

                {cliente.pedidos.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Você ainda não tem pedidos.
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Quando finalizar uma compra, ela aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cliente.pedidos.map((pedido) => {
                      const possuiCupom =
                        Boolean(pedido.cupomCodigo) &&
                        Number(pedido.cupomDescontoValor || 0) > 0;

                      const possuiCashbackUsado =
                        Number(pedido.cashbackUsadoValor || 0) > 0;

                      const possuiCashbackPrevisto =
                        Number(pedido.cashbackPrevistoValor || 0) > 0;

                      const possuiCashbackCreditado =
                        Number(pedido.cashbackCreditadoValor || 0) > 0;

                      return (
                        <details
                          key={pedido.id}
                          id={`pedido-${pedido.id}`}
                          className="group"
                        >
                          <summary className="grid cursor-pointer list-none gap-4 px-5 py-4 transition hover:bg-slate-50 marker:hidden lg:grid-cols-[1fr_auto] [&::-webkit-details-marker]:hidden">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-slate-950">
                                  {pedido.codigo}
                                </p>

                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${pedidoClass(
                                    pedido.status
                                  )}`}
                                >
                                  {labelStatusPedido(pedido.status)}
                                </span>

                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${pagamentoClass(
                                    pedido.statusPagamento
                                  )}`}
                                >
                                  {labelPagamento(pedido.statusPagamento)}
                                </span>
                              </div>

                              <p className="mt-2 text-xs text-slate-500">
                                {dataCurta(pedido.criadoEm)} ·{" "}
                                {pedido.quantidadeItens} un. ·{" "}
                                {labelEnvio(pedido.envio?.statusEnvio)}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1 lg:items-end lg:text-right">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total
                              </p>

                              <p className="text-lg font-bold text-slate-950">
                                {moeda(pedido.total)}
                              </p>

                              <p className="text-xs text-slate-400 group-open:hidden">
                                Ver detalhes
                              </p>

                              <p className="hidden text-xs text-slate-400 group-open:block">
                                Ocultar detalhes
                              </p>
                            </div>
                          </summary>

                          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-slate-400" />

                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Pagamento
                                  </p>
                                </div>

                                <p className="mt-2 text-sm font-medium text-slate-950">
                                  {labelPagamento(pedido.statusPagamento)}
                                </p>

                                {pedido.valorPago > 0 && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Pago: {moeda(pedido.valorPago)}
                                  </p>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-slate-400" />

                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Envio
                                  </p>
                                </div>

                                <p className="mt-2 text-sm font-medium text-slate-950">
                                  {labelEnvio(pedido.envio?.statusEnvio)}
                                </p>

                                {pedido.envio?.codigoRastreio && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Rastreio:{" "}
                                    <strong className="text-slate-800">
                                      {pedido.envio.codigoRastreio}
                                    </strong>
                                  </p>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-slate-400" />

                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Benefícios
                                  </p>
                                </div>

                                <div className="mt-2 space-y-1 text-xs text-slate-500">
                                  {possuiCupom && (
                                    <p>
                                      Cupom:{" "}
                                      <strong className="text-emerald-700">
                                        -{moeda(pedido.cupomDescontoValor)}
                                      </strong>
                                    </p>
                                  )}

                                  {possuiCashbackUsado && (
                                    <p>
                                      Cashback usado:{" "}
                                      <strong className="text-blue-700">
                                        -{moeda(pedido.cashbackUsadoValor)}
                                      </strong>
                                    </p>
                                  )}

                                  {possuiCashbackCreditado && (
                                    <p>
                                      Cashback recebido:{" "}
                                      <strong className="text-emerald-700">
                                        {moeda(pedido.cashbackCreditadoValor)}
                                      </strong>
                                    </p>
                                  )}

                                  {possuiCashbackPrevisto &&
                                    !possuiCashbackCreditado && (
                                      <p>
                                        A receber após confirmação:{" "}
                                        <strong className="text-indigo-700">
                                          {moeda(pedido.cashbackPrevistoValor)}
                                        </strong>
                                      </p>
                                    )}

                                  {!possuiCupom &&
                                    !possuiCashbackUsado &&
                                    !possuiCashbackCreditado &&
                                    !possuiCashbackPrevisto && (
                                      <p>Nenhum benefício aplicado.</p>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {abaAtiva === "CASHBACK" && (
              <div className="grid gap-0 lg:grid-cols-[390px_1fr]">
                <div className="brand-bg-soft border-b border-[var(--brand-blue)] p-6 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[var(--brand-blue)]" />

                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-blue)]">
                      Saldo disponível
                    </p>
                  </div>

                  <p className="mt-5 text-4xl font-light tracking-tight text-slate-950">
                    {moeda(cliente.cashbackSaldo)}
                  </p>

                  <p className="mt-4 text-sm font-light leading-6 text-slate-600">
                    Esse valor pode ser usado como desconto no checkout das
                    próximas compras.
                  </p>

                  <Link
                    href="/loja"
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 brand-button px-5 text-sm font-medium"
                  >
                    Usar cashback
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-500" />

                    <h2 className="text-lg font-medium text-slate-950">
                      Histórico de cashback
                    </h2>
                  </div>

                  {cliente.cashbackMovimentacoes.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                      Nenhuma movimentação de cashback.
                    </div>
                  ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                      {cliente.cashbackMovimentacoes.map((movimentacao) => (
                        <div
                          key={movimentacao.id}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {labelCashbackTipo(movimentacao.tipo)}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {dataCurta(movimentacao.criadoEm)}
                              </p>

                              {movimentacao.observacao && (
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {movimentacao.observacao}
                                </p>
                              )}
                            </div>

                            <p
                              className={`shrink-0 text-sm font-semibold ${cashbackTipoClass(
                                movimentacao.tipo
                              )}`}
                            >
                              {movimentacao.valor > 0 ? "+" : ""}
                              {moeda(movimentacao.valor)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {abaAtiva === "DADOS" && (
              <div>
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-slate-500" />

                    <div>
                      <h2 className="text-lg font-medium text-slate-950">
                        Dados da conta
                      </h2>

                      <p className="mt-1 text-sm font-light text-slate-500">
                        Atualize suas informações de contato e endereço.
                      </p>
                    </div>
                  </div>

                  {!editandoDados ? (
                    <button
                      type="button"
                      onClick={() => {
                        setErroDados("");
                        setSucessoDados("");
                        setEditandoDados(true);
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                    >
                      Editar dados
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={cancelarEdicaoDados}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                    >
                      <X className="h-4 w-4" />
                      Cancelar
                    </button>
                  )}
                </div>

                {(erroDados || sucessoDados) && (
                  <div className="border-b border-slate-200 px-5 py-4">
                    {erroDados && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {erroDados}
                      </div>
                    )}

                    {sucessoDados && (
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {sucessoDados}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  <CampoTexto
                    label="Nome"
                    value={formDados.nome}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("nome", value)}
                  />

                  <CampoTexto
                    label="Código"
                    value={cliente.codigo}
                    disabled
                    onChange={() => undefined}
                  />

                  <CampoTexto
                    label="E-mail"
                    value={formDados.email}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("email", value)}
                  />

                  <CampoTexto
                    label="Telefone"
                    value={formDados.telefone}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("telefone", value)}
                  />

                  <CampoTexto
                    label="CPF"
                    value={formDados.documento}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("documento", value)}
                  />

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <CampoTexto
                      label="CEP"
                      value={formDados.cep}
                      disabled={!editandoDados}
                      placeholder="00000-000"
                      onChange={(value) => atualizarDados("cep", value)}
                    />

                    <button
                      type="button"
                      onClick={buscarCep}
                      disabled={!editandoDados || buscandoCep}
                      className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Search className="h-4 w-4" />
                      {buscandoCep ? "Buscando" : "Buscar"}
                    </button>
                  </div>

                  <CampoTexto
                    label="Rua"
                    value={formDados.rua}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("rua", value)}
                  />

                  <CampoTexto
                    label="Número"
                    value={formDados.numero}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("numero", value)}
                  />

                  <CampoTexto
                    label="Complemento"
                    value={formDados.complemento}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("complemento", value)}
                  />

                  <CampoTexto
                    label="Bairro"
                    value={formDados.bairro}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("bairro", value)}
                  />

                  <CampoTexto
                    label="Cidade"
                    value={formDados.cidade}
                    disabled={!editandoDados}
                    onChange={(value) => atualizarDados("cidade", value)}
                  />

                  <CampoTexto
                    label="Estado"
                    value={formDados.estado}
                    disabled={!editandoDados}
                    onChange={(value) =>
                      atualizarDados("estado", value.toUpperCase())
                    }
                  />
                </div>

                {editandoDados && (
                  <div className="flex justify-end border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      onClick={salvarDados}
                      disabled={salvandoDados}
                      className="inline-flex h-11 items-center justify-center gap-2 brand-button px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {salvandoDados ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}