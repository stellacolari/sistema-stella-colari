"use server";

import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import {
  chaveEscopoRegra,
  extrairCategoriasRegra,
  normalizarCategoria,
  regraAplicaACategorias,
} from "@/lib/regras-categoria";
import { revalidatePath } from "next/cache";

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

type CategoriaProdutoCalculo = {
  id?: string | null;
  nome: string;
};

function categoriasUnicas(categorias: CategoriaProdutoCalculo[]) {
  const mapa = new Map<string, CategoriaProdutoCalculo>();

  categorias.forEach((categoria) => {
    const nomeNormalizado = normalizarCategoria(categoria.nome);

    if (!nomeNormalizado) {
      return;
    }

    mapa.set(categoria.id || nomeNormalizado, categoria);
  });

  return Array.from(mapa.values());
}

async function calcularCustoAdicionaisCategorias(
  categoriasProduto: CategoriaProdutoCalculo[]
) {
  const categorias = categoriasUnicas(categoriasProduto);

  if (categorias.length === 0) {
    return 0;
  }

  const regras = await prisma.regraCategoria.findMany({
    include: {
      itemAdicional: {
        select: {
          id: true,
          custoBase: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  const custoAdicionais = regras.reduce((total, regra) => {
    if (!regraAplicaACategorias(regra, categorias)) {
      return total;
    }

    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return total;
    }

    const quantidade = Number(regra.quantidade || 0);
    const custoUnitario = Number(regra.itemAdicional.custoBase || 0);

    return total + quantidade * custoUnitario;
  }, 0);

  return arredondarMoeda(custoAdicionais);
}

async function recalcularProdutosPorCategorias(
  categoriasAfetadas: CategoriaProdutoCalculo[],
  todasCategorias = false
) {
  const categorias = categoriasUnicas(categoriasAfetadas);
  const categoriaIds = categorias
    .map((categoria) => categoria.id)
    .filter((id): id is string => Boolean(id));
  const categoriaNomes = categorias.map((categoria) => categoria.nome);

  const produtos = await prisma.produto.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
      ...(todasCategorias
        ? {}
        : {
            OR: [
              {
                categoria: {
                  in: categoriaNomes,
                },
              },
              {
                categoriasProduto: {
                  some: {
                    OR: [
                      ...(categoriaIds.length > 0
                        ? [
                            {
                              categoriaId: {
                                in: categoriaIds,
                              },
                            },
                          ]
                        : []),
                      {
                        categoria: {
                          nome: {
                            in: categoriaNomes,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }),
    },
    select: {
      id: true,
      categoria: true,
      custoBase: true,
      margemAplicada: true,
      descontoAtivo: true,
      precoPromocional: true,
      categoriasProduto: {
        include: {
          categoria: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  });

  for (const produto of produtos) {
    const categoriasDoProduto = categoriasUnicas([
      ...produto.categoriasProduto.map((relacao) => ({
        id: relacao.categoria.id,
        nome: relacao.categoria.nome,
      })),
      {
        nome: produto.categoria,
      },
    ]);
    const custoAdicionais = await calcularCustoAdicionaisCategorias(
      categoriasDoProduto
    );
    const custoBase = Number(produto.custoBase || 0);
    const margemAplicada = Number(produto.margemAplicada || 0);

    const precoVenda = arredondarMoeda(
      custoBase * margemAplicada + custoAdicionais
    );

    const promocaoInvalida =
      produto.descontoAtivo &&
      produto.precoPromocional !== null &&
      Number(produto.precoPromocional || 0) >= precoVenda;

    await prisma.produto.update({
      where: {
        id: produto.id,
      },
      data: {
        precoVenda,
        ...(promocaoInvalida
          ? {
              descontoAtivo: false,
              precoPromocional: null,
            }
          : {}),
      },
    });
  }
}

async function recalcularProdutosDaCategoria(categoria: string) {
  const categoriaNormalizada = String(categoria || "").trim();

  if (!categoriaNormalizada) {
    return;
  }

  await recalcularProdutosPorCategorias([{ nome: categoriaNormalizada }]);
}

function getCategoriaIdsFormData(formData: FormData) {
  return formData
    .getAll("categoriaIds")
    .map((valor) => String(valor || "").trim())
    .filter(Boolean);
}

function regraTemMesmoEscopo(
  regra: {
    categoria: string;
    aplicarTodasCategorias: boolean;
    categorias: unknown;
  },
  escopo: {
    aplicarTodasCategorias: boolean;
    categorias: CategoriaProdutoCalculo[];
    categoriaLegado: string;
  }
) {
  if (escopo.aplicarTodasCategorias) {
    return regra.aplicarTodasCategorias;
  }

  const chaveNova = chaveEscopoRegra({
    aplicarTodasCategorias: false,
    categorias: escopo.categorias,
    categoria: escopo.categoriaLegado,
  });

  if (chaveEscopoRegra(regra) === chaveNova) {
    return true;
  }

  if (escopo.categorias.length === 1 && !regra.categorias) {
    return (
      normalizarCategoria(regra.categoria) ===
      normalizarCategoria(escopo.categorias[0].nome)
    );
  }

  return false;
}

export async function criarRegraCategoria(formData: FormData) {
  await exigirAdminComPermissao("produtos", "editar");

  const aplicarTodasCategorias =
    String(formData.get("aplicarTodasCategorias") || "") === "on";
  const categoriaIds = getCategoriaIdsFormData(formData);
  const itemAdicionalId = String(formData.get("itemAdicionalId") || "").trim();
  const quantidade = Number(formData.get("quantidade") || 0);

  if (!aplicarTodasCategorias && categoriaIds.length === 0) {
    throw new Error("Selecione ao menos uma categoria ou marque todas.");
  }

  if (!itemAdicionalId) {
    throw new Error("Item adicional é obrigatório.");
  }

  if (quantidade <= 0) {
    throw new Error("Quantidade deve ser maior que zero.");
  }

  const categoriasSelecionadas = aplicarTodasCategorias
    ? []
    : await prisma.categoriaProduto.findMany({
        where: {
          id: {
            in: categoriaIds,
          },
        },
        select: {
          id: true,
          nome: true,
          slug: true,
          categoriaMaeId: true,
        },
      });

  if (!aplicarTodasCategorias && categoriasSelecionadas.length === 0) {
    throw new Error("Categoria não encontrada.");
  }

  const todasCategorias = await prisma.categoriaProduto.findMany({
    select: {
      id: true,
      nome: true,
      categoriaMaeId: true,
    },
  });

  const mapaCategorias = new Map(
    todasCategorias.map((categoria) => [categoria.id, categoria])
  );
  const montarCaminho = (categoria: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  }) => {
    const partes = [categoria.nome];
    let atual = categoria.categoriaMaeId
      ? mapaCategorias.get(categoria.categoriaMaeId)
      : null;

    while (atual) {
      partes.unshift(atual.nome);
      atual = atual.categoriaMaeId
        ? mapaCategorias.get(atual.categoriaMaeId)
        : null;
    }

    return partes.join(" > ");
  };

  const categoriasEscopo = categoriasSelecionadas.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    caminho: montarCaminho(categoria),
  }));
  const categoriaLegado = aplicarTodasCategorias
    ? "Todas as categorias"
    : categoriasEscopo[0]?.nome || "";

  if (!aplicarTodasCategorias && !categoriaLegado) {
    throw new Error("Categoria não encontrada.");
  }

  const itemAdicional = await prisma.itemAdicional.findUnique({
    where: {
      id: itemAdicionalId,
    },
    select: {
      id: true,
      ativo: true,
      status: true,
    },
  });

  if (!itemAdicional) {
    throw new Error("Item adicional não encontrado.");
  }

  if (!itemAdicional.ativo || itemAdicional.status === "NA_LIXEIRA") {
    throw new Error("Não é possível usar item adicional inativo ou na lixeira.");
  }

  const regrasMesmoItem = await prisma.regraCategoria.findMany({
    where: {
      itemAdicionalId,
    },
    select: {
      id: true,
      categoria: true,
      aplicarTodasCategorias: true,
      categorias: true,
    },
  });
  const regraExistente = regrasMesmoItem.find((regra) =>
    regraTemMesmoEscopo(regra, {
      aplicarTodasCategorias,
      categorias: categoriasEscopo,
      categoriaLegado,
    })
  );

  if (regraExistente) {
    await prisma.regraCategoria.update({
      where: {
        id: regraExistente.id,
      },
      data: {
        quantidade,
        categoria: categoriaLegado,
        aplicarTodasCategorias,
        categorias: aplicarTodasCategorias ? [] : categoriasEscopo,
      },
    });
  } else {
    await prisma.regraCategoria.create({
      data: {
        categoria: categoriaLegado,
        itemAdicionalId,
        quantidade,
        aplicarTodasCategorias,
        categorias: aplicarTodasCategorias ? [] : categoriasEscopo,
      },
    });
  }

  await recalcularProdutosPorCategorias(categoriasEscopo, aplicarTodasCategorias);

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}

export async function excluirRegraCategoria(id: string) {
  await exigirAdminComPermissao("produtos", "editar");

  const regra = await prisma.regraCategoria.findUnique({
    where: { id },
    select: {
      id: true,
      categoria: true,
      aplicarTodasCategorias: true,
      categorias: true,
    },
  });

  if (!regra) {
    throw new Error("Regra não encontrada.");
  }

  await prisma.regraCategoria.delete({
    where: { id },
  });

  const categoriasRegra = extrairCategoriasRegra(regra.categorias)
    .map((categoria) => ({
      id: categoria.id || undefined,
      nome: categoria.nome || categoria.caminho || categoria.slug || "",
    }))
    .filter((categoria) => normalizarCategoria(categoria.nome));

  if (regra.aplicarTodasCategorias) {
    await recalcularProdutosPorCategorias([], true);
  } else if (categoriasRegra.length > 0) {
    await recalcularProdutosPorCategorias(categoriasRegra);
  } else {
    await recalcularProdutosDaCategoria(regra.categoria);
  }

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}

export async function recalcularTodosProdutosPelasRegras() {
  await exigirAdminComPermissao("produtos", "editar");

  await recalcularProdutosPorCategorias([], true);

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}
