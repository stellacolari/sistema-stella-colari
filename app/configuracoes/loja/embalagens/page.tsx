import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import EmbalagensConfigClient from "@/components/configuracoes/loja/EmbalagensConfigClient";
import { exigirAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Embalagens | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function EmbalagensConfigPage() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/configuracoes/loja");
  }

  const [classes, modelos, itensAdicionais, categorias, produtos, configuracao] =
    await Promise.all([
      prisma.embalagemClasse.findMany({
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
      prisma.embalagemModelo.findMany({
        orderBy: [{ tipo: "asc" }, { prioridade: "desc" }, { nomeInterno: "asc" }],
        include: {
          componentes: {
            include: {
              itemAdicional: {
                select: {
                  id: true,
                  codigoInterno: true,
                  nome: true,
                  custoBase: true,
                },
              },
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          compatibilidades: {
            include: {
              classe: {
                select: {
                  nome: true,
                },
              },
              categoria: {
                select: {
                  nome: true,
                },
              },
              produto: {
                select: {
                  codigoInterno: true,
                  nome: true,
                },
              },
            },
            orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
          },
        },
      }),
      prisma.itemAdicional.findMany({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),
      prisma.categoriaProduto.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
      prisma.produto.findMany({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
        },
        orderBy: {
          nome: "asc",
        },
        take: 200,
      }),
      prisma.embalagemConfiguracao.upsert({
        where: {
          chave: "PADRAO",
        },
        update: {},
        create: {
          chave: "PADRAO",
        },
      }),
    ]);

  const dadosIniciais = {
    classes: classes.map((classe) => ({
      ...classe,
      criadoEm: undefined,
      atualizadoEm: undefined,
    })),
    modelos: modelos.map((modelo) => ({
      ...modelo,
      criadoEm: undefined,
      atualizadoEm: undefined,
      componentes: modelo.componentes.map((componente) => ({
        ...componente,
        criadoEm: undefined,
        atualizadoEm: undefined,
      })),
      compatibilidades: modelo.compatibilidades.map((compatibilidade) => ({
        ...compatibilidade,
        criadoEm: undefined,
        atualizadoEm: undefined,
      })),
    })),
    itensAdicionais,
    categorias,
    produtos,
    configuracao: {
      id: configuracao.id,
      estrategiaSelecao: configuracao.estrategiaSelecao,
      permitirMultiplosVolumes: configuracao.permitirMultiplosVolumes,
      maxCaixasInternasPorEnvio: configuracao.maxCaixasInternasPorEnvio,
    },
  };

  return (
    <main className="space-y-6">
      <LojaConfigHeader
        title="Embalagens"
        description="Modele consumo por pedido ou pacote: caixa padrão, caixa presente, embalagem externa, componentes e compatibilidades."
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-4xl text-sm leading-6 text-slate-600">
            Embalagens são o motor de consumo por pedido ou pacote. Elas usam
            itens adicionais como componentes, mas não substituem as regras por
            categoria, que continuam sendo consumo por produto ou unidade.
          </p>

          <Link
            href="/insumos-embalagens"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar para central
          </Link>
        </div>
      </section>

      <EmbalagensConfigClient dadosIniciais={dadosIniciais} />
    </main>
  );
}
