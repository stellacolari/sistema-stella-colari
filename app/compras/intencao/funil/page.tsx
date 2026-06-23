import type { Metadata } from "next";
import FunilAnalyticsLoja from "@/components/analytics/FunilAnalyticsLoja";
import {
  montarFunilAnalyticsLoja,
  normalizarPeriodoFunilLoja,
} from "@/lib/analytics/funil-loja";
import { exigirAdminComPermissao } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Funil da Loja | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    dias?: string;
  }>;
};

export default async function FunilLojaPage({ searchParams }: PageProps) {
  await exigirAdminComPermissao("intencaoComercial", "ver");

  const params = await searchParams;
  const dias = normalizarPeriodoFunilLoja(params.dias);
  const dados = await montarFunilAnalyticsLoja({ dias });

  return <FunilAnalyticsLoja dados={dados} />;
}
