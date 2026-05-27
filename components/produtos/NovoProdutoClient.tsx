"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ProdutoGaleriaInput from "@/components/produtos/ProdutoGaleriaInput";
import CategoriasProdutoInput from "@/components/produtos/CategoriasProdutoInput";
import ComposicaoKitInput from "@/components/produtos/ComposicaoKitInput";
import VariacoesProdutoInput from "@/components/produtos/VariacoesProdutoInput";

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
  quantidade: number;
  itemAdicional: {
    id: string;
    codigoInterno: string;
    nome: string;
    custoBase: number;
  };
};

type NovoProdutoClientProps = {
  categorias: CategoriaProduto[];
  produtosDisponiveisKit: ProdutoDisponivelKit[];
  regrasAdicionais: RegraAdicionalProduto[];
  criarProdutoAction: (formData: FormData) => void | Promise<void>;
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

export default function NovoProdutoClient({
  categorias,
  produtosDisponiveisKit,
  regrasAdicionais,
  criarProdutoAction,
}: NovoProdutoClientProps) {
  const [custoBase, setCustoBase] = useState("");
  const [margemAplicada, setMargemAplicada] = useState("2.7");
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [categoriaPrincipal, setCategoriaPrincipal] =
    useState<CategoriaProduto | null>(null);
  const [produtoEhKit, setProdutoEhKit] = useState(false);

  const regrasAdicionaisCategoria = useMemo(() => {
    if (!categoriaPrincipal?.nome) {
      return [];
    }

    return regrasAdicionais.filter(
      (regra) => regra.categoria === categoriaPrincipal.nome
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
              Novo Produto
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Cadastre um novo produto principal com custo, margem, categoria,
              imagens e informações para a loja.
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
        action={criarProdutoAction}
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
                  value="Gerado automaticamente ao salvar"
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </Field>

              <Field label="Código do fornecedor">
                <input
                  name="codigoFornecedor"
                  placeholder="BR-291"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Nome do produto" className="md:col-span-2">
                <input
                  name="nome"
                  placeholder="Brinco Argola Dourado"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>

              <Field label="Fornecedor padrão">
                <select
                  name="fornecedorPadrao"
                  defaultValue="MONSUR"
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
            description="Defina custo, margem, preço calculado e promoção do produto."
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
                  placeholder="Ex: 25,00"
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
            description="Escolha a categoria principal e categorias extras usadas na loja, filtros e menu público."
            defaultOpen
          >
            <CategoriasProdutoInput
              categoriasIniciais={categorias}
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
                  rows={7}
                  placeholder="Descreva detalhes do produto, materiais, acabamento, uso, cuidados e diferenciais."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </Field>
            </div>
          </AccordionSection>
          <ProdutoGaleriaInput name="galeriaProduto" />
          <AccordionSection
            title="Imagens do produto"
            description="A imagem 1 será a principal e a imagem 2 será usada no hover."
            defaultOpen
          >
            <VariacoesProdutoInput name="variacoesProduto" />
          </AccordionSection>

          <AccordionSection
            title="Apoio"
            description="Links auxiliares para consulta da equipe."
          >
            <div className="grid gap-4">
              <Field label="Link de compra">
                <input
                  name="linkCompra"
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
                Revise as seções abertas e salve o produto.
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
                  Salvar produto
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
            title="Status e regras"
            description="Informações importantes sobre comportamento automático."
            defaultOpen
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-semibold text-emerald-900">
                  Status inicial
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  O produto será criado ativo conforme a regra atual do sistema.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">
                  Categorias dinâmicas
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Se a categoria principal for “Kits” ou uma subcategoria de
                  “Kits”, o produto será salvo como kit composto e terá custo
                  calculado pela composição.
                </p>
              </div>
            </div>
          </AccordionSection>
        </div>
      </form>
    </div>
  );
}