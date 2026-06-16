import { prisma } from "@/lib/prisma";
import {
  avaliarCompraLoteProduto,
  montarInteligenciaAdaptativaAtual,
} from "@/lib/financeiro/inteligencia-adaptativa";
import { exigirAdmin } from "@/lib/auth/admin";
import { gerarRecomendacaoReposicao } from "@/lib/produtos/metricas-produto";
import ReposicaoComprasClient, {
  type ReposicaoCompraItem,
} from "@/components/compras/ReposicaoComprasClient";

export const dynamic = "force-dynamic";

const ESTOQUE_MINIMO_PADRAO = 5;
const ESTOQUE_IDEAL_PADRAO = 10;

export default async function ReposicaoComprasPage() {
  const usuario = await exigirAdmin();
  const podeVerInteligenciaAdaptativa = usuario.perfil === "ACESSO_GERAL";
  const [estoqueProdutosRaw, estoqueAdicionaisRaw, contextoAdaptativo] = await Promise.all([
    prisma.estoqueProduto.findMany({
      where: {
        produto: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
        },
      },
      include: {
        produto: {
          select: {
            id: true,
            codigoInterno: true,
            nome: true,
            categoria: true,
            fornecedorPadrao: true,
            linkCompra: true,
            custoBase: true,
            precoVenda: true,
            descontoAtivo: true,
            precoPromocional: true,
          },
        },
      },
      orderBy: [
        { produto: { nome: "asc" } },
        { tamanhoAnel: "asc" },
      ],
    }),
    prisma.estoqueAdicional.findMany({
      where: {
        itemAdicional: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
        },
      },
      include: {
        itemAdicional: {
          include: {
            embalagensComponentes: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        itemAdicional: {
          nome: "asc",
        },
      },
    }),
    podeVerInteligenciaAdaptativa
      ? montarInteligenciaAdaptativaAtual()
      : Promise.resolve(null),
  ]);

  const estoqueProdutosReposicao = estoqueProdutosRaw.filter(
    (estoque) => estoque.quantidadeAtual <= ESTOQUE_MINIMO_PADRAO
  );
  const inteligenciaProdutos = podeVerInteligenciaAdaptativa
    ? await Promise.all(
        estoqueProdutosReposicao.map((estoque) =>
          gerarRecomendacaoReposicao(estoque.produto.id, {
            tamanhoAnel: estoque.tamanhoAnel,
          })
        )
      )
    : estoqueProdutosReposicao.map(() => null);

  const itensProdutos: ReposicaoCompraItem[] = estoqueProdutosReposicao.map(
    (estoque, index) => {
      const inteligencia = inteligenciaProdutos[index];
      const cicloAtual = inteligencia?.cicloAtual;
      const precoAtivo =
        estoque.produto.descontoAtivo && estoque.produto.precoPromocional
          ? estoque.produto.precoPromocional
          : estoque.produto.precoVenda;
      const margemEstimadaPct =
        precoAtivo > 0
          ? Math.round(
              ((precoAtivo - estoque.produto.custoBase) / precoAtivo) * 10000
            ) / 100
          : 0;
      const decisaoLote = inteligencia && contextoAdaptativo
        ? avaliarCompraLoteProduto({
            fase: contextoAdaptativo.fase,
            confiancaAnalise: contextoAdaptativo.confiancaAnalise,
            caixaDisponivel: contextoAdaptativo.caixaDisponivel,
            statusComercial: inteligencia.statusComercial,
            recomendacaoReposicao: inteligencia.recomendacao,
            confiancaReposicao: inteligencia.confianca,
            vendasQuantidade: cicloAtual?.quantidadeVendida,
            estoqueAtual: estoque.quantidadeAtual,
            sugestaoQuantidade: inteligencia.sugestaoQuantidade,
            custoUnitario: estoque.custoMedio || estoque.produto.custoBase,
            margemEstimadaPct,
            cicloAtual,
            intencao: inteligencia.intencao,
          })
        : null;

      return {
      id: `produto-${estoque.id}`,
      cadastroId: estoque.produto.id,
        tipo: "produto" as const,
      codigo: estoque.produto.codigoInterno,
      nome: estoque.produto.nome,
      detalhe:
        estoque.tamanhoAnel && estoque.tamanhoAnel !== "UNICO"
          ? `${estoque.produto.categoria} · Tam. ${estoque.tamanhoAnel}`
          : estoque.produto.categoria,
      fornecedorPadrao: estoque.produto.fornecedorPadrao,
      estoqueAtual: estoque.quantidadeAtual,
      estoqueMinimo: ESTOQUE_MINIMO_PADRAO,
      estoqueIdeal: ESTOQUE_IDEAL_PADRAO,
      sugestaoCompra: Math.max(
        ESTOQUE_IDEAL_PADRAO - estoque.quantidadeAtual,
        1
      ),
      linkCompra: estoque.produto.linkCompra,
      tamanhoAnel: estoque.tamanhoAnel,
      statusComercial: podeVerInteligenciaAdaptativa
        ? inteligencia?.statusComercial
        : null,
      recomendacaoReposicao: podeVerInteligenciaAdaptativa
        ? inteligencia?.recomendacao
        : null,
      confiancaReposicao: podeVerInteligenciaAdaptativa ? inteligencia?.confianca : null,
      cicloAtual: podeVerInteligenciaAdaptativa && cicloAtual
        ? `${cicloAtual.quantidadeVendida}/${
            cicloAtual.quantidadeInicial + cicloAtual.quantidadeEntrada
          }`
        : null,
      sellThrough: podeVerInteligenciaAdaptativa ? inteligencia?.sellThrough : null,
      acaoSugerida: podeVerInteligenciaAdaptativa ? inteligencia?.motivo : null,
      visualizacoesIntencao: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.visualizacoes
        : null,
      favoritosIntencao: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.favoritos
        : null,
      carrinhosIntencao: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.adicoesCarrinho
        : null,
      scoreInteresse: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.scoreInteresse
        : null,
      taxaConversao: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.taxaConversao
        : null,
      confiancaAnalise: podeVerInteligenciaAdaptativa
        ? inteligencia?.intencao.confiancaAnalise
        : null,
      faseEmpresa: contextoAdaptativo?.fase,
      faseEmpresaLabel: contextoAdaptativo?.faseLabel,
      loteDecisao: decisaoLote?.decisao,
      loteGrandeLiberado: decisaoLote?.loteGrandeLiberado,
      loteSugestao: decisaoLote?.sugestao,
      loteSugestaoQuantidade: decisaoLote?.sugestaoQuantidade,
      loteMotivo: decisaoLote?.motivo,
      loteConfianca: decisaoLote?.confianca,
      margemAcao: decisaoLote?.margem.acao,
      margemRecomendacao: decisaoLote?.margem.recomendacao,
      };
    }
  );

  const itensAdicionais: ReposicaoCompraItem[] = estoqueAdicionaisRaw
    .filter((estoque) => estoque.quantidadeAtual <= ESTOQUE_MINIMO_PADRAO)
    .map((estoque) => {
      const ehEmbalagem =
        estoque.itemAdicional.embalagensComponentes.length > 0;

      return {
        id: `adicional-${estoque.id}`,
        cadastroId: estoque.itemAdicional.id,
        tipo: ehEmbalagem ? "embalagem" : "adicional",
        codigo: estoque.itemAdicional.codigoInterno,
        nome: estoque.itemAdicional.nome,
        detalhe: ehEmbalagem ? "Componente de embalagem" : "Item adicional",
        fornecedorPadrao: estoque.itemAdicional.fornecedorPadrao,
        estoqueAtual: estoque.quantidadeAtual,
        estoqueMinimo: ESTOQUE_MINIMO_PADRAO,
        estoqueIdeal: ESTOQUE_IDEAL_PADRAO,
        sugestaoCompra: Math.max(
          ESTOQUE_IDEAL_PADRAO - estoque.quantidadeAtual,
          1
        ),
        linkCompra: estoque.itemAdicional.linkCompra,
        tamanhoAnel: null,
      } satisfies ReposicaoCompraItem;
    });

  const itens = [...itensProdutos, ...itensAdicionais].sort((a, b) => {
    if (a.estoqueAtual !== b.estoqueAtual) {
      return a.estoqueAtual - b.estoqueAtual;
    }

    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return (
    <ReposicaoComprasClient
      itens={itens}
      exibirInteligenciaAdaptativa={podeVerInteligenciaAdaptativa}
    />
  );
}
