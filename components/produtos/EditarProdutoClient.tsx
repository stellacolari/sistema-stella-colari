"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ProdutoGaleriaInput from "@/components/produtos/ProdutoGaleriaInput";
import CategoriasProdutoInput from "@/components/produtos/CategoriasProdutoInput";
import ComposicaoKitInput from "@/components/produtos/ComposicaoKitInput";
import VariacoesProdutoInput, {
  type ProdutoVariacaoInput,
} from "@/components/produtos/VariacoesProdutoInput";
import EmbalagemProdutoFields, {
  type EmbalagemProdutoInicial,
  type EmbalagemProdutoOptions,
} from "@/components/produtos/EmbalagemProdutoFields";
import { regraAplicaACategoria } from "@/lib/regras-categoria";

type CategoriaProduto = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  exibirNoMenu?: boolean;
  ordemMenu?: number;
};

type ProdutoDisponivelKit = {
  id: string;
  codigoInterno: string;
  nome: string;
  categoria: string | null;
  tipoProduto: string;
  custoBase: number;
};

type RegraAdicionalProduto = {
  id: string;
  categoria: string;
  aplicarTodasCategorias: boolean;
  categorias: unknown;
  quantidade: number;
  itemAdicional: {
    id: string;
    codigoInterno: string;
    nome: string;
    custoBase: number;
  };
};

type ImagemInicial = {
  id?: string;
  imagemUrl: string;
};

type ComponenteKitInicial = {
  componenteProdutoId: string;
  quantidade: number;
};

type ProdutoEdicao = {
  id: string;
  codigoInterno: string;
  codigoFornecedor: string;
  nome: string;
  fornecedorPadrao: string;
  custoBase: number;
  margemAplicada: number;
  precoVenda: number;
  descontoAtivo: boolean;
  precoPromocional: number | null;
  descricaoLoja: string;
  termosBusca: string;
  tagsComerciais: string;
  linkCompra: string;
  observacoes: string;
  tipoProduto: string;
  ativo: boolean;
  embalagem: EmbalagemProdutoInicial;
};

type ProdutoCicloInteligencia = {
  produtoId: string;
  variacaoId: string | null;
  tamanhoAnel: string;
  origemTipo: string | null;
  origemId: string | null;
  dataInicio: string;
  dataFim: string | null;
  quantidadeInicial: number;
  quantidadeEntrada: number;
  quantidadeVendida: number;
  quantidadeAtual: number;
  custoMedio: number;
  precoMedioVenda: number;
  receitaGerada: number;
  margemEstimada: number;
  sellThrough: number;
  diasAtePrimeiraVenda: number | null;
  diasAteEsgotar: number | null;
  status: string;
};

type ProdutoResumoInteligencia = {
  produtoId: string;
  tamanhoAnel: string;
  periodoTipo: string;
  periodoInicio: string;
  periodoFim: string;
  vendasQuantidade: number;
  receita: number;
  custoEstimado: number;
  margemEstimada: number;
  estoqueInicial: number;
  estoqueFinal: number;
  entradas: number;
  saidas: number;
  sellThroughPeriodo: number;
  sellThroughAcumulado: number;
  giroEstimado: number;
  scoreValidacao: number;
  statusComercial: string;
  recomendacao: string;
  dadosJson: unknown;
};

type ProdutoInteligencia = {
  resumo: ProdutoResumoInteligencia | null;
  ciclos: ProdutoCicloInteligencia[];
  recomendacao: {
    recomendacao: string;
    statusComercial: string;
    confianca: number;
    motivo: string;
    sugestaoQuantidade: number;
    cicloAtual: ProdutoCicloInteligencia | null;
    sellThrough: number;
    scoreValidacao: number;
  };
};

type PrecificacaoProdutoResumo = {
  margemBrutaValor: number;
  margemBrutaPct: number;
  precoMinimoSeguro: number;
  descontoMaximoSeguroPct: number;
  classificacao: string;
  recomendacao: string;
  motivo: string;
  acaoSugerida: string;
  custoAusente: boolean;
};

type IntencaoProdutoResumo = {
  visualizacoes: number;
  favoritos: number;
  adicoesCarrinho: number;
  taxaFavorito: number;
  taxaCarrinho: number;
  taxaConversao: number;
  scoreInteresse: number;
  confiancaAnalise: string;
  interpretacao: string;
};

type EditarProdutoClientProps = {
  produto: ProdutoEdicao;
  inteligenciaProduto?: ProdutoInteligencia;
  precificacaoProduto?: PrecificacaoProdutoResumo | null;
  categorias: CategoriaProduto[];
  produtosDisponiveisKit: ProdutoDisponivelKit[];
  regrasAdicionais: RegraAdicionalProduto[];
  imagensIniciais: ImagemInicial[];
  categoriaPrincipalInicialId: string;
  categoriasSelecionadasIniciaisIds: string[];
  componentesKitIniciais: ComponenteKitInicial[];
  variacoesIniciais: ProdutoVariacaoInput[];
  embalagemOptions?: EmbalagemProdutoOptions;
  podeEditarEmbalagem?: boolean;
  podeEditarBuscaSeo?: boolean;
  atualizarProdutoAction: (formData: FormData) => void | Promise<void>;
};

function parseNumero(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const somenteNumero = raw.replace(/[^\d,.-]/g, "");

  let normalizado = somenteNumero;

  if (somenteNumero.includes(",")) {
    normalizado = somenteNumero.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(normalizado);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return numero;
}

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function percentual(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format((valor || 0) / 100);
}

function percentualDireto(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format((valor || 0) / 100);
}

function numeroCurto(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(valor || 0);
}

function dataCurta(value: string | null) {
  if (!value) return "-";
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(data);
}

function labelInteligencia(value: string | null | undefined) {
  const texto = String(value || "-").replaceAll("_", " ").toLowerCase();
  return texto.replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function objetoJson(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numeroJson(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textoJson(value: unknown) {
  return typeof value === "string" ? value : "";
}

function extrairIntencaoProduto(
  dadosJson: unknown
): IntencaoProdutoResumo {
  const dados = objetoJson(dadosJson);
  const intencao = objetoJson(dados.intencaoComercial);

  return {
    visualizacoes: numeroJson(intencao.visualizacoes),
    favoritos: numeroJson(intencao.favoritos),
    adicoesCarrinho: numeroJson(intencao.adicoesCarrinho),
    taxaFavorito: numeroJson(intencao.taxaFavorito),
    taxaCarrinho: numeroJson(intencao.taxaCarrinho),
    taxaConversao: numeroJson(intencao.taxaConversao),
    scoreInteresse: numeroJson(intencao.scoreInteresse),
    confiancaAnalise: textoJson(intencao.confiancaAnalise) || "BAIXA",
    interpretacao:
      textoJson(intencao.interpretacao) ||
      "Produto sem sinais de intencao no periodo. Exponha mais antes de concluir desempenho.",
  };
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  description,
  destaque = false,
}: {
  label: string;
  value: string;
  description?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        destaque
          ? "border-slate-300 bg-slate-950 text-white"
          : "border-slate-200 bg-slate-50 text-slate-900"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          destaque ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">{value}</p>

      {description && (
        <p
          className={`mt-1 text-xs leading-5 ${
            destaque ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function AccordionSection({
  title,
  description,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 marker:hidden [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-180 group-open:bg-slate-900 group-open:text-white">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>

      <div className="border-t border-slate-100 px-6 pb-6 pt-5">
        {children}
      </div>
    </details>
  );
}

export default function EditarProdutoClient({
  produto,
  inteligenciaProduto,
  precificacaoProduto,
  categorias,
  produtosDisponiveisKit,
  regrasAdicionais,
  imagensIniciais,
  categoriaPrincipalInicialId,
  categoriasSelecionadasIniciaisIds,
  componentesKitIniciais,
  variacoesIniciais,
  embalagemOptions = { classes: [], modelos: [] },
  podeEditarEmbalagem = false,
  podeEditarBuscaSeo = false,
  atualizarProdutoAction,
}: EditarProdutoClientProps) {
  const [custoBase, setCustoBase] = useState(String(produto.custoBase || ""));
  const [margemAplicada, setMargemAplicada] = useState(
    String(produto.margemAplicada || "2.7")
  );
  const [descontoAtivo, setDescontoAtivo] = useState(produto.descontoAtivo);
  const [precoPromocional, setPrecoPromocional] = useState(
    produto.precoPromocional ? String(produto.precoPromocional) : ""
  );
  const [categoriaPrincipal, setCategoriaPrincipal] =
    useState<CategoriaProduto | null>(
      categorias.find(
        (categoria) => categoria.id === categoriaPrincipalInicialId
      ) || null
    );
  const [produtoEhKit, setProdutoEhKit] = useState(
    produto.tipoProduto === "KIT"
  );
  const intencaoProduto = inteligenciaProduto?.resumo
    ? extrairIntencaoProduto(inteligenciaProduto.resumo.dadosJson)
    : null;

  const regrasAdicionaisCategoria = useMemo(() => {
    if (!categoriaPrincipal?.nome) {
      return [];
    }

    return regrasAdicionais.filter(
      (regra) => regraAplicaACategoria(regra, categoriaPrincipal.nome, [
        categoriaPrincipal.id,
      ])
    );
  }, [categoriaPrincipal, regrasAdicionais]);

  const calculos = useMemo(() => {
    const custoProduto = parseNumero(custoBase);
    const multiplicador = parseNumero(margemAplicada);

    const custoAdicionais = arredondarMoeda(
      regrasAdicionaisCategoria.reduce((total, regra) => {
        const quantidade = Number(regra.quantidade || 0);
        const custoUnitario = Number(regra.itemAdicional.custoBase || 0);

        return total + quantidade * custoUnitario;
      }, 0)
    );

    const custoTotal = arredondarMoeda(custoProduto + custoAdicionais);

    const precoVenda =
      custoProduto > 0 && multiplicador > 0
        ? arredondarMoeda(custoProduto * multiplicador + custoAdicionais)
        : custoAdicionais > 0
        ? custoAdicionais
        : 0;

    const lucroEstimado =
      precoVenda > 0 ? arredondarMoeda(precoVenda - custoTotal) : 0;

    const margemSobreVenda =
      precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda) * 100 : 0;

    const markupSobreCusto =
      custoTotal > 0 ? ((precoVenda - custoTotal) / custoTotal) * 100 : 0;

    const precoPromo = parseNumero(precoPromocional);

    const descontoPercentual =
      descontoAtivo &&
      precoPromo > 0 &&
      precoVenda > 0 &&
      precoPromo < precoVenda
        ? ((precoVenda - precoPromo) / precoVenda) * 100
        : 0;

    const lucroPromocional =
      descontoAtivo && precoPromo > 0
        ? arredondarMoeda(precoPromo - custoTotal)
        : 0;

    const margemPromocional =
      descontoAtivo && precoPromo > 0
        ? ((precoPromo - custoTotal) / precoPromo) * 100
        : 0;

    return {
      custoProduto,
      custoAdicionais,
      custoTotal,
      multiplicador,
      precoVenda,
      lucroEstimado,
      margemSobreVenda,
      markupSobreCusto,
      precoPromo,
      descontoPercentual,
      lucroPromocional,
      margemPromocional,
    };
  }, [
    custoBase,
    margemAplicada,
    descontoAtivo,
    precoPromocional,
    regrasAdicionaisCategoria,
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Produtos
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Editar Produto
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Atualize os dados do produto cadastrado no sistema.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/configuracoes/loja/categorias"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Gerenciar categorias
            </Link>

            <Link
              href="/produtos"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Voltar para lista
            </Link>
          </div>
        </div>
      </div>

      <form
        action={atualizarProdutoAction}
        className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"
      >
        <div className="space-y-4">
          <AccordionSection
            title="Identificação"
            description="Dados principais do produto, fornecedor e nome comercial."
            defaultOpen
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Código interno">
                <input
                  value={produto.codigoInterno}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Código do fornecedor">
                <input
                  name="codigoFornecedor"
                  defaultValue={produto.codigoFornecedor}
                  placeholder="BR-291"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Nome do produto" className="md:col-span-2">
                <input
                  name="nome"
                  defaultValue={produto.nome}
                  placeholder="Brinco Argola Dourado"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Fornecedor padrão">
                <select
                  name="fornecedorPadrao"
                  defaultValue={produto.fornecedorPadrao}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option>MONSUR</option>
                  <option>PRINTI</option>
                  <option>FORNITURA SOLER</option>
                  <option>OUTRO</option>
                </select>
              </Field>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Comercial"
            description="Edite custo, multiplicador, preço calculado e promoção do produto."
            defaultOpen
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label={produtoEhKit ? "Custo base do kit" : "Custo do produto"}
              >
                <input
                  name="custoBase"
                  value={custoBase}
                  onChange={(event) => setCustoBase(event.target.value)}
                  placeholder="Para kits, será calculado automaticamente"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Multiplicador aplicado">
                <select
                  name="margemAplicada"
                  value={margemAplicada}
                  onChange={(event) => setMargemAplicada(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="2">2</option>
                  <option value="2.3">2,3</option>
                  <option value="2.7">2,7</option>
                  <option value="3.8">3,8</option>
                </select>
              </Field>

              <Field label="Valor de venda total">
                <input
                  value={moeda(calculos.precoVenda)}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-5">
              <InfoCard
                label="Custo produto"
                value={moeda(calculos.custoProduto)}
                description={
                  produtoEhKit
                    ? "Custo base/composição do kit."
                    : "Custo base informado."
                }
              />

              <InfoCard
                label="Adicionais"
                value={moeda(calculos.custoAdicionais)}
                description="Itens adicionados pela categoria."
              />

              <InfoCard
                label="Custo total"
                value={moeda(calculos.custoTotal)}
                description="Produto + adicionais."
              />

              <InfoCard
                label="Venda total"
                value={moeda(calculos.precoVenda)}
                description={`Produto × ${
                  calculos.multiplicador || 0
                } + adicionais.`}
                destaque
              />

              <InfoCard
                label="Lucro bruto"
                value={moeda(calculos.lucroEstimado)}
                description="Venda total - custo total."
              />
            </div>

            {regrasAdicionaisCategoria.length > 0 ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Contém no pacote
                </p>

                <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                  {regrasAdicionaisCategoria.map((regra) => {
                    const quantidade = Number(regra.quantidade || 0);
                    const custoUnitario = Number(
                      regra.itemAdicional.custoBase || 0
                    );
                    const custoTotal = quantidade * custoUnitario;

                    return (
                      <div
                        key={regra.id}
                        className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {regra.itemAdicional.nome}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {regra.itemAdicional.codigoInterno} · {quantidade}{" "}
                            un. × {moeda(custoUnitario)}
                          </p>
                        </div>

                        <p className="font-semibold text-slate-900">
                          {moeda(custoTotal)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                {categoriaPrincipal
                  ? "Esta categoria não possui itens adicionais vinculados."
                  : "Selecione uma categoria principal para ver os itens adicionais do pacote."}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="descontoAtivo"
                  name="descontoAtivo"
                  type="checkbox"
                  checked={descontoAtivo}
                  onChange={(event) => setDescontoAtivo(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-amber-300"
                />

                <div className="flex-1">
                  <label
                    htmlFor="descontoAtivo"
                    className="text-sm font-semibold text-amber-900"
                  >
                    Ativar desconto na loja
                  </label>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Quando ativo, a loja exibirá o preço original riscado, o
                    preço promocional e a porcentagem de desconto.
                  </p>

                  <div className="mt-4">
                    <Field label="Preço promocional">
                      <input
                        name="precoPromocional"
                        value={precoPromocional}
                        onChange={(event) =>
                          setPrecoPromocional(event.target.value)
                        }
                        type="text"
                        placeholder="Ex: 79,90"
                        className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-500"
                      />
                    </Field>
                  </div>

                  {descontoAtivo && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <InfoCard
                        label="Desconto"
                        value={percentual(calculos.descontoPercentual)}
                        description="Comparado ao valor de venda total."
                      />

                      <InfoCard
                        label="Lucro promocional"
                        value={moeda(calculos.lucroPromocional)}
                        description="Preço promocional - custo total."
                      />

                      <InfoCard
                        label="Margem promocional"
                        value={percentual(calculos.margemPromocional)}
                        description="Lucro dividido pelo preço promocional."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Categorias"
            description="Escolha a categoria principal, categorias extras e a composição do kit quando aplicável."
            defaultOpen
          >
            <CategoriasProdutoInput
              categoriasIniciais={categorias}
              categoriaPrincipalInicialId={categoriaPrincipalInicialId}
              categoriasSelecionadasIniciaisIds={
                categoriasSelecionadasIniciaisIds
              }
              onCategoriaPrincipalChange={(categoria, ehKit) => {
                setCategoriaPrincipal(categoria);
                setProdutoEhKit(ehKit);
              }}
              kitContent={
              <ComposicaoKitInput
                produtosDisponiveis={produtosDisponiveisKit.map((produto) => ({
                  ...produto,
                  categoria: produto.categoria ?? "",
                }))}
                componentesIniciais={componentesKitIniciais}
              />
              }
            />
          </AccordionSection>

          <AccordionSection
            title="Descrição na loja"
            description="Texto comercial exibido na página pública do produto."
          >
            <div className="grid gap-4">
              <Field label="Descrição para loja">
                <textarea
                  name="descricaoLoja"
                  defaultValue={produto.descricaoLoja}
                  rows={7}
                  placeholder="Descreva detalhes do produto, materiais, acabamento, uso, cuidados e diferenciais."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </AccordionSection>

          {podeEditarBuscaSeo && (
            <AccordionSection
              title="Busca e SEO"
              description="Termos internos para busca inteligente, sem alterar o nome exibido ao cliente."
            >
              <div className="grid gap-4">
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Use palavras que o cliente pode pesquisar, mesmo que não
                  estejam no nome do produto.
                </p>

                <Field label="Termos de busca">
                  <textarea
                    name="termosBusca"
                    defaultValue={produto.termosBusca}
                    rows={3}
                    placeholder="presente, romântico, dia dos namorados, delicado"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                  />
                </Field>

                <Field label="Tags comerciais">
                  <textarea
                    name="tagsComerciais"
                    defaultValue={produto.tagsComerciais}
                    rows={3}
                    placeholder="minimalista, festa, luxo, nova coleção"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                  />
                </Field>
              </div>
            </AccordionSection>
          )}

          <AccordionSection
            title="Variações internas do produto"
            description="Configure opções operacionais de estoque, como tamanho, medida, comprimento ou aro. Material e cor comercial devem ser tratados como produtos separados em uma família."
          >
            <VariacoesProdutoInput
              name="variacoesProduto"
              variacoesIniciais={variacoesIniciais}
            />
          </AccordionSection>

          <AccordionSection
            title="Imagens do produto"
            description="A imagem 1 será a principal e a imagem 2 será usada no hover."
            defaultOpen
          >
            <ProdutoGaleriaInput
              name="galeriaProduto"
              imagensIniciais={imagensIniciais}
            />
          </AccordionSection>

          {podeEditarEmbalagem && (
            <AccordionSection
              title="Embalagem e envio"
              description="Configure dados operacionais para o motor modelável de embalagens. Não altera frete, estoque ou checkout nesta etapa."
            >
              <EmbalagemProdutoFields
                options={embalagemOptions}
                inicial={produto.embalagem}
              />
            </AccordionSection>
          )}

          <AccordionSection
            title="Apoio"
            description="Links auxiliares para consulta da equipe."
          >
            <div className="grid gap-4">
              <Field label="Link de compra">
                <input
                  name="linkCompra"
                  defaultValue={produto.linkCompra}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </AccordionSection>

          <AccordionSection
            title="Observações internas"
            description="Anotações administrativas que não aparecem na loja."
          >
            <div className="grid gap-4">
              <Field label="Observações internas">
                <textarea
                  name="observacoes"
                  defaultValue={produto.observacoes}
                  rows={4}
                  placeholder="Anotações internas sobre este produto"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </AccordionSection>

          <div className="sticky bottom-4 z-10 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Revise as alterações antes de salvar o produto.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/produtos"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AccordionSection
            title="Resumo calculado"
            description="Prévia em tempo real com produto, adicionais, venda e lucro."
            defaultOpen
          >
            <div className="grid gap-4">
              <InfoCard
                label="Custo do produto"
                value={moeda(calculos.custoProduto)}
                description={
                  produtoEhKit
                    ? "Base do kit/composição."
                    : "Valor informado no comercial."
                }
              />

              <InfoCard
                label="Custo dos adicionais"
                value={moeda(calculos.custoAdicionais)}
                description="Itens automáticos da categoria principal."
              />

              <InfoCard
                label="Custo total"
                value={moeda(calculos.custoTotal)}
                description="Produto + adicionais."
              />

              <InfoCard
                label="Valor de venda total"
                value={moeda(calculos.precoVenda)}
                description={`Produto × ${
                  calculos.multiplicador || 0
                } + adicionais.`}
                destaque
              />

              <InfoCard
                label="Lucro bruto"
                value={moeda(calculos.lucroEstimado)}
                description="Venda total menos custo total."
              />

              {descontoAtivo && (
                <>
                  <InfoCard
                    label="Preço promocional"
                    value={moeda(calculos.precoPromo)}
                    description="Valor promocional informado."
                  />

                  <InfoCard
                    label="Desconto aplicado"
                    value={percentual(calculos.descontoPercentual)}
                    description="Diferença entre preço cheio e promocional."
                  />

                  <InfoCard
                    label="Lucro promocional"
                    value={moeda(calculos.lucroPromocional)}
                    description="Preço promocional menos custo total."
                  />

                  <InfoCard
                    label="Margem promocional"
                    value={percentual(calculos.margemPromocional)}
                    description="Lucro dividido pelo preço promocional."
                  />
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Como o sistema está calculando
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Valor de venda total = custo do produto × multiplicador +
                adicionais da categoria. Lucro bruto = valor de venda total -
                custo total.
              </p>
            </div>

            {produtoEhKit && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-semibold text-amber-900">
                  Observação para kits
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  No salvamento, o custo do kit é recalculado pelos componentes.
                  Esta prévia usa o campo de custo informado na tela.
                </p>
              </div>
            )}
          </AccordionSection>

          <AccordionSection
            title="Inteligencia do produto"
            description="Leitura historica por ciclo, estoque e venda."
            defaultOpen
          >
            {inteligenciaProduto?.resumo ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    label="Status comercial"
                    value={labelInteligencia(
                      inteligenciaProduto.resumo.statusComercial
                    )}
                    description={`Score ${numeroCurto(
                      inteligenciaProduto.resumo.scoreValidacao
                    )}/100`}
                    destaque
                  />

                  <InfoCard
                    label="Recomendacao"
                    value={labelInteligencia(
                      inteligenciaProduto.recomendacao.recomendacao
                    )}
                    description={`${numeroCurto(
                      inteligenciaProduto.recomendacao.confianca
                    )}% de confianca`}
                  />

                  <InfoCard
                    label="Sell-through"
                    value={percentualDireto(
                      inteligenciaProduto.resumo.sellThroughAcumulado
                    )}
                    description={`${inteligenciaProduto.resumo.vendasQuantidade} venda(s) no periodo`}
                  />

                  <InfoCard
                    label="Estoque atual"
                    value={`${inteligenciaProduto.resumo.estoqueFinal} un.`}
                    description={`Giro estimado ${numeroCurto(
                      inteligenciaProduto.resumo.giroEstimado
                    )}/mes`}
                  />
                </div>

                {intencaoProduto ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoCard
                        label="Visualizacoes"
                        value={numeroCurto(intencaoProduto.visualizacoes)}
                        description="Exposicao do produto na loja."
                      />

                      <InfoCard
                        label="Favoritos"
                        value={numeroCurto(intencaoProduto.favoritos)}
                        description={`${percentualDireto(
                          intencaoProduto.taxaFavorito
                        )} das visualizacoes`}
                      />

                      <InfoCard
                        label="Carrinho"
                        value={numeroCurto(intencaoProduto.adicoesCarrinho)}
                        description={`${percentualDireto(
                          intencaoProduto.taxaCarrinho
                        )} das visualizacoes`}
                      />

                      <InfoCard
                        label="Conversao"
                        value={percentualDireto(intencaoProduto.taxaConversao)}
                        description="Venda sobre visualizacoes."
                      />

                      <InfoCard
                        label="Score de interesse"
                        value={`${numeroCurto(
                          intencaoProduto.scoreInteresse
                        )}/100`}
                        description="Desejo gerado por views, busca, favoritos e carrinho."
                      />

                      <InfoCard
                        label="Confianca"
                        value={labelInteligencia(
                          intencaoProduto.confiancaAnalise
                        )}
                        description="Forca da amostra de eventos."
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Leitura de intencao
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {intencaoProduto.interpretacao}
                      </p>
                    </div>
                  </>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Decisao de reposicao
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {inteligenciaProduto.recomendacao.motivo}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Sugestao: {inteligenciaProduto.recomendacao.sugestaoQuantidade} un.
                  </p>
                </div>

                {precificacaoProduto && (
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      precificacaoProduto.custoAusente
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Preco e margem
                    </p>
                    {precificacaoProduto.custoAusente ? (
                      <p className="mt-2 text-sm leading-6 text-violet-800">
                        Produto sem custo cadastrado. Nao e possivel calcular
                        margem com seguranca.
                      </p>
                    ) : (
                      <>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoCard
                            label="Margem atual"
                            value={`${moeda(
                              precificacaoProduto.margemBrutaValor
                            )} (${percentualDireto(
                              precificacaoProduto.margemBrutaPct
                            )})`}
                          />
                          <InfoCard
                            label="Preco minimo seguro"
                            value={moeda(precificacaoProduto.precoMinimoSeguro)}
                          />
                          <InfoCard
                            label="Desconto maximo seguro"
                            value={percentualDireto(
                              precificacaoProduto.descontoMaximoSeguroPct
                            )}
                          />
                          <InfoCard
                            label="Classificacao"
                            value={labelInteligencia(
                              precificacaoProduto.classificacao
                            )}
                          />
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                          {precificacaoProduto.recomendacao}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {precificacaoProduto.motivo}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {precificacaoProduto.acaoSugerida}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-900">
                    Historico de ciclos
                  </p>

                  <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                    {inteligenciaProduto.ciclos.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-slate-500">
                        Ainda nao ha movimentos suficientes para separar ciclos.
                      </p>
                    ) : (
                      inteligenciaProduto.ciclos
                        .slice()
                        .reverse()
                        .slice(0, 5)
                        .map((ciclo, index) => (
                          <div
                            key={`${ciclo.tamanhoAnel}-${ciclo.dataInicio}-${index}`}
                            className="px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {ciclo.tamanhoAnel === "UNICO"
                                  ? "Ciclo unico"
                                  : `Tam. ${ciclo.tamanhoAnel}`}
                              </p>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {labelInteligencia(ciclo.status)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {dataCurta(ciclo.dataInicio)} ate {dataCurta(ciclo.dataFim)}
                            </p>

                            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                              <span>
                                Venda: {ciclo.quantidadeVendida}/
                                {ciclo.quantidadeInicial + ciclo.quantidadeEntrada} un.
                              </span>
                              <span>
                                Sell-through: {percentualDireto(ciclo.sellThrough)}
                              </span>
                              <span>Margem: {moeda(ciclo.margemEstimada)}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Ainda nao ha historico suficiente para classificar este produto.
              </div>
            )}
          </AccordionSection>

          <AccordionSection
            title="Status e regras"
            description="Situação atual do produto no sistema e na loja."
            defaultOpen
          >
            <div className="space-y-4">
              <div
                className={`rounded-2xl border px-4 py-4 ${
                  produto.ativo
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    produto.ativo ? "text-emerald-900" : "text-slate-900"
                  }`}
                >
                  {produto.ativo ? "Ativo na loja" : "Oculto da loja"}
                </p>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    produto.ativo ? "text-emerald-800" : "text-slate-500"
                  }`}
                >
                  Este status reflete a situação atual do produto no sistema.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tipo do produto
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {produtoEhKit ? "Kit composto" : "Unitário"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  Categorias dinâmicas
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Se a categoria principal for “Kits” ou uma subcategoria de
                  “Kits”, o produto será tratado como kit composto conforme a
                  regra atual da action de atualização.
                </p>
              </div>
            </div>
          </AccordionSection>
        </div>
      </form>
    </div>
  );
}
