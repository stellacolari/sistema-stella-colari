import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AdminPermissaoError, exigirAdminComPermissao } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CampoFamiliaPayload = {
  id?: string;
  tempId?: string;
  nome?: string;
  slug?: string;
  ordem?: number;
  ativo?: boolean;
};

type ProdutoAgrupamentoPayload = {
  produtoId?: string;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaImagemUrl?: string | null;
  familiaOrdem?: number;
  valores?: Record<string, string | null | undefined>;
};

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

function gerarSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gerarSlugUnicoFamilia({
  tx,
  nome,
}: {
  tx: Prisma.TransactionClient;
  nome: string;
}) {
  const base = gerarSlug(nome) || "familia";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await tx.produtoFamilia.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!existente) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

function normalizarCamposPayload({
  campos,
  produtos,
}: {
  campos: CampoFamiliaPayload[];
  produtos: ProdutoAgrupamentoPayload[];
}) {
  if (Array.isArray(campos) && campos.length > 0) {
    return campos
      .map((campo, index) => {
        const nome = normalizarTexto(campo.nome);
        const slug = gerarSlug(campo.slug || nome);

        if (!nome || !slug) {
          return null;
        }

        return {
          id: normalizarTexto(campo.id) || null,
          tempId: normalizarTexto(campo.tempId) || `campo-${index}`,
          nome,
          slug,
          ordem: Number.isFinite(Number(campo.ordem))
            ? Number(campo.ordem)
            : index,
          ativo: campo.ativo !== false,
        };
      })
      .filter(Boolean) as {
      id: string | null;
      tempId: string;
      nome: string;
      slug: string;
      ordem: number;
      ativo: boolean;
    }[];
  }

  const usaMaterial = produtos.some((item) =>
    normalizarTexto(item.familiaMaterial)
  );

  const usaCorJoia = produtos.some((item) =>
    normalizarTexto(item.familiaCorJoia)
  );

  const camposInferidos: {
    id: string | null;
    tempId: string;
    nome: string;
    slug: string;
    ordem: number;
    ativo: boolean;
  }[] = [];

  if (usaMaterial) {
    camposInferidos.push({
      id: null,
      tempId: "material",
      nome: "Material",
      slug: "material",
      ordem: 0,
      ativo: true,
    });
  }

  if (usaCorJoia) {
    camposInferidos.push({
      id: null,
      tempId: "cor-da-joia",
      nome: "Cor da joia",
      slug: "cor-da-joia",
      ordem: 1,
      ativo: true,
    });
  }

  return camposInferidos;
}

async function garantirCampoFamilia({
  tx,
  familiaId,
  campo,
}: {
  tx: Prisma.TransactionClient;
  familiaId: string;
  campo: {
    id: string | null;
    nome: string;
    slug: string;
    ordem: number;
    ativo: boolean;
  };
}) {
  if (campo.id) {
    const existentePorId = await tx.produtoFamiliaCampo.findFirst({
      where: {
        id: campo.id,
        familiaId,
      },
    });

    if (existentePorId) {
      return tx.produtoFamiliaCampo.update({
        where: {
          id: existentePorId.id,
        },
        data: {
          nome: campo.nome,
          slug: campo.slug,
          ordem: campo.ordem,
          ativo: campo.ativo,
        },
      });
    }
  }

  const existentePorSlug = await tx.produtoFamiliaCampo.findUnique({
    where: {
      familiaId_slug: {
        familiaId,
        slug: campo.slug,
      },
    },
  });

  if (existentePorSlug) {
    return tx.produtoFamiliaCampo.update({
      where: {
        id: existentePorSlug.id,
      },
      data: {
        nome: campo.nome,
        ordem: campo.ordem,
        ativo: campo.ativo,
      },
    });
  }

  return tx.produtoFamiliaCampo.create({
    data: {
      familiaId,
      nome: campo.nome,
      slug: campo.slug,
      ordem: campo.ordem,
      ativo: campo.ativo,
    },
  });
}

function getValorCampoProduto({
  produto,
  campo,
}: {
  produto: {
    familiaMaterial: string | null;
    familiaCorJoia: string | null;
    valores?: Record<string, string | null | undefined>;
  };
  campo: {
    id: string;
    tempId: string;
    slug: string;
    nome: string;
  };
}) {
  const valores = produto.valores || {};

  const valorDireto =
    valores[campo.id] ??
    valores[campo.tempId] ??
    valores[campo.slug] ??
    valores[campo.nome];

  if (typeof valorDireto !== "undefined") {
    return normalizarTexto(valorDireto) || null;
  }

  if (campo.slug === "material") {
    return produto.familiaMaterial || null;
  }

  if (campo.slug === "cor-da-joia") {
    return produto.familiaCorJoia || null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    await exigirAdminComPermissao("produtos", "editar");

    const body = await request.json();

    const familiaId = normalizarTexto(body.familiaId);
    const familiaNome = normalizarTexto(body.familiaNome);
    const confirmarMover = Boolean(body.confirmarMover);

    const camposPayload: CampoFamiliaPayload[] = Array.isArray(body.campos)
      ? body.campos
      : [];

    const produtos: ProdutoAgrupamentoPayload[] = Array.isArray(body.produtos)
      ? body.produtos
      : [];

    if (!familiaId && !familiaNome) {
      return NextResponse.json(
        {
          error:
            "Selecione uma família existente ou informe o nome de uma nova família.",
        },
        { status: 400 }
      );
    }

    if (produtos.length === 0) {
      return NextResponse.json(
        { error: "Selecione pelo menos um produto para agrupar." },
        { status: 400 }
      );
    }

    const produtosValidos = produtos
      .map((item, index) => ({
        produtoId: normalizarTexto(item.produtoId),
        familiaMaterial: normalizarTexto(item.familiaMaterial) || null,
        familiaCorJoia: normalizarTexto(item.familiaCorJoia) || null,
        familiaImagemUrl: normalizarTexto(item.familiaImagemUrl) || null,
        familiaOrdem: Number.isFinite(Number(item.familiaOrdem))
          ? Number(item.familiaOrdem)
          : index,
        valores: item.valores || {},
      }))
      .filter((item) => item.produtoId);

    if (produtosValidos.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto válido foi enviado." },
        { status: 400 }
      );
    }

    const idsProdutos = produtosValidos.map((item) => item.produtoId);

    const produtosAtuais = await prisma.produto.findMany({
      where: {
        id: {
          in: idsProdutos,
        },
      },
      select: {
        id: true,
        nome: true,
        familiaId: true,
        familia: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    const produtosEmOutraFamilia = produtosAtuais.filter((produto) => {
      if (!produto.familiaId) return false;

      if (!familiaId) {
        return true;
      }

      return produto.familiaId !== familiaId;
    });

    if (produtosEmOutraFamilia.length > 0 && !confirmarMover) {
      return NextResponse.json(
        {
          error:
            "Um ou mais produtos selecionados já pertencem a outra família. Confirme a movimentação antes de salvar.",
          requerConfirmacao: true,
          produtos: produtosEmOutraFamilia.map((produto) => ({
            id: produto.id,
            nome: produto.nome,
            familiaAtual: produto.familia?.nome || "Família atual",
          })),
        },
        { status: 409 }
      );
    }

    const camposNormalizados = normalizarCamposPayload({
      campos: camposPayload,
      produtos: produtosValidos,
    });

    const resultado = await prisma.$transaction(async (tx) => {
      let familia = familiaId
        ? await tx.produtoFamilia.findUnique({
            where: {
              id: familiaId,
            },
          })
        : null;

      if (familiaId && !familia) {
        throw new Error("Família selecionada não encontrada.");
      }

      if (!familia) {
        const slug = await gerarSlugUnicoFamilia({
          tx,
          nome: familiaNome,
        });

        familia = await tx.produtoFamilia.create({
          data: {
            nome: familiaNome,
            slug,
            ativo: true,
          },
        });
      }

      const camposAtivos = [];

      for (const campo of camposNormalizados) {
        const campoSalvo = await garantirCampoFamilia({
          tx,
          familiaId: familia.id,
          campo,
        });

        if (campo.ativo) {
          camposAtivos.push({
            ...campoSalvo,
            tempId: campo.tempId,
          });
        }
      }

      if (camposPayload.length > 0) {
        const idsCamposMantidos = camposAtivos.map((campo) => campo.id);

        await tx.produtoFamiliaCampo.updateMany({
          where: {
            familiaId: familia.id,
            id: {
              notIn: idsCamposMantidos,
            },
          },
          data: {
            ativo: false,
          },
        });
      }

      for (const item of produtosValidos) {
        await tx.produtoFamiliaProduto.deleteMany({
          where: {
            produtoId: item.produtoId,
            familiaId: {
              not: familia.id,
            },
          },
        });

        const vinculoExistente = await tx.produtoFamiliaProduto.findUnique({
          where: {
            familiaId_produtoId: {
              familiaId: familia.id,
              produtoId: item.produtoId,
            },
          },
        });

        const vinculo = vinculoExistente
          ? await tx.produtoFamiliaProduto.update({
              where: {
                id: vinculoExistente.id,
              },
              data: {
                imagemUrl: item.familiaImagemUrl,
                ordem: item.familiaOrdem,
                ativo: true,
              },
            })
          : await tx.produtoFamiliaProduto.create({
              data: {
                familiaId: familia.id,
                produtoId: item.produtoId,
                imagemUrl: item.familiaImagemUrl,
                ordem: item.familiaOrdem,
                ativo: true,
              },
            });

        let valorMaterial: string | null = null;
        let valorCorJoia: string | null = null;

        for (const campo of camposAtivos) {
          const valor = getValorCampoProduto({
            produto: item,
            campo,
          });

          if (campo.slug === "material") {
            valorMaterial = valor;
          }

          if (campo.slug === "cor-da-joia") {
            valorCorJoia = valor;
          }

          if (valor) {
            await tx.produtoFamiliaProdutoValor.upsert({
              where: {
                familiaProdutoId_campoId: {
                  familiaProdutoId: vinculo.id,
                  campoId: campo.id,
                },
              },
              create: {
                familiaProdutoId: vinculo.id,
                campoId: campo.id,
                valor,
              },
              update: {
                valor,
              },
            });
          } else {
            await tx.produtoFamiliaProdutoValor.deleteMany({
              where: {
                familiaProdutoId: vinculo.id,
                campoId: campo.id,
              },
            });
          }
        }

        await tx.produto.update({
          where: {
            id: item.produtoId,
          },
          data: {
            familiaId: familia.id,

            // Compatibilidade temporária com a estrutura antiga.
            familiaMaterial: valorMaterial,
            familiaCorJoia: valorCorJoia,
            familiaImagemUrl: item.familiaImagemUrl,
            familiaOrdem: item.familiaOrdem,
          },
        });
      }

      return familia;
    });

    return NextResponse.json({
      ok: true,
      familia: resultado,
    });
  } catch (error) {
    console.error("Erro ao agrupar produtos em família:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao agrupar produtos.",
      },
      { status: error instanceof AdminPermissaoError ? 403 : 500 }
    );
  }
}
