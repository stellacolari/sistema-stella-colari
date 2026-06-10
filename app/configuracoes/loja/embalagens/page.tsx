import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import EmbalagensConfigClient from "@/components/configuracoes/loja/EmbalagensConfigClient";
import { exigirAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Embalagens | Sistema Stella",
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
        title="Embalagens da loja"
        description="Modele classes, caixas, embalagem de presente, componentes consumidos e compatibilidades sem alterar checkout ou estoque."
      />

      <EmbalagensConfigClient dadosIniciais={dadosIniciais} />
    </main>
  );
}
