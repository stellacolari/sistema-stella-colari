"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  FileJson,
  RefreshCw,
  Send,
} from "lucide-react";

type Canal = "MERCADO_LIVRE" | "SHOPEE" | "TIKTOK_SHOP" | "OUTRO";

function gerarCodigoExterno(canal: Canal) {
  const prefixo =
    canal === "MERCADO_LIVRE"
      ? "ML"
      : canal === "SHOPEE"
      ? "SH"
      : canal === "TIKTOK_SHOP"
      ? "TK"
      : "EXT";

  return `${prefixo}-TESTE-${Date.now()}`;
}

function criarPayloadPadrao(canal: Canal) {
  const codigoPedidoExterno = gerarCodigoExterno(canal);

  const nomeCanal =
    canal === "MERCADO_LIVRE"
      ? "Mercado Livre"
      : canal === "SHOPEE"
      ? "Shopee"
      : canal === "TIKTOK_SHOP"
      ? "TikTok Shop"
      : "Canal externo";

  const gateway =
    canal === "MERCADO_LIVRE"
      ? "MERCADO_LIVRE"
      : canal === "SHOPEE"
      ? "SHOPEE"
      : canal === "TIKTOK_SHOP"
      ? "TIKTOK_SHOP"
      : "OUTRO";

  return {
    origemCanal: canal,
    codigoPedidoExterno,
    statusExterno: "ready_to_ship",
    substatusExterno: "printed",

    nomeCliente: `Cliente ${nomeCanal}`,
    telefoneCliente: "11999999999",
    emailCliente: "cliente@teste.com",
    documento: "00000000000",

    cep: "00000-000",
    rua: "Rua Teste",
    numero: "123",
    complemento: "Apto 1",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",

    status: "PEDIDO_RECEBIDO",
    statusPagamento: "PAGO",
    metodoPagamento:
      canal === "MERCADO_LIVRE"
        ? "Mercado Pago"
        : canal === "SHOPEE"
        ? "Shopee Pay"
        : canal === "TIKTOK_SHOP"
        ? "TikTok Shop"
        : "Pagamento externo",
    gatewayPagamento: gateway,
    gatewayPedidoId: `${gateway}-ORDER-${codigoPedidoExterno}`,
    gatewayPagamentoId: `${gateway}-PAY-${codigoPedidoExterno}`,

    frete: 12.9,

    itens: [
      {
        codigoInterno: "SKU-TESTE",
        nomeProduto: `Produto teste ${nomeCanal}`,
        categoria: "Externo",
        quantidade: 1,
        precoUnitario: 89.9,
        total: 89.9,
      },
    ],

    envio: {
      tipoEntrega: "ENTREGA",
      transportadora:
        canal === "MERCADO_LIVRE"
          ? "Mercado Envios"
          : canal === "SHOPEE"
          ? "Shopee Envios"
          : canal === "TIKTOK_SHOP"
          ? "TikTok Shop Logistics"
          : "Transportadora externa",
      servico: "Normal",
      statusEnvio: "ETIQUETA_GERADA",
      gatewayLogistico: gateway,
      gatewayEnvioId: `${gateway}-SHIP-${codigoPedidoExterno}`,
      codigoRastreio: `${gateway}-RASTREIO-001`,
      etiquetaPdfUrl: "https://exemplo.com/etiqueta.pdf",
      declaracaoConteudoUrl: "https://exemplo.com/declaracao.pdf",
    },

    dadosOriginaisJson: {
      origem: "teste-manual-stella",
      observacao:
        "Payload de teste gerado pela tela de importação manual do Stella.",
    },
  };
}

function formatarJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function lerRespostaApi(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function ImportarPedidoExternoClient() {
  const [canal, setCanal] = useState<Canal>("MERCADO_LIVRE");
  const [jsonTexto, setJsonTexto] = useState(() =>
    formatarJson(criarPayloadPadrao("MERCADO_LIVRE"))
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{
    acao?: string;
    pedido?: {
      id?: string;
      codigo?: string;
      origemCanal?: string;
      codigoPedidoExterno?: string;
      status?: string;
      statusPagamento?: string;
    };
    raw?: unknown;
  } | null>(null);

  const jsonValido = useMemo(() => {
    try {
      JSON.parse(jsonTexto);
      return true;
    } catch {
      return false;
    }
  }, [jsonTexto]);

  function aplicarTemplate(novoCanal: Canal) {
    setCanal(novoCanal);
    setErro("");
    setResultado(null);
    setJsonTexto(formatarJson(criarPayloadPadrao(novoCanal)));
  }

  function gerarNovoCodigo() {
    try {
      const payload = JSON.parse(jsonTexto);
      const codigoPedidoExterno = gerarCodigoExterno(canal);

      payload.origemCanal = canal;
      payload.codigoPedidoExterno = codigoPedidoExterno;

      if (payload.gatewayPedidoId) {
        payload.gatewayPedidoId = `${canal}-ORDER-${codigoPedidoExterno}`;
      }

      if (payload.gatewayPagamentoId) {
        payload.gatewayPagamentoId = `${canal}-PAY-${codigoPedidoExterno}`;
      }

      if (payload.envio?.gatewayEnvioId) {
        payload.envio.gatewayEnvioId = `${canal}-SHIP-${codigoPedidoExterno}`;
      }

      setJsonTexto(formatarJson(payload));
      setErro("");
      setResultado(null);
    } catch {
      setErro("O JSON atual está inválido. Corrija ou gere um novo template.");
    }
  }

  async function copiarJson() {
    try {
      await navigator.clipboard.writeText(jsonTexto);
      setErro("");
    } catch {
      setErro("Não foi possível copiar o JSON.");
    }
  }

  async function importarPedido() {
    setErro("");
    setResultado(null);

    let payload: unknown;

    try {
      payload = JSON.parse(jsonTexto);
    } catch {
      setErro("JSON inválido. Corrija o conteúdo antes de enviar.");
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch("/api/pedidos/importar-externo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await lerRespostaApi(response);

      if (!response.ok) {
        setErro(data.error || "Erro ao importar pedido externo.");
        return;
      }

      setResultado({
        acao: data.acao,
        pedido: data.pedido,
        raw: data,
      });
    } catch {
      setErro("Erro ao importar pedido externo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Configuração do teste
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Escolha um canal e gere um payload de exemplo. Reenviar o mesmo
            código externo deve atualizar o pedido existente, sem duplicar.
          </p>

          <div className="mt-5 space-y-4">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Canal
              </span>

              <select
                value={canal}
                onChange={(event) => aplicarTemplate(event.target.value as Canal)}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-slate-500"
              >
                <option value="MERCADO_LIVRE">Mercado Livre</option>
                <option value="SHOPEE">Shopee</option>
                <option value="TIKTOK_SHOP">TikTok Shop</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => aplicarTemplate(canal)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Gerar template
              </button>

              <button
                type="button"
                onClick={gerarNovoCodigo}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileJson className="h-4 w-4" />
                Novo código externo
              </button>
            </div>

            <button
              type="button"
              onClick={copiarJson}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Clipboard className="h-4 w-4" />
              Copiar JSON
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Resultado
          </h2>

          <div className="mt-4 space-y-3">
            {erro && (
              <div className="flex gap-3 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{erro}</p>
              </div>
            )}

            {!erro && resultado && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Pedido {resultado.acao === "ATUALIZADO" ? "atualizado" : "criado"} com sucesso.
                    </p>

                    {resultado.pedido?.codigo && (
                      <p className="mt-1">
                        Código interno:{" "}
                        <span className="font-semibold">
                          {resultado.pedido.codigo}
                        </span>
                      </p>
                    )}

                    {resultado.pedido?.codigoPedidoExterno && (
                      <p className="mt-1">
                        Código externo:{" "}
                        <span className="font-semibold">
                          {resultado.pedido.codigoPedidoExterno}
                        </span>
                      </p>
                    )}

                    {resultado.pedido?.id && (
                      <Link
                        href={`/pedidos/${resultado.pedido.id}`}
                        className="mt-3 inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Abrir pedido
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!erro && !resultado && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum pedido enviado ainda.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Payload JSON
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Edite o JSON livremente para testar cenários diferentes.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              jsonValido
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-red-50 text-red-700 ring-red-200"
            }`}
          >
            {jsonValido ? "JSON válido" : "JSON inválido"}
          </span>
        </div>

        <textarea
          value={jsonTexto}
          onChange={(event) => {
            setJsonTexto(event.target.value);
            setErro("");
            setResultado(null);
          }}
          spellCheck={false}
          className="mt-5 min-h-[640px] w-full rounded-3xl border border-slate-300 bg-slate-950 px-4 py-4 font-mono text-xs leading-5 text-slate-50 outline-none transition focus:border-slate-500"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Dica: envie o mesmo <strong>codigoPedidoExterno</strong> duas vezes
            para testar a atualização sem duplicidade.
          </p>

          <button
            type="button"
            onClick={importarPedido}
            disabled={enviando || !jsonValido}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {enviando ? "Enviando..." : "Importar pedido"}
          </button>
        </div>
      </div>
    </section>
  );
}