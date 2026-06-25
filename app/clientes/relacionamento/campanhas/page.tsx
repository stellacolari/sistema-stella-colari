import type { Metadata } from "next";
import CrmWhatsappRascunhoClient from "@/components/clientes/CrmWhatsappRascunhoClient";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { obterRascunhoWhatsappClientes } from "@/lib/clientes/crm-whatsapp-rascunho";

export const metadata: Metadata = {
  title: "Rascunho WhatsApp CRM | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    segmento?: string;
    finalidade?: string;
    preset?: string;
    ticketMinimo?: string;
    mensagem?: string;
  }>;
};

export default async function CampanhasRelacionamentoClientesPage({
  searchParams,
}: PageProps) {
  await exigirAdminComPermissao("clientes", "ver");

  const params = await searchParams;
  const dados = await obterRascunhoWhatsappClientes(params);

  return <CrmWhatsappRascunhoClient dados={dados} />;
}
