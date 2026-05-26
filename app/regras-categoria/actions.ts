"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

async function calcularCustoAdicionaisCategoria(categoria: string) {
  const categoriaNormalizada = String(categoria || "").trim();

  if (!categoriaNormalizada) {
    return 0;
  }

  const regras = await prisma.regraCategoria.findMany({
    where: {
      categoria: categoriaNormalizada,
    },
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

async function recalcularProdutosDaCategoria(categoria: string) {
  const categoriaNormalizada = String(categoria || "").trim();

  if (!categoriaNormalizada) {
    return;
  }

  const custoAdicionais = await calcularCustoAdicionaisCategoria(
    categoriaNormalizada
  );

  const produtos = await prisma.produto.findMany({
    where: {
      categoria: categoriaNormalizada,
      status: {
        not: "NA_LIXEIRA",
      },
    },
    select: {
      id: true,
      custoBase: true,
      margemAplicada: true,
      descontoAtivo: true,
      precoPromocional: true,
    },
  });

  for (const produto of produtos) {
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

export async function criarRegraCategoria(formData: FormData) {
  const categoriaId = String(formData.get("categoriaId") || "").trim();
  const itemAdicionalId = String(formData.get("itemAdicionalId") || "").trim();
  const quantidade = Number(formData.get("quantidade") || 0);

  if (!categoriaId) {
    throw new Error("Categoria é obrigatória.");
  }

  if (!itemAdicionalId) {
    throw new Error("Item adicional é obrigatório.");
  }

  if (quantidade <= 0) {
    throw new Error("Quantidade deve ser maior que zero.");
  }

  const categoria = await prisma.categoriaProduto.findUnique({
    where: {
      id: categoriaId,
    },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!categoria) {
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

  const regraExistente = await prisma.regraCategoria.findFirst({
    where: {
      categoria: categoria.nome,
      itemAdicionalId,
    },
    select: {
      id: true,
    },
  });

  if (regraExistente) {
    await prisma.regraCategoria.update({
      where: {
        id: regraExistente.id,
      },
      data: {
        quantidade,
      },
    });
  } else {
    await prisma.regraCategoria.create({
      data: {
        categoria: categoria.nome,
        itemAdicionalId,
        quantidade,
      },
    });
  }

  await recalcularProdutosDaCategoria(categoria.nome);

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}

export async function excluirRegraCategoria(id: string) {
  const regra = await prisma.regraCategoria.findUnique({
    where: { id },
    select: {
      id: true,
      categoria: true,
    },
  });

  if (!regra) {
    throw new Error("Regra não encontrada.");
  }

  await prisma.regraCategoria.delete({
    where: { id },
  });

  await recalcularProdutosDaCategoria(regra.categoria);

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}

export async function recalcularTodosProdutosPelasRegras() {
  const categoriasProdutos = await prisma.produto.findMany({
    where: {
      status: {
        not: "NA_LIXEIRA",
      },
    },
    select: {
      categoria: true,
    },
    distinct: ["categoria"],
  });

  for (const categoria of categoriasProdutos) {
    await recalcularProdutosDaCategoria(categoria.categoria);
  }

  revalidatePath("/regras-categoria");
  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}