import "server-only";

import type { exigirAdmin } from "@/lib/auth/admin";
import {
  usuarioPodeVerDadosFinanceirosAdmin,
  usuarioTemPermissaoAdmin,
} from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import {
  listarNotificacoes,
  perfilNotificacaoUsuario,
} from "@/lib/notificacoes/notificacoes";

type UsuarioAdmin = Awaited<ReturnType<typeof exigirAdmin>>;

export type AreaAcaoAdmin =
  | "PEDIDOS"
  | "CATALOGO"
  | "CLIENTES"
  | "MARKETING"
  | "OPERACAO"
  | "FINANCEIRO"
  | "SISTEMA";

export type PrioridadeAcaoAdmin = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";

export type AcaoAdmin = {
  id: string;
  titulo: string;
  descricao: string;
  area: AreaAcaoAdmin;
  prioridade: PrioridadeAcaoAdmin;
  perfilAlvo: string[];
  href?: string;
  cta?: string;
  quantidade?: number;
  explicacao?: string;
};

export type ResumoCentralAcoesItem = {
  id: string;
  titulo: string;
  valor: number;
  descricao: string;
  href?: string;
  cta?: string;
  tom: "neutro" | "positivo" | "alerta" | "critico";
};

export type LinkRapidoCentralAcoes = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
};

export type CentralAcoesAdminData = {
  perfilAtual: string;
  podeVerDadosFinanceiros: boolean;
  resumo: ResumoCentralAcoesItem[];
  acoes: AcaoAdmin[];
  proximosPassos: LinkRapidoCentralAcoes[];
  linksRapidos: LinkRapidoCentralAcoes[];
};

type ModuloAdmin =
  | "pedidos"
  | "produtos"
  | "estoque"
  | "clientes"
  | "notificacoes"
  | "recomendacoes"
  | "campanhas"
  | "intencaoComercial"
  | "lojaOnline"
  | "relatorios"
  | "financeiro";

const PRIORIDADE_PESO: Record<PrioridadeAcaoAdmin, number> = {
  CRITICA: 4,
  ALTA: 3,
  MEDIA: 2,
  BAIXA: 1,
};

function usuarioPodeVerModulo(usuario: UsuarioAdmin, modulo: ModuloAdmin) {
  return usuarioTemPermissaoAdmin(usuario, modulo, "ver");
}

function escolherHref(
  usuario: UsuarioAdmin,
  candidatos: { href: string; modulo?: ModuloAdmin }[]
) {
  return candidatos.find((candidato) =>
    candidato.modulo ? usuarioPodeVerModulo(usuario, candidato.modulo) : true
  )?.href;
}

async function contarSe(
  podeConsultar: boolean,
  consulta: () => Promise<number>
) {
  if (!podeConsultar) {
    return 0;
  }

  return consulta();
}

function criarAcao(params: AcaoAdmin & { quantidade: number }): AcaoAdmin | null {
  if (params.quantidade <= 0) {
    return null;
  }

  return params;
}

function ordenarAcoes(acoes: AcaoAdmin[]) {
  return [...acoes].sort((a, b) => {
    const prioridade = PRIORIDADE_PESO[b.prioridade] - PRIORIDADE_PESO[a.prioridade];

    if (prioridade !== 0) {
      return prioridade;
    }

    return (b.quantidade ?? 0) - (a.quantidade ?? 0);
  });
}

function tomResumo(valor: number, critico = false): ResumoCentralAcoesItem["tom"] {
  if (valor <= 0) {
    return "positivo";
  }

  return critico ? "critico" : "alerta";
}

function filtrarLinksPermitidos(
  usuario: UsuarioAdmin,
  links: (LinkRapidoCentralAcoes & { modulo?: ModuloAdmin })[]
) {
  return links
    .filter((link) => !link.modulo || usuarioPodeVerModulo(usuario, link.modulo))
    .map(({ modulo: _modulo, ...link }) => link);
}

export async function montarCentralAcoesAdmin(
  usuario: UsuarioAdmin
): Promise<CentralAcoesAdminData> {
  const podeVerPedidos = usuarioPodeVerModulo(usuario, "pedidos");
  const podeVerProdutos = usuarioPodeVerModulo(usuario, "produtos");
  const podeVerEstoque = usuarioPodeVerModulo(usuario, "estoque");
  const podeVerClientes = usuarioPodeVerModulo(usuario, "clientes");
  const podeVerNotificacoes = usuarioPodeVerModulo(usuario, "notificacoes");
  const podeVerRecomendacoes = usuarioPodeVerModulo(usuario, "recomendacoes");
  const podeVerCampanhas = usuarioPodeVerModulo(usuario, "campanhas");
  const podeVerIntencao = usuarioPodeVerModulo(usuario, "intencaoComercial");
  const podeVerLoja = usuarioPodeVerModulo(usuario, "lojaOnline");
  const podeVerFinanceiro = usuarioPodeVerModulo(usuario, "financeiro");
  const podeVerDadosFinanceiros = usuarioPodeVerDadosFinanceirosAdmin(usuario);
  const podeVerCatalogo = podeVerProdutos || podeVerLoja;
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const perfilNotificacao = perfilNotificacaoUsuario(usuario);

  const [
    pedidosQuePrecisamAcao,
    pedidosPagosAguardandoPreparo,
    pedidosComProblema,
    enviosPendentes,
    retiradasPendentes,
    produtosSemImagem,
    produtosSemEstoque,
    categoriasVazias,
    recomendacoesAbertas,
    campanhasAbertas,
    buscasSemResultado,
    clientesRecorrentesSemAtualizacao,
    notificacoesVisiveis,
  ] = await Promise.all([
    contarSe(podeVerPedidos, () =>
      prisma.pedidoOnline.count({
        where: {
          status: {
            not: "CANCELADO",
          },
          OR: [
            {
              statusPagamento: "PAGO",
              status: {
                in: ["PEDIDO_RECEBIDO", "EM_SEPARACAO"],
              },
            },
            {
              status: {
                in: ["PROBLEMA", "PROBLEMA_OPERACIONAL"],
              },
            },
            {
              envio: {
                is: {
                  statusEnvio: {
                    in: ["PENDENTE", "EM_PREPARACAO", "AGUARDANDO_RETIRADA"],
                  },
                },
              },
            },
          ],
        },
      })
    ),
    contarSe(podeVerPedidos, () =>
      prisma.pedidoOnline.count({
        where: {
          statusPagamento: "PAGO",
          status: {
            in: ["PEDIDO_RECEBIDO", "EM_SEPARACAO"],
          },
        },
      })
    ),
    contarSe(podeVerPedidos, () =>
      prisma.pedidoOnline.count({
        where: {
          status: {
            in: ["PROBLEMA", "PROBLEMA_OPERACIONAL"],
          },
        },
      })
    ),
    contarSe(podeVerPedidos, () =>
      prisma.pedidoEnvio.count({
        where: {
          tipoEntrega: "ENTREGA",
          statusEnvio: {
            in: ["PENDENTE", "EM_PREPARACAO"],
          },
        },
      })
    ),
    contarSe(podeVerPedidos, () =>
      prisma.pedidoEnvio.count({
        where: {
          tipoEntrega: "RETIRADA",
          statusEnvio: "AGUARDANDO_RETIRADA",
        },
      })
    ),
    contarSe(podeVerCatalogo, () =>
      prisma.produto.count({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
          OR: [{ imagemUrl: null }, { imagemUrl: "" }],
        },
      })
    ),
    contarSe(podeVerEstoque || podeVerProdutos, () =>
      prisma.produto.count({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
          estoque: {
            none: {
              quantidadeAtual: {
                gt: 0,
              },
            },
          },
        },
      })
    ),
    contarSe(podeVerLoja || podeVerProdutos, () =>
      prisma.categoriaProduto.count({
        where: {
          ativo: true,
          exibirNoMenu: true,
          produtos: {
            none: {
              produto: {
                ativo: true,
                status: {
                  not: "NA_LIXEIRA",
                },
              },
            },
          },
        },
      })
    ),
    contarSe(podeVerRecomendacoes, () =>
      prisma.recomendacaoGerencial.count({
        where: {
          status: {
            in: ["NOVA", "ACEITA", "EM_EXECUCAO", "ADIADA"],
          },
        },
      })
    ),
    contarSe(podeVerCampanhas, () =>
      prisma.campanhaComercial.count({
        where: {
          status: {
            in: ["RASCUNHO", "PLANEJADA", "EM_EXECUCAO"],
          },
        },
      })
    ),
    contarSe(podeVerIntencao || podeVerLoja, () =>
      prisma.eventoComercial.count({
        where: {
          tipo: "BUSCA_SEM_RESULTADO",
          criadoEm: {
            gte: trintaDiasAtras,
          },
        },
      })
    ),
    contarSe(podeVerClientes, () =>
      prisma.cliente.count({
        where: {
          status: "RECORRENTE",
          atualizadoEm: {
            lt: trintaDiasAtras,
          },
        },
      })
    ),
    podeVerNotificacoes
      ? listarNotificacoes({
          usuarioId: usuario.id,
          perfil: perfilNotificacao,
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  const alertasCriticos = notificacoesVisiveis.filter(
    (notificacao) =>
      notificacao.status === "NOVA" && notificacao.prioridade === "CRITICA"
  ).length;

  const hrefPedidos = escolherHref(usuario, [
    { href: "/pedidos", modulo: "pedidos" },
  ]);
  const hrefProdutos = escolherHref(usuario, [
    { href: "/produtos", modulo: "produtos" },
    { href: "/configuracoes/loja", modulo: "lojaOnline" },
  ]);
  const hrefCategorias = escolherHref(usuario, [
    { href: "/configuracoes/loja/categorias", modulo: "lojaOnline" },
    { href: "/produtos", modulo: "produtos" },
  ]);
  const hrefRecomendacoes = escolherHref(usuario, [
    { href: "/compras/recomendacoes", modulo: "recomendacoes" },
  ]);
  const hrefCampanhas = escolherHref(usuario, [
    { href: "/compras/campanhas", modulo: "campanhas" },
  ]);
  const hrefIntencao = escolherHref(usuario, [
    { href: "/compras/intencao", modulo: "intencaoComercial" },
    { href: "/configuracoes/loja", modulo: "lojaOnline" },
  ]);
  const hrefClientes = escolherHref(usuario, [
    { href: "/clientes", modulo: "clientes" },
  ]);
  const hrefNotificacoes = escolherHref(usuario, [
    { href: "/notificacoes", modulo: "notificacoes" },
  ]);

  const acoes = ordenarAcoes(
    [
      criarAcao({
        id: "pedidos-com-problema",
        titulo: "Ha pedidos com problema.",
        descricao:
          "Revise os pedidos sinalizados antes de seguir com preparo, envio ou atendimento.",
        area: "PEDIDOS",
        prioridade: "CRITICA",
        perfilAlvo: ["ADMIN_GERAL", "OPERACAO_PEDIDOS"],
        href: hrefPedidos,
        cta: "Abrir pedidos",
        quantidade: pedidosComProblema,
        explicacao: "Pedidos em status de problema operacional pedem decisao manual.",
      }),
      criarAcao({
        id: "pedidos-pagos-preparo",
        titulo: "Ha pedidos pagos aguardando preparo.",
        descricao:
          "Comece pelos pedidos pagos que ainda estao recebidos ou em separacao.",
        area: "OPERACAO",
        prioridade: "CRITICA",
        perfilAlvo: ["ADMIN_GERAL", "OPERACAO_PEDIDOS", "VENDEDOR"],
        href: hrefPedidos,
        cta: "Separar pedidos",
        quantidade: pedidosPagosAguardandoPreparo,
        explicacao: "Pedido pago parado aumenta risco de atraso e contato do cliente.",
      }),
      criarAcao({
        id: "envios-pendentes",
        titulo: "Ha envios pendentes de preparo.",
        descricao:
          "Confira entregas que ainda precisam de preparo, etiqueta ou proximo passo logistico.",
        area: "OPERACAO",
        prioridade: "ALTA",
        perfilAlvo: ["ADMIN_GERAL", "OPERACAO_PEDIDOS"],
        href: hrefPedidos,
        cta: "Ver envios",
        quantidade: enviosPendentes,
        explicacao: "Envios pendentes podem travar a promessa de prazo da loja.",
      }),
      criarAcao({
        id: "retiradas-pendentes",
        titulo: "Ha retiradas locais aguardando cliente.",
        descricao:
          "Verifique pedidos de retirada para manter atendimento e comunicacao em dia.",
        area: "OPERACAO",
        prioridade: "ALTA",
        perfilAlvo: ["ADMIN_GERAL", "OPERACAO_PEDIDOS", "VENDEDOR"],
        href: hrefPedidos,
        cta: "Ver retiradas",
        quantidade: retiradasPendentes,
        explicacao: "Retirada parada precisa de acompanhamento simples e rapido.",
      }),
      criarAcao({
        id: "produtos-sem-imagem",
        titulo: "Ha produtos publicos sem imagem.",
        descricao:
          "Revise os produtos ativos sem foto principal antes de campanhas ou destaque na loja.",
        area: "CATALOGO",
        prioridade: "ALTA",
        perfilAlvo: ["ADMIN_GERAL", "MARKETING_LOJA", "ESTOQUE_REPOSICAO"],
        href: hrefProdutos,
        cta: "Revisar produtos",
        quantidade: produtosSemImagem,
        explicacao: "Produto sem imagem reduz confianca e conversao na loja publica.",
      }),
      criarAcao({
        id: "produtos-sem-estoque",
        titulo: "Ha produtos ativos sem estoque disponivel.",
        descricao:
          "Confira produtos ativos sem saldo positivo antes de divulgar ou montar vitrines.",
        area: "CATALOGO",
        prioridade: "ALTA",
        perfilAlvo: ["ADMIN_GERAL", "ESTOQUE_REPOSICAO", "MARKETING_LOJA"],
        href: hrefProdutos,
        cta: "Ver catalogo",
        quantidade: produtosSemEstoque,
        explicacao: "Produto ativo sem estoque pode gerar frustracao ou vitrine fraca.",
      }),
      criarAcao({
        id: "categorias-vazias",
        titulo: "Ha categorias do menu sem produtos ativos.",
        descricao:
          "Categorias vazias devem ser preenchidas, ocultadas ou revisadas antes de destaque.",
        area: "MARKETING",
        prioridade: "MEDIA",
        perfilAlvo: ["ADMIN_GERAL", "MARKETING_LOJA"],
        href: hrefCategorias,
        cta: "Revisar categorias",
        quantidade: categoriasVazias,
        explicacao: "Categoria vazia cria caminho sem saida para o cliente.",
      }),
      criarAcao({
        id: "recomendacoes-abertas",
        titulo: "Ha recomendacoes gerenciais abertas.",
        descricao:
          "Veja sugestoes que ainda precisam de aceite, execucao ou conclusao.",
        area: "SISTEMA",
        prioridade: "MEDIA",
        perfilAlvo: ["ADMIN_GERAL", "FINANCEIRO", "MARKETING_LOJA"],
        href: hrefRecomendacoes,
        cta: "Abrir recomendacoes",
        quantidade: recomendacoesAbertas,
        explicacao: "Recomendacoes abertas acumulam oportunidades sem decisao.",
      }),
      criarAcao({
        id: "buscas-sem-resultado",
        titulo: "Ha buscas sem resultado na loja.",
        descricao:
          "Use os termos buscados para ajustar nomes, tags, categorias ou vitrine.",
        area: "MARKETING",
        prioridade: "MEDIA",
        perfilAlvo: ["ADMIN_GERAL", "MARKETING_LOJA"],
        href: hrefIntencao,
        cta: "Ver intencao",
        quantidade: buscasSemResultado,
        explicacao: "Busca sem resultado mostra demanda que a loja ainda nao respondeu.",
      }),
      criarAcao({
        id: "clientes-recorrentes-sem-atualizacao",
        titulo: "Ha clientes recorrentes sem atualizacao recente.",
        descricao:
          "Revise clientes recorrentes parados ha mais de 30 dias para planejar reativacao.",
        area: "CLIENTES",
        prioridade: "MEDIA",
        perfilAlvo: ["ADMIN_GERAL", "VENDEDOR"],
        href: hrefClientes,
        cta: "Abrir clientes",
        quantidade: clientesRecorrentesSemAtualizacao,
        explicacao: "Clientes recorrentes merecem acompanhamento antes de perder ritmo.",
      }),
      criarAcao({
        id: "notificacoes-criticas",
        titulo: "Ha alertas criticos na caixa de entrada.",
        descricao:
          "Resolva primeiro as notificacoes criticas ainda novas para reduzir risco operacional.",
        area: "SISTEMA",
        prioridade: "CRITICA",
        perfilAlvo: ["ADMIN_GERAL", "OPERACAO_PEDIDOS", "VENDEDOR"],
        href: hrefNotificacoes,
        cta: "Abrir caixa",
        quantidade: alertasCriticos,
        explicacao: "Alertas criticos concentram os sinais mais urgentes do sistema.",
      }),
      criarAcao({
        id: "campanhas-abertas",
        titulo: "Ha campanhas comerciais abertas.",
        descricao:
          "Revise rascunhos e campanhas em andamento para manter a comunicacao alinhada.",
        area: "MARKETING",
        prioridade: "BAIXA",
        perfilAlvo: ["ADMIN_GERAL", "MARKETING_LOJA"],
        href: hrefCampanhas,
        cta: "Ver campanhas",
        quantidade: campanhasAbertas,
        explicacao: "Campanhas abertas podem virar acao comercial depois das urgencias.",
      }),
    ].filter((acao): acao is AcaoAdmin => Boolean(acao))
  ).slice(0, 8);

  const resumo: ResumoCentralAcoesItem[] = [
    {
      id: "pedidos",
      titulo: "Pedidos que precisam de acao",
      valor: pedidosQuePrecisamAcao,
      descricao: "Pagos, com problema ou com envio pendente.",
      href: hrefPedidos,
      cta: "Abrir pedidos",
      tom: tomResumo(pedidosQuePrecisamAcao, true),
    },
    {
      id: "catalogo",
      titulo: "Produtos com problema de publicacao",
      valor: produtosSemImagem + produtosSemEstoque + categoriasVazias,
      descricao: "Sem imagem, sem estoque ou categoria vazia.",
      href: hrefProdutos || hrefCategorias,
      cta: "Revisar catalogo",
      tom: tomResumo(produtosSemImagem + produtosSemEstoque + categoriasVazias),
    },
    {
      id: "recomendacoes",
      titulo: "Recomendacoes abertas",
      valor: recomendacoesAbertas,
      descricao: "Sugestoes pendentes de decisao.",
      href: hrefRecomendacoes,
      cta: "Ver recomendacoes",
      tom: tomResumo(recomendacoesAbertas),
    },
    {
      id: "alertas",
      titulo: "Alertas criticos",
      valor: alertasCriticos,
      descricao: "Notificacoes criticas ainda novas.",
      href: hrefNotificacoes,
      cta: "Abrir caixa",
      tom: tomResumo(alertasCriticos, true),
    },
  ];

  const proximosPassos = filtrarLinksPermitidos(usuario, [
    {
      id: "passo-pedidos",
      titulo: "Comece pelos pedidos pagos e com problema.",
      descricao: "Eles afetam prazo, atendimento e confianca do cliente.",
      href: "/pedidos",
      modulo: "pedidos",
    },
    {
      id: "passo-notificacoes",
      titulo: "Depois limpe a caixa de entrada critica.",
      descricao: "Use as notificacoes como lista curta de pendencias.",
      href: "/notificacoes",
      modulo: "notificacoes",
    },
    {
      id: "passo-catalogo",
      titulo: "Revise catalogo antes de divulgar produtos.",
      descricao: "Imagem, estoque e categoria precisam estar coerentes.",
      href: "/produtos",
      modulo: "produtos",
    },
    {
      id: "passo-marketing",
      titulo: "Use buscas sem resultado para melhorar a loja.",
      descricao: "Termos buscados ajudam a ajustar tags, nomes e vitrines.",
      href: "/compras/intencao",
      modulo: "intencaoComercial",
    },
    {
      id: "passo-clientes",
      titulo: "Reative clientes recorrentes parados.",
      descricao: "Acompanhe clientes que ja compraram e perderam ritmo.",
      href: "/clientes",
      modulo: "clientes",
    },
  ]).slice(0, 4);

  const linksRapidos = filtrarLinksPermitidos(usuario, [
    {
      id: "pedidos",
      titulo: "Pedidos",
      descricao: "Operacao e envio",
      href: "/pedidos",
      modulo: "pedidos",
    },
    {
      id: "produtos",
      titulo: "Produtos",
      descricao: "Catalogo",
      href: "/produtos",
      modulo: "produtos",
    },
    {
      id: "recomendacoes",
      titulo: "Recomendacoes",
      descricao: "Decisoes sugeridas",
      href: "/compras/recomendacoes",
      modulo: "recomendacoes",
    },
    {
      id: "clientes",
      titulo: "Clientes",
      descricao: "Relacionamento",
      href: "/clientes",
      modulo: "clientes",
    },
    {
      id: "notificacoes",
      titulo: "Notificacoes",
      descricao: "Caixa de entrada",
      href: "/notificacoes",
      modulo: "notificacoes",
    },
    {
      id: "relatorios",
      titulo: "Relatorios",
      descricao: "Indicadores",
      href: "/relatorios",
      modulo: "relatorios",
    },
    {
      id: "financeiro",
      titulo: "Financeiro",
      descricao: "Caixa e resultado",
      href: "/compras/financeiro",
      modulo: podeVerDadosFinanceiros ? "financeiro" : undefined,
    },
    {
      id: "loja-publica",
      titulo: "Loja publica",
      descricao: "Ver experiencia do cliente",
      href: "/loja",
    },
  ]).filter(
    (link) =>
      link.id !== "financeiro" || (podeVerFinanceiro && podeVerDadosFinanceiros)
  );

  return {
    perfilAtual:
      usuario.perfilAdministrativo?.codigo || usuario.perfil || "ADMIN",
    podeVerDadosFinanceiros,
    resumo,
    acoes,
    proximosPassos,
    linksRapidos,
  };
}
