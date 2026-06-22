import type { Metadata } from "next";
import LegalPageShell from "@/app/loja/legal-page-shell";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Trocas e Devolucoes | Stella Colari",
  description:
    "Orientacoes gerais sobre troca e devolucao na loja Stella Colari.",
  path: "/loja/trocas-e-devolucoes",
});

export default function TrocasEDevolucoesPage() {
  return (
    <LegalPageShell
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
