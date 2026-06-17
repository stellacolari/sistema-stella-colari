import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  analisarPrecificacaoProdutos,
  serializarAnalisePrecificacao,
} from "@/lib/financeiro/precificacao-inteligente";
import PrecificacaoInteligenteClient from "@/components/compras/PrecificacaoInteligenteClient";

export const metadata: Metadata = {
  title: "Precificacao e Descontos | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function PrecificacaoPage() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    redirect("/vendas/nova-v2");
  }

  const analise = await analisarPrecificacaoProdutos();

  return (
    <PrecificacaoInteligenteClient
      produtos={analise.produtos.map(serializarAnalisePrecificacao)}
      resumo={analise.resumo}
      faseEmpresa={analise.faseEmpresa}
      faseLabel={analise.faseLabel}
      confiancaAnalise={analise.confiancaAnalise}
    />
  );
}
