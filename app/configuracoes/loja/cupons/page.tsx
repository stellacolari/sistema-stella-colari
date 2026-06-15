import type { Metadata } from "next";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";

export const metadata: Metadata = {
  title: "Cupons | Plataforma Stella Colari",
};

export const dynamic = "force-dynamic";

export default async function CuponsLojaPage() {
return (
  <main className="space-y-6">
    <LojaConfigHeader
      title="Cupons"
      description="Configure códigos promocionais, regras de desconto, validade, uso máximo e impacto no cashback."
    />

    {/* mantenha aqui o componente atual da página */}
  </main>
);
}
