import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarProduto } from "../actions";
import EditarProdutoClient from "@/components/produtos/EditarProdutoClient";
import { exigirAdminComPermissao } from "@/lib/auth/admin";
import { obterInteligenciaProduto } from "@/lib/produtos/metricas-produto";
import { analisarPrecificacaoProduto } from "@/lib/financeiro/precificacao-inteligente";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await exigirAdminComPermissao("produtos", "editar");
  const podeEditarEmbalagem = usuario.perfil === "ACESSO_GERAL";
  const podeEditarBuscaSeo = usuario.perfil === "ACESSO_GERAL";

  const [
    produto,
    categorias,
    produtosDisponiveisKit,
    regrasAdicionais,
    embalagemClasses,
    embalagemModelos,
    inteligenciaProduto,
    precificacaoProduto,
    vitrinesProduto,
    colecoesProduto,
  ] =
    await Promise.all([
      prisma.produto.findUnique({
        where: { id },
        include: {
          imagens: {
            orderBy: {
              ordem: "asc",
            },
          },
          categoriasProduto: {
            include: {
              categoria: {
                select: {
                  id: true,
                  nome: true,
                  slug: true,
                  categoriaMaeId: true,
                },
              },
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          componentesDoKit: {
            select: {
              componenteProdutoId: true,
              quantidade: true,
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          variacoes: {
            orderBy: {
              ordem: "asc",
            },
            include: {
              opcoes: {
                orderBy: {
                  ordem: "asc",
                },
              },
            },
          },
        },
      }),

      prisma.categoriaProduto.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          slug: true,
          categoriaMaeId: true,
          descricao: true,
          imagemUrl: true,
          exibirNoMenu: true,
          ordemMenu: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),

      prisma.produto.findMany({
        where: {
          id: {
            not: id,
          },
          status: {
            not: "NA_LIXEIRA",
          },
          tipoProduto: "UNITARIO",
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          categoria: true,
          tipoProduto: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),

      prisma.regraCategoria.findMany({
        where: {
          itemAdicional: {
            ativo: true,
            status: {
              not: "NA_LIXEIRA",
            },
          },
        },
        select: {
          id: true,
          categoria: true,
          aplicarTodasCategorias: true,
          categorias: true,
          quantidade: true,
          itemAdicional: {
            select: {
              id: true,
              codigoInterno: true,
              nome: true,
              custoBase: true,
            },
          },
        },
        orderBy: [{ categoria: "asc" }, { criadoEm: "asc" }],
      }),

      prisma.embalagemClasse.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),

      prisma.embalagemModelo.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          tipo: true,
          nomeInterno: true,
          nomePublico: true,
        },
        orderBy: [{ tipo: "asc" }, { prioridade: "desc" }, { nomeInterno: "asc" }],
      }),

      obterInteligenciaProduto(id),
      podeEditarBuscaSeo ? analisarPrecificacaoProduto(id) : Promise.resolve(null),
      podeEditarBuscaSeo
        ? prisma.vitrineInteligenteSugestao.findMany({
            where: {
              produtoId: id,
              status: {
                in: ["SUGERIDA", "EM_REVISAO", "APLICADA_COMO_RASCUNHO"],
              },
            },
            orderBy: { criadoEm: "desc" },
            take: 5,
            select: {
              id: true,
              titulo: true,
              tipo: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      podeEditarBuscaSeo
        ? prisma.colecaoInteligenteProduto.findMany({
            where: {
              produtoId: id,
              status: {
                in: ["SUGERIDO", "APROVADO"],
              },
              colecao: {
                status: {
                  not: "ARQUIVADA",
                },
              },
            },
            select: {
              status: true,
              fixado: true,
              colecao: {
                select: {
                  nome: true,
                  tipo: true,
                  status: true,
                  slug: true,
                },
              },
            },
            orderBy: [{ fixado: "desc" }, { atualizadoEm: "desc" }],
            take: 8,
          })
        : Promise.resolve([]),
    ]);

  if (!produto) {
    notFound();
  }

  const actionAtualizar = atualizarProduto.bind(null, produto.id);

  const imagensIniciais =
    produto.imagens.length > 0
      ? produto.imagens.map((imagem) => ({
          id: imagem.id,
          imagemUrl: imagem.imagemUrl,
        }))
      : [produto.imagemUrl, produto.imagemHoverUrl]
          .filter(Boolean)
          .map((imagemUrl) => ({
            imagemUrl: imagemUrl as string,
          }));

  const categoriaPrincipalRelacao =
    produto.categoriasProduto.find((relacao) => relacao.principal) ??
    produto.categoriasProduto[0] ??
    null;

  const categoriaPrincipalInicialId =
    categoriaPrincipalRelacao?.categoriaId ?? "";

  const categoriasSelecionadasIniciaisIds = produto.categoriasProduto.map(
    (relacao) => relacao.categoriaId
  );

  const componentesKitIniciais = produto.componentesDoKit.map((componente) => ({
    componenteProdutoId: componente.componenteProdutoId,
    quantidade: componente.quantidade,
  }));

  const variacoesIniciais = produto.variacoes.map((variacao) => ({
    id: variacao.id,
    nome: variacao.nome,
    obrigatoria: variacao.obrigatoria,
    opcoes: variacao.opcoes.map((opcao) => ({
      id: opcao.id,
      nome: opcao.nome,
      imagemUrl: opcao.imagemUrl,
      precoAdicional: Number(opcao.precoAdicional || 0),
      custoAdicional: Number(opcao.custoAdicional || 0),
      ativo: Boolean(opcao.ativo),
      ordem: Number(opcao.ordem || 0),
    })),
  }));

  const produtosKitSerializados = produtosDisponiveisKit.map((produtoKit) => ({
    ...produtoKit,
    custoBase: Number(produtoKit.custoBase || 0),
  }));

  const regrasAdicionaisSerializadas = regrasAdicionais.map((regra) => ({
    id: regra.id,
    categoria: regra.categoria,
    aplicarTodasCategorias: regra.aplicarTodasCategorias,
    categorias: regra.categorias,
    quantidade: Number(regra.quantidade || 0),
    itemAdicional: {
      id: regra.itemAdicional.id,
      codigoInterno: regra.itemAdicional.codigoInterno,
      nome: regra.itemAdicional.nome,
      custoBase: Number(regra.itemAdicional.custoBase || 0),
    },
  }));

  const produtoSerializado = {
    id: produto.id,
    codigoInterno: produto.codigoInterno,
    codigoFornecedor: produto.codigoFornecedor || "",
    nome: produto.nome,
    fornecedorPadrao: produto.fornecedorPadrao,
    custoBase: Number(produto.custoBase || 0),
    margemAplicada: Number(produto.margemAplicada || 0),
    precoVenda: Number(produto.precoVenda || 0),
    descontoAtivo: Boolean(produto.descontoAtivo),
    precoPromocional:
      produto.precoPromocional !== null &&
      produto.precoPromocional !== undefined
        ? Number(produto.precoPromocional)
        : null,
    descricaoLoja: produto.descricaoLoja || "",
    termosBusca: produto.termosBusca || "",
    tagsComerciais: produto.tagsComerciais || "",
    linkCompra: produto.linkCompra || "",
    observacoes: produto.observacoes || "",
    tipoProduto: produto.tipoProduto,
    ativo: Boolean(produto.ativo),
    embalagem: {
      embalagemClasseId: produto.embalagemClasseId,
      embalagemUnidades: Number(produto.embalagemUnidades || 1),
      embalagemCompartilhavel: Boolean(produto.embalagemCompartilhavel),
      embalagemIndividualObrigatoria: Boolean(
        produto.embalagemIndividualObrigatoria
      ),
      embalagemModeloPreferencialId: produto.embalagemModeloPreferencialId,
      permiteEmbalagemPresente: Boolean(produto.permiteEmbalagemPresente),
      embalagemPresentePadraoId: produto.embalagemPresentePadraoId,
      pesoGramas:
        produto.pesoGramas !== null && produto.pesoGramas !== undefined
          ? Number(produto.pesoGramas)
          : null,
      alturaCm:
        produto.alturaCm !== null && produto.alturaCm !== undefined
          ? Number(produto.alturaCm)
          : null,
      larguraCm:
        produto.larguraCm !== null && produto.larguraCm !== undefined
          ? Number(produto.larguraCm)
          : null,
      comprimentoCm:
        produto.comprimentoCm !== null && produto.comprimentoCm !== undefined
          ? Number(produto.comprimentoCm)
          : null,
    },
  };

  const inteligenciaProdutoSerializada = {
    resumo: inteligenciaProduto.resumo
      ? {
          ...inteligenciaProduto.resumo,
          periodoInicio:
            inteligenciaProduto.resumo.periodoInicio.toISOString(),
          periodoFim: inteligenciaProduto.resumo.periodoFim.toISOString(),
        }
      : null,
    ciclos: inteligenciaProduto.ciclos.map((ciclo) => ({
      ...ciclo,
      dataInicio: ciclo.dataInicio.toISOString(),
      dataFim: ciclo.dataFim ? ciclo.dataFim.toISOString() : null,
    })),
    recomendacao: {
      ...inteligenciaProduto.recomendacao,
      cicloAtual: inteligenciaProduto.recomendacao.cicloAtual
        ? {
            ...inteligenciaProduto.recomendacao.cicloAtual,
            dataInicio:
              inteligenciaProduto.recomendacao.cicloAtual.dataInicio.toISOString(),
            dataFim: inteligenciaProduto.recomendacao.cicloAtual.dataFim
              ? inteligenciaProduto.recomendacao.cicloAtual.dataFim.toISOString()
              : null,
          }
        : null,
    },
  };

  return (
    <div className="space-y-6">
      <EditarProdutoClient
        produto={produtoSerializado}
        inteligenciaProduto={inteligenciaProdutoSerializada}
        precificacaoProduto={precificacaoProduto}
        vitrinesProduto={vitrinesProduto}
        categorias={categorias}
        produtosDisponiveisKit={produtosKitSerializados}
        regrasAdicionais={regrasAdicionaisSerializadas}
        imagensIniciais={imagensIniciais}
        categoriaPrincipalInicialId={categoriaPrincipalInicialId}
        categoriasSelecionadasIniciaisIds={categoriasSelecionadasIniciaisIds}
        componentesKitIniciais={componentesKitIniciais}
        variacoesIniciais={variacoesIniciais}
        embalagemOptions={{
          classes: embalagemClasses,
          modelos: embalagemModelos,
        }}
        podeEditarEmbalagem={podeEditarEmbalagem}
        podeEditarBuscaSeo={podeEditarBuscaSeo}
        atualizarProdutoAction={actionAtualizar}
      />

      {podeEditarBuscaSeo && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Colecoes inteligentes
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Presenca do produto em colecoes
              </h2>
            </div>
          </div>

          {colecoesProduto.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {colecoesProduto.map((item) => (
                <div
                  key={`${item.colecao.slug}-${item.status}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.colecao.nome}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {item.colecao.tipo} · {item.colecao.status}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {item.fixado ? "FIXADO" : item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Este produto ainda nao aparece em colecoes inteligentes ativas ou em revisao.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
