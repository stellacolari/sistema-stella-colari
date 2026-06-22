import type { Metadata } from "next";
import LegalPageShell from "@/app/loja/legal-page-shell";
import { criarMetadataLoja } from "@/lib/loja/seo";

export const metadata: Metadata = criarMetadataLoja({
  title: "Politica de Privacidade | Stella Colari",
  description:
    "Resumo sobre tratamento de dados na loja online Stella Colari.",
  path: "/loja/politica-de-privacidade",
});

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPageShell
      title="Politica de Privacidade"
      description="Esta pagina resume como os dados informados na loja online podem ser utilizados para atendimento, compra e relacionamento."
      sections={[
        {
          title: "Dados coletados",
          paragraphs: [
            "A loja pode solicitar dados como nome, telefone, e-mail, documento e endereco para cadastro, atendimento, entrega e acompanhamento de pedidos.",
            "Tambem podem ser registrados dados de navegacao e interacao para melhorar a experiencia da loja e a seguranca da operacao.",
          ],
        },
        {
          title: "Uso das informacoes",
          paragraphs: [
            "Os dados podem ser usados para processar pedidos, confirmar pagamentos, organizar entregas, prestar suporte e cumprir obrigacoes legais aplicaveis.",
            "A Stella Colari deve revisar os canais oficiais de contato e os provedores usados antes da publicacao final desta politica.",
          ],
        },
        {
          title: "Seguranca e revisao",
          paragraphs: [
            "As informacoes devem ser tratadas com cuidado e acesso restrito aos processos necessarios para operacao da loja.",
            "Solicitacoes sobre dados pessoais devem ser direcionadas aos canais oficiais publicados pela marca.",
          ],
        },
      ]}
    />
  );
}
