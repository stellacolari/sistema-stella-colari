import type { Metadata } from "next";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";

export const metadata: Metadata = {
  title: "Respostas de formulários | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function FormulariosPage() {
return (
  <main className="space-y-6">
    <LojaConfigHeader
      title="Leads e formulários"
      description="Acompanhe respostas recebidas em páginas, campanhas, CTAs e formulários do builder."
    />

    {/* mantenha aqui o componente atual da página */}
  </main>
);
}
