import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  listarCampanhasComerciais,
  obterResumoCampanhasComerciais,
  serializarCampanhaComercial,
} from "@/lib/loja/campanhas-comerciais";
import {
  analisarPrecificacaoProdutos,
  serializarAnalisePrecificacao,
} from "@/lib/financeiro/precificacao-inteligente";
import CampanhasComerciaisClient from "@/components/compras/CampanhasComerciaisClient";

export const metadata: Metadata = {
  title: "Campanhas Comerciais | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
  }>;
};

export default async function CampanhasComerciaisPage({
  searchParams,
}: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const params = await searchParams;
  const [campanhas, resumo, precificacao, vitrines] = await Promise.all([
    listarCampanhasComerciais({
      status: params.status && params.status !== "TODOS" ? params.status : undefined,
      tipo: params.tipo && params.tipo !== "TODOS" ? params.tipo : undefined,
      take: 200,
    }),
    obterResumoCampanhasComerciais(),
    analisarPrecificacaoProdutos(),
    prisma.vitrineInteligenteSugestao.findMany({
      where: {
        status: {
          in: ["SUGERIDA", "EM_REVISAO", "APLICADA_COMO_RASCUNHO"],
        },
        campanhaId: {
          not: null,
        },
      },
      select: {
        id: true,
        campanhaId: true,
        status: true,
        titulo: true,
      },
    }),
  ]);

  return (
    <CampanhasComerciaisClient
      campanhas={campanhas.map(serializarCampanhaComercial)}
      resumo={resumo}
      precificacoes={precificacao.produtos.map(serializarAnalisePrecificacao)}
      vitrines={vitrines}
      filtroInicial={{
        status: params.status,
        tipo: params.tipo,
      }}
    />
  );
}
