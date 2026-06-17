import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  filtrarTiposUnicos,
  listarRecomendacoesGerenciais,
  obterResumoRecomendacoes,
  serializarRecomendacaoGerencial,
} from "@/lib/financeiro/recomendacoes-gerenciais";
import RecomendacoesGerenciaisClient from "@/components/compras/RecomendacoesGerenciaisClient";

export const metadata: Metadata = {
  title: "Recomendacoes Gerenciais | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    tipo?: string;
    prioridade?: string;
    produtoId?: string;
  }>;
};

export default async function RecomendacoesGerenciaisPage({
  searchParams,
}: PageProps) {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const params = await searchParams;
  const [recomendacoes, resumo] = await Promise.all([
    listarRecomendacoesGerenciais({
      status: params.status && params.status !== "TODOS" ? params.status : undefined,
      tipo: params.tipo && params.tipo !== "TODOS" ? params.tipo : undefined,
      prioridade:
        params.prioridade && params.prioridade !== "TODAS"
          ? params.prioridade
          : undefined,
      produtoId: params.produtoId || undefined,
      take: 200,
    }),
    obterResumoRecomendacoes(),
  ]);

  return (
    <RecomendacoesGerenciaisClient
      recomendacoes={recomendacoes.map(serializarRecomendacaoGerencial)}
      resumo={resumo}
      tipos={filtrarTiposUnicos(recomendacoes)}
      filtroInicial={{
        status: params.status,
        tipo: params.tipo,
        prioridade: params.prioridade,
        produtoId: params.produtoId,
      }}
    />
  );
}
