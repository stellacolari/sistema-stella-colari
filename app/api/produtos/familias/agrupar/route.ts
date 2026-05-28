import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProdutoAgrupamentoPayload = {
  produtoId?: string;
  familiaMaterial?: string | null;
  familiaCorJoia?: string | null;
  familiaImagemUrl?: string | null;
  familiaOrdem?: number;
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

async function gerarSlugUnico(nome: string) {
  const base = gerarSlug(nome) || "familia";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.produtoFamilia.findUnique({
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

async function garantirCampoFamilia({
  tx,
  familiaId,
  nome,
  slug,
  ordem,
}: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  familiaId: string;
  nome: string;
  slug: string;
  ordem: number;
}) {
  const existente = await tx.produtoFamiliaCampo.findUnique({
    where: {
      familiaId_slug: {
        familiaId,
        slug,
      },
    },
  });

  if (existente) {
    if (!existente.ativo || existente.nome !== nome || existente.ordem !== ordem) {
      return tx.produtoFamiliaCampo.update({
        where: {
          id: existente.id,
        },
        data: {
          nome,
          ordem,
          ativo: true,
        },
      });
    }

    return existente;
  }

  return tx.produtoFamiliaCampo.create({
    data: {
      familiaId,
      nome,
      slug,
      ordem,
      ativo: true,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const familiaId = normalizarTexto(body.familiaId);
    const familiaNome = normalizarTexto(body.familiaNome);
    const confirmarMover = Boolean(body.confirmarMover);

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
      if (!familiaId) return false;

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
        const slug = await gerarSlugUnico(familiaNome);

        familia = await tx.produtoFamilia.create({
          data: {
            nome: familiaNome,
            slug,
            ativo: true,
          },
        });
      }

      const usaMaterial = produtosValidos.some((item) => item.familiaMaterial);
      const usaCorJoia = produtosValidos.some((item) => item.familiaCorJoia);

      const campoMaterial = usaMaterial
        ? await garantirCampoFamilia({
            tx,
            familiaId: familia.id,
            nome: "Material",
            slug: "material",
            ordem: 0,
          })
        : null;

      const campoCorJoia = usaCorJoia
        ? await garantirCampoFamilia({
            tx,
            familiaId: familia.id,
            nome: "Cor da joia",
            slug: "cor-da-joia",
            ordem: 1,
          })
        : null;

      for (const item of produtosValidos) {
        await tx.produtoFamiliaProduto.deleteMany({
          where: {
            produtoId: item.produtoId,
            familiaId: {
              not: familia.id,
            },
          },
        });

        await tx.produto.update({
          where: {
            id: item.produtoId,
          },
          data: {
            familiaId: familia.id,

            // Compatibilidade temporária com a estrutura antiga.
            familiaMaterial: item.familiaMaterial,
            familiaCorJoia: item.familiaCorJoia,
            familiaImagemUrl: item.familiaImagemUrl,
            familiaOrdem: item.familiaOrdem,
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

        if (campoMaterial) {
          if (item.familiaMaterial) {
            await tx.produtoFamiliaProdutoValor.upsert({
              where: {
                familiaProdutoId_campoId: {
                  familiaProdutoId: vinculo.id,
                  campoId: campoMaterial.id,
                },
              },
              create: {
                familiaProdutoId: vinculo.id,
                campoId: campoMaterial.id,
                valor: item.familiaMaterial,
              },
              update: {
                valor: item.familiaMaterial,
              },
            });
          } else {
            await tx.produtoFamiliaProdutoValor.deleteMany({
              where: {
                familiaProdutoId: vinculo.id,
                campoId: campoMaterial.id,
              },
            });
          }
        }

        if (campoCorJoia) {
          if (item.familiaCorJoia) {
            await tx.produtoFamiliaProdutoValor.upsert({
              where: {
                familiaProdutoId_campoId: {
                  familiaProdutoId: vinculo.id,
                  campoId: campoCorJoia.id,
                },
              },
              create: {
                familiaProdutoId: vinculo.id,
                campoId: campoCorJoia.id,
                valor: item.familiaCorJoia,
              },
              update: {
                valor: item.familiaCorJoia,
              },
            });
          } else {
            await tx.produtoFamiliaProdutoValor.deleteMany({
              where: {
                familiaProdutoId: vinculo.id,
                campoId: campoCorJoia.id,
              },
            });
          }
        }
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
      { status: 500 }
    );
  }
}