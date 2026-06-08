import type { Metadata } from "next";
import LojaConfigHeader from "@/components/configuracoes/loja/LojaConfigHeader";
import FreteConfiguracaoClient, {
  type FreteConfiguracao,
} from "@/components/configuracoes/loja/FreteConfiguracaoClient";
import { buscarConfiguracaoFrete } from "@/lib/frete/configuracao";

export const metadata: Metadata = {
  title: "Frete e entrega | Sistema Stella",
};

export const dynamic = "force-dynamic";

export default async function FreteConfiguracaoPage() {
  const configRaw = await buscarConfiguracaoFrete();

  const config: FreteConfiguracao = {
    provedor: configRaw.provedor,
    ambiente: configRaw.ambiente,
    cepOrigem: configRaw.cepOrigem,
    userAgent: configRaw.userAgent,
    pesoFallbackKg: configRaw.pesoFallbackKg,
    alturaFallbackCm: configRaw.alturaFallbackCm,
    larguraFallbackCm: configRaw.larguraFallbackCm,
    comprimentoFallbackCm: configRaw.comprimentoFallbackCm,
    prazoAdicionalDias: configRaw.prazoAdicionalDias,
    valorAdicional: configRaw.valorAdicional,
    retiradaLocalHabilitada: configRaw.retiradaLocalHabilitada,
    retiradaLocalTexto: configRaw.retiradaLocalTexto,
    melhorEnvioTokenConfigurado: configRaw.melhorEnvioTokenConfigurado,
  };

  return (
    <main className="space-y-6">
      <LojaConfigHeader
        title="Frete e entrega"
        description="Configure provedor logístico, origem de envio, fallback de pacote, ajustes de prazo/valor e retirada local."
      />

      <FreteConfiguracaoClient config={config} />
    </main>
  );
}

