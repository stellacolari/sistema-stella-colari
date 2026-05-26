import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ProdutosCanaisClient, {
  type ProdutoCanalItem,
  type ProdutoCanalProdutoOption,
} from "@/components/configuracoes/integracoes/ProdutosCanaisClient";

export const metadata: Metadata = {
  title: "Produtos por canal | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function ProdutosCanaisPage() {
  const [produtosRaw, vinculosRaw] = await Promise.all([
    prisma.produto.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        codigoInterno: true,
        nome: true,
        imagemUrl: true,
        precoVenda: true,
        ativo: true,
      },
    }),

    prisma.produtoCanal.findMany({
      orderBy: [{ canal: "asc" }, { criadoEm: "desc" }],
      include: {
        produto: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            imagemUrl: true,
            precoVenda: true,
            ativo: true,
          },
        },
      },
    }),
  ]);

  const produtos: ProdutoCanalProdutoOption[] = produtosRaw.map((produto) => ({
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    nome: produto.nome,
    imagemUrl: produto.imagemUrl,
    precoVenda: Number(produto.precoVenda || 0),
    ativo: produto.ativo,
  }));

  const vinculos: ProdutoCanalItem[] = vinculosRaw.map((vinculo) => ({
    id: vinculo.id,
    produtoId: vinculo.produtoId,
    canal: vinculo.canal,
    skuExterno: vinculo.skuExterno,
    produtoExternoId: vinculo.produtoExternoId,
    variacaoExternaId: vinculo.variacaoExternaId,
    tituloExterno: vinculo.tituloExterno,
    precoCanal:
      vinculo.precoCanal === null || vinculo.precoCanal === undefined
        ? null
        : Number(vinculo.precoCanal),
    estoqueAnunciado: vinculo.estoqueAnunciado,
    sincronizarEstoque: vinculo.sincronizarEstoque,
    sincronizarPreco: vinculo.sincronizarPreco,
    ativo: vinculo.ativo,
    ultimaSincronizacaoEm: vinculo.ultimaSincronizacaoEm
      ? vinculo.ultimaSincronizacaoEm.toISOString()
      : null,
    criadoEm: vinculo.criadoEm.toISOString(),
    produto: {
      id: vinculo.produto.id,
      codigoInterno: vinculo.produto.codigoInterno,
      nome: vinculo.produto.nome,
      imagemUrl: vinculo.produto.imagemUrl,
      precoVenda: Number(vinculo.produto.precoVenda || 0),
      ativo: vinculo.produto.ativo,
    },
  }));

  return (
    <main className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/configuracoes/integracoes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para integrações
            </Link>

            <p className="mt-5 text-sm font-medium uppercase tracking-wide text-slate-500">
              Integrações
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Produtos por canal
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Vincule SKUs e IDs externos de marketplaces aos produtos internos
              do Stella. Essa base será usada para importar pedidos, baixar
              estoque e sincronizar anúncios futuramente.
            </p>
          </div>
        </div>
      </section>

      <ProdutosCanaisClient produtos={produtos} vinculos={vinculos} />
    </main>
  );
}