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
      title="Política de Privacidade"
      description="Esta página resume como os dados informados na loja online podem ser utilizados para atendimento, compra e relacionamento."
      sections={[
        {
          title: "Dados coletados",
          paragraphs: [
            "A loja pode solicitar dados como nome, telefone, e-mail, documento e endereço para cadastro, atendimento, entrega e acompanhamento de pedidos.",
            "Também podem ser registrados dados de navegação e interação para melhorar a experiência da loja e a segurança da operação.",
          ],
        },
        {
          title: "Uso das informações",
          paragraphs: [
            "Os dados podem ser usados para processar pedidos, confirmar pagamentos, organizar entregas, prestar suporte e cumprir obrigações legais aplicáveis.",
            "Quando você autoriza expressamente, a loja pode usar o WhatsApp informado para relacionamento, novidades, ofertas e recomendações. A autorização é opcional e pode ser revogada na área Minha Conta.",
            "A Stella Colari deve revisar os canais oficiais de contato e os provedores usados antes da publicação final desta política.",
          ],
        },
        {
          title: "Cookies, armazenamento local e preferências",
          paragraphs: [
            "A loja usa recursos essenciais para manter carrinho, login, segurança e funcionamento do checkout. Esses recursos são necessários para a experiência de compra.",
            "Com a sua escolha, a loja também pode registrar sinais de analytics, como busca, produto visualizado, favoritos, carrinho e início de checkout, sempre com metadados limitados e sem incluir dados sensíveis como telefone, e-mail, documento ou endereço.",
            "Favoritos e buscas recentes somente são mantidos no navegador quando Personalização está autorizada. Você pode revisar ou revogar as preferências pelo link no rodapé da loja; a aplicação remove os dados opcionais locais das categorias rejeitadas.",
            "Preferências de relacionamento informadas em cadastro, checkout, Minha Conta ou atendimento podem ser registradas por canal e finalidade, com possibilidade de revogação.",
            "A falta de consentimento registrado não autoriza campanhas de WhatsApp. Desmarcar a opção no cadastro ou no checkout não revoga uma autorização anterior; a revogação deve ser feita de forma explícita.",
            "Nenhuma tecnologia de publicidade ou marketing comportamental está ativa nesta versão. Consulte também a Política de Cookies para o inventário técnico atual.",
          ],
        },
        {
          title: "Direitos, retenção e operadores",
          paragraphs: [
            "Solicitações de confirmação, acesso, correção, oposição, revogação ou eliminação devem passar por verificação de identidade e análise da finalidade aplicável. Alguns registros de pedido, pagamento, fraude, atendimento ou obrigação legal podem precisar ser preservados mesmo após uma solicitação.",
            "Stripe, Melhor Envio, ViaCEP, Vercel, Vercel Blob e o provedor de banco podem atuar nos fluxos técnicos necessários. Contratos, prazos de retenção e transferências internacionais desses operadores exigem revisão jurídica e operacional contínua.",
            "O canal oficial para exercício de direitos ainda precisa ser confirmado e publicado pela marca. Até essa confirmação, o processo não deve ser considerado juridicamente concluído.",
          ],
        },
        {
          title: "Segurança e revisão",
          paragraphs: [
            "As informações devem ser tratadas com cuidado e acesso restrito aos processos necessários para operação da loja.",
            "Esta página descreve controles técnicos e operacionais atuais, mas não representa declaração de conformidade jurídica integral. Bases legais, prazos, contratos e textos finais devem ser validados por assessoria jurídica.",
          ],
        },
      ]}
    />
  );
}
