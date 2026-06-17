import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth/admin";
import {
  listarCampanhasComerciais,
  obterResumoCampanhasComerciais,
  serializarCampanhaComercial,
} from "@/lib/loja/campanhas-comerciais";
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
  const [campanhas, resumo] = await Promise.all([
    listarCampanhasComerciais({
      status: params.status && params.status !== "TODOS" ? params.status : undefined,
      tipo: params.tipo && params.tipo !== "TODOS" ? params.tipo : undefined,
      take: 200,
    }),
    obterResumoCampanhasComerciais(),
  ]);

  return (
    <CampanhasComerciaisClient
      campanhas={campanhas.map(serializarCampanhaComercial)}
      resumo={resumo}
      filtroInicial={{
        status: params.status,
        tipo: params.tipo,
      }}
    />
  );
}
