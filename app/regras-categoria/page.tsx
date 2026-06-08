import { prisma } from "@/lib/prisma";
import {
  criarRegraCategoria,
  excluirRegraCategoria,
  recalcularTodosProdutosPelasRegras,
} from "./actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import RegrasCategoriaForm from "./RegrasCategoriaForm";
import {
  extrairCategoriasRegra,
  normalizarCategoria,
} from "@/lib/regras-categoria";

export const dynamic = "force-dynamic";

type CategoriaRegraOption = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  caminho: string;
};

function montarCaminhoCategoria(
  categoria: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  },
  categorias: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  }[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  const partes = [categoria.nome];

  let atual = categoria.categoriaMaeId
    ? mapa.get(categoria.categoriaMaeId)
    : null;

  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : null;
  }

  return partes.join(" > ");
}

function ordenarCategoriasPorCaminho(categorias: CategoriaRegraOption[]) {
  return [...categorias].sort((a, b) => a.caminho.localeCompare(b.caminho));
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function formatarEscopoRegra(regra: {
  categoria: string;
  aplicarTodasCategorias: boolean;
  categorias: unknown;
}) {
  if (regra.aplicarTodasCategorias) {
    return {
      titulo: "Todas as categorias",
      resumo: null,
      legado: false,
    };
  }

  const categorias = extrairCategoriasRegra(regra.categorias);

  if (categorias.length > 0) {
    const nomes = categorias.map(
      (categoria) => categoria.caminho || categoria.nome || categoria.slug || ""
    );
    const categoriasValidas = nomes.filter(Boolean);
    const titulo = categoriasValidas.slice(0, 2).join(", ");
    const restante = categoriasValidas.length - 2;

    return {
      titulo:
        restante > 0
          ? `${titulo} +${restante} categoria${restante === 1 ? "" : "s"}`
          : titulo,
      resumo:
        categoriasValidas.length > 1
          ? `${categoriasValidas.length} categorias selecionadas`
          : null,
      legado: false,
    };
  }

  return {
    titulo: regra.categoria,
    resumo: "Categoria antiga/manual",
    legado: true,
  };
}

export default async function RegrasCategoriaPage() {
  const [itensAdicionais, regras, categoriasRaw] = await Promise.all([
    prisma.itemAdicional.findMany({
      where: {
        ativo: true,
        status: {
          not: "NA_LIXEIRA",
        },
      },
      orderBy: {
        nome: "asc",
      },
    }),

    prisma.regraCategoria.findMany({
      include: {
        itemAdicional: true,
      },
      orderBy: [{ categoria: "asc" }, { criadoEm: "desc" }],
    }),

    prisma.categoriaProduto.findMany({
      where: {
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        categoriaMaeId: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  const categorias: CategoriaRegraOption[] = ordenarCategoriasPorCaminho(
    categoriasRaw.map((categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      slug: categoria.slug,
      categoriaMaeId: categoria.categoriaMaeId,
      caminho: montarCaminhoCategoria(categoria, categoriasRaw),
    }))
  );

  const categoriasNovasNomes = new Set(
    categorias.map((categoria) => normalizarCategoria(categoria.nome))
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Regras por categoria
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Regras de Consumo de Adicionais
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Defina quais itens adicionais entram automaticamente no custo dos
              produtos de cada categoria. Essas regras alimentam o cálculo de
              preço final do produto.
            </p>
          </div>

          <form action={recalcularTodosProdutosPelasRegras}>
            <ConfirmSubmitButton
              label="Recalcular preços dos produtos"
              confirmMessage="Recalcular o preço de venda de todos os produtos com base nas regras atuais de adicionais?"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            />
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Nova regra</h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Selecione uma ou mais categorias cadastradas no sistema e vincule um
            item adicional consumido por produto.
          </p>

          <RegrasCategoriaForm
            categorias={categorias}
            itensAdicionais={itensAdicionais.map((item) => ({
              id: item.id,
              codigoInterno: item.codigoInterno,
              nome: item.nome,
            }))}
            criarRegraCategoria={criarRegraCategoria}
          />
        </section>

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Regras cadastradas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {regras.length} regra{regras.length === 1 ? "" : "s"} cadastrada
              {regras.length === 1 ? "" : "s"}.
            </p>
          </div>

          {regras.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">
              Nenhuma regra cadastrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-600">
                    <th className="px-6 py-4 font-semibold">Categoria</th>
                    <th className="px-6 py-4 font-semibold">Código</th>
                    <th className="px-6 py-4 font-semibold">Item adicional</th>
                    <th className="px-6 py-4 font-semibold">Quantidade</th>
                    <th className="px-6 py-4 font-semibold">Custo unit.</th>
                    <th className="px-6 py-4 font-semibold">Custo total</th>
                    <th className="px-6 py-4 font-semibold">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {regras.map((regra) => {
                    const quantidade = Number(regra.quantidade || 0);
                    const custoUnitario = Number(
                      regra.itemAdicional.custoBase || 0
                    );
                    const custoTotal = quantidade * custoUnitario;
                    const escopo = formatarEscopoRegra(regra);
                    const categoriaExiste =
                      !escopo.legado ||
                      categoriasNovasNomes.has(
                        normalizarCategoria(regra.categoria)
                      );

                    return (
                      <tr key={regra.id} className="text-sm text-slate-700">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div>
                            <p>{escopo.titulo}</p>

                            {escopo.resumo && (
                              <p
                                className={`mt-1 text-xs ${
                                  escopo.legado && !categoriaExiste
                                    ? "text-amber-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {escopo.resumo}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {regra.itemAdicional.codigoInterno}
                        </td>

                        <td className="px-6 py-4">{regra.itemAdicional.nome}</td>

                        <td className="px-6 py-4">{regra.quantidade}</td>

                        <td className="px-6 py-4">
                          {formatarMoeda(custoUnitario)}
                        </td>

                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatarMoeda(custoTotal)}
                        </td>

                        <td className="px-6 py-4">
                          <form
                            action={excluirRegraCategoria.bind(null, regra.id)}
                          >
                            <ConfirmSubmitButton
                              label="Excluir"
                              confirmMessage="Tem certeza que deseja excluir esta regra?"
                              className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                            />
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
