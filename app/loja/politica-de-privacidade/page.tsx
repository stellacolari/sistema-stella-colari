import type { Metadata } from "next";
import LegalPageShell, { gerarMetadataLegalGerenciada } from "@/app/loja/legal-page-shell";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return gerarMetadataLegalGerenciada({
    slug: "politica-de-privacidade",
    title: "Política de Privacidade | Stella Colari",
    description: "Resumo sobre tratamento de dados na loja online Stella Colari.",
  });
}

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPageShell
      slug="politica-de-privacidade"
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
            "Quando voce autoriza expressamente, a loja pode usar o WhatsApp informado para relacionamento, novidades, ofertas e recomendacoes. A autorizacao e opcional e pode ser revogada na area Minha conta.",
            "A Stella Colari deve revisar os canais oficiais de contato e os provedores usados antes da publicacao final desta politica.",
          ],
        },
        {
          title: "Cookies, armazenamento local e preferencias",
          paragraphs: [
            "A loja usa recursos essenciais para manter carrinho, login, seguranca e funcionamento do checkout. Esses recursos sao necessarios para a experiencia de compra.",
            "Com a sua escolha, a loja tambem pode registrar sinais de analytics, como busca, produto visualizado, favoritos, carrinho e inicio de checkout, sempre com metadata limitada e sem incluir dados sensiveis como telefone, e-mail, documento ou endereco.",
            "Favoritos, buscas recentes e preferencias de privacidade podem ser salvos no navegador do visitante. Voce pode revisar as preferencias pelo link no rodape da loja.",
            "Preferencias de relacionamento informadas em cadastro, checkout, Minha conta ou atendimento podem ser registradas por canal e finalidade, com possibilidade de revogacao.",
            "A falta de consentimento registrado nao autoriza campanhas de WhatsApp. Desmarcar a opcao no cadastro ou no checkout nao revoga uma autorizacao anterior; a revogacao deve ser feita de forma explicita.",
            "Recursos de marketing e CRM podem ser evoluidos futuramente, mas nao disparam automacoes nesta versao de preparacao.",
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
