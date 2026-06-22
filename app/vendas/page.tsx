import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VendasListClient, {
  type VendaListItem,
} from "@/components/vendas/VendasListClient";
import {
  exigirAdminComPermissao,
  usuarioPodeVerDadosFinanceirosAdmin,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type VendaComRelacoes = Prisma.VendaGetPayload<{
  include: {
    cliente: true;
    itens: {
      include: {
        produto: true;
      };
    };
  };
}>;

export default async function VendasPage() {
  const usuario = await exigirAdminComPermissao("vendas", "ver");
  const podeVerDadosFinanceiros =
    usuarioPodeVerDadosFinanceirosAdmin(usuario);

  const vendasRaw = await prisma.venda.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      cliente: true,
      itens: {
        include: {
          produto: true,
        },
      },
    },
  });

  const vendas: VendaListItem[] = vendasRaw.map((venda: VendaComRelacoes) => {
    const produtosVendidos = venda.itens.map((item) => ({
      id: item.id,
      codigo: item.codigoDigitado,
      nome: item.descricao,
      quantidade: item.quantidade,
      tamanhoAnel: item.tamanhoAnel,
      valorUnitarioBase: Number(item.valorUnitarioBase),
      valorUnitarioFinal: Number(item.valorUnitarioFinal),
      valorTotal: Number(item.valorTotal),
      gastoProduto: podeVerDadosFinanceiros ? Number(item.gastoProduto) : 0,
      gastoAdicionais: podeVerDadosFinanceiros
        ? Number(item.gastoAdicionais)
        : 0,
      lucroTotal: podeVerDadosFinanceiros ? Number(item.lucroTotal) : 0,
      categoria: item.produto?.categoria ?? null,
    }));

    const quantidadeItens = venda.itens.reduce(
      (total: number, item) => total + item.quantidade,
      0
    );

    return {
      id: venda.id,
      codigo: venda.codigo,
      clienteNome: venda.cliente.nome,
      clienteDocumento: venda.cliente.documento,
      clienteTelefone: venda.cliente.telefone,
      clienteEmail: venda.cliente.email,
      meioVenda: venda.meioVenda,
      itensTotais: venda.itens.length,
      quantidadeItens,
      produtosVendidos,
      valorTotal: Number(venda.valorTotal),
      gastoTotal: podeVerDadosFinanceiros ? Number(venda.gastoTotal) : 0,
      lucroTotal: podeVerDadosFinanceiros ? Number(venda.lucroTotal) : 0,
      descontoPercentual: Number(venda.descontoPercentual),
      status: venda.status,
      observacoes: venda.observacoes,
      criadoEm: venda.criadoEm.toISOString(),
      cancelamentoMotivo: venda.cancelamentoMotivo,
      cancelamentoObservacao: venda.cancelamentoObservacao,
      canceladoEm: venda.canceladoEm ? venda.canceladoEm.toISOString() : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Vendas
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Lista de Vendas
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Consulte os pedidos de venda, acompanhe status e abra o resumo
              detalhado de cada operação.
            </p>
          </div>

          <Link
            href="/vendas/nova-v2"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Nova venda
          </Link>
        </div>
      </div>

      <VendasListClient
        vendas={vendas}
        podeVerDadosFinanceiros={podeVerDadosFinanceiros}
      />
    </div>
  );
}
