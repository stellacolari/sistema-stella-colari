import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ItensAdicionaisCatalogClient from "@/components/itens-adicionais/ItensAdicionaisCatalogClient";

export const dynamic = "force-dynamic";

type ItemAdicionalComRelacoes = Prisma.ItemAdicionalGetPayload<{
  include: {
    estoque: true;
    regrasCategoria: {
      select: {
        id: true;
      };
    };
  };
}>;

export default async function ItensAdicionaisPage() {
  const itensRaw = await prisma.itemAdicional.findMany({
    orderBy: { nome: "asc" },
    include: {
      estoque: true,
      regrasCategoria: {
        select: {
          id: true,
        },
      },
    },
  });

  const itens = itensRaw.map((item: ItemAdicionalComRelacoes) => ({
    id: item.id,
    codigoInterno: item.codigoInterno,
    codigoFornecedor: item.codigoFornecedor || "",
    nome: item.nome,
    imagemUrl: item.imagemUrl,
    fornecedorPadrao: item.fornecedorPadrao,
    custoBase: Number(item.custoBase),
    ativo: item.ativo,
    status: item.status || (item.ativo ? "ATIVO" : "INATIVO"),
    statusAntesLixeira: item.statusAntesLixeira,
    linkCompra: item.linkCompra,
    estoqueAtual: item.estoque?.quantidadeAtual ?? 0,
    valorEstoque: Number(item.estoque?.valorAcumulado ?? 0),
    totalRegras: item.regrasCategoria.length,
  }));

  return <ItensAdicionaisCatalogClient itens={itens} />;
}