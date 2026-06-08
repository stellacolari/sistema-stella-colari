import { prisma } from "@/lib/prisma";
import { regraAplicaACategoria } from "@/lib/regras-categoria";

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export async function calcularCustoAdicionaisPorCategoria(categoria: string) {
  const categoriaNormalizada = String(categoria || "").trim();

  if (!categoriaNormalizada) {
    return 0;
  }

  const regras = await prisma.regraCategoria.findMany({
    include: {
      itemAdicional: {
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  const custoAdicionais = regras.reduce((total, regra) => {
    if (!regraAplicaACategoria(regra, categoriaNormalizada)) {
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

export async function calcularPrecoVendaProduto({
  custoBase,
  margemAplicada,
  categoria,
}: {
  custoBase: number;
  margemAplicada: number;
  categoria: string;
}) {
  const custo = Number(custoBase || 0);
  const margem = Number(margemAplicada || 0);
  const custoAdicionais = await calcularCustoAdicionaisPorCategoria(categoria);

  const precoVenda = arredondarMoeda(custo * margem + custoAdicionais);

  return {
    custoBase: arredondarMoeda(custo),
    margemAplicada: margem,
    custoAdicionais,
    precoVenda,
  };
}
