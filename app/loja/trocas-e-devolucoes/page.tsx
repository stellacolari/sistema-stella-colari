import type { Metadata } from "next";
import LegalPageShell, { gerarMetadataLegalGerenciada } from "@/app/loja/legal-page-shell";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return gerarMetadataLegalGerenciada({
    slug: "trocas-e-devolucoes",
    title: "Trocas e Devoluções | Stella Colari",
    description: "Orientações gerais sobre troca e devolução na loja Stella Colari.",
  });
}

export default function TrocasEDevolucoesPage() {
  return (
    <LegalPageShell
      slug="trocas-e-devolucoes"
      title="Trocas e Devolucoes"
      description="As orientacoes abaixo ajudam a entender como solicitar analise de troca ou devolucao de uma compra feita na loja online."
      sections={[
        {
          title: "Solicitacao",
          paragraphs: [
            "A cliente deve entrar em contato pelos canais oficiais da Stella Colari, informando o codigo do pedido e o motivo da solicitacao.",
            "A analise pode considerar estado da peca, embalagem, comprovantes, prazos aplicaveis e dados do pedido.",
          ],
        },
        {
          title: "Condicoes gerais",
          paragraphs: [
            "Produtos personalizados, usados ou com sinais de mau uso podem exigir avaliacao especifica antes de qualquer conclusao.",
            "As condicoes finais de troca e devolucao devem ser revisadas pela loja antes da publicacao oficial.",
          ],
        },
        {
          title: "Acompanhamento",
          paragraphs: [
            "Depois da solicitacao, a equipe orientara os proximos passos conforme o caso e os canais de atendimento disponiveis.",
            "Nao envie produtos antes de receber orientacao oficial da loja.",
          ],
        },
      ]}
    />
  );
}
