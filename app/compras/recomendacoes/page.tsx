import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  exigirAdmin,
  usuarioPodeVerDadosFinanceirosAdmin,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import { montarCopilotoAdministrativo } from "@/lib/financeiro/copiloto-administrativo";
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

  if (!usuarioTemPermissaoAdmin(usuario, "recomendacoes", "ver")) {
    redirect("/vendas/nova-v2");
  }

  const params = await searchParams;
  const permissoes = {
    podeVerDadosFinanceiros: usuarioPodeVerDadosFinanceirosAdmin(usuario),
    podeEditarRecomendacoes: usuarioTemPermissaoAdmin(
      usuario,
      "recomendacoes",
      "editar"
    ),
    podeExecutarRecomendacoes: usuarioTemPermissaoAdmin(
      usuario,
      "recomendacoes",
      "executar"
    ),
    podeVerCampanhas: usuarioTemPermissaoAdmin(usuario, "campanhas", "ver"),
    podeExecutarCampanhas: usuarioTemPermissaoAdmin(
      usuario,
      "campanhas",
      "executar"
    ),
    podeVerProdutos: usuarioTemPermissaoAdmin(usuario, "produtos", "ver"),
    podeVerPedidos: usuarioTemPermissaoAdmin(usuario, "pedidos", "ver"),
    podeVerClientes: usuarioTemPermissaoAdmin(usuario, "clientes", "ver"),
    podeVerIntencao: usuarioTemPermissaoAdmin(usuario, "intencaoComercial", "ver"),
    podeVerPrecificacao: usuarioTemPermissaoAdmin(usuario, "precificacao", "ver"),
    podeVerFinanceiro: usuarioTemPermissaoAdmin(usuario, "financeiro", "ver"),
    podeVerResultado: usuarioTemPermissaoAdmin(usuario, "resultado", "ver"),
    podeVerLoja: usuarioTemPermissaoAdmin(usuario, "lojaOnline", "ver"),
  };
  const [recomendacoes, resumo, vitrines] = await Promise.all([
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
    prisma.vitrineInteligenteSugestao.findMany({
      where: {
        status: {
          in: ["SUGERIDA", "EM_REVISAO", "APLICADA_COMO_RASCUNHO"],
        },
        recomendacaoId: {
          not: null,
        },
      },
      select: {
        id: true,
        recomendacaoId: true,
        status: true,
        titulo: true,
      },
    }),
  ]);
  const recomendacoesSerializadas = recomendacoes.map(
    serializarRecomendacaoGerencial
  );
  const copiloto = montarCopilotoAdministrativo(
    recomendacoesSerializadas,
    permissoes
  );

  return (
    <RecomendacoesGerenciaisClient
      recomendacoes={copiloto.recomendacoes}
      resumo={resumo}
      tipos={filtrarTiposUnicos(recomendacoes)}
      copiloto={copiloto}
      permissoes={permissoes}
      vitrines={vitrines}
      filtroInicial={{
        status: params.status,
        tipo: params.tipo,
        prioridade: params.prioridade,
        produtoId: params.produtoId,
      }}
    />
  );
}
