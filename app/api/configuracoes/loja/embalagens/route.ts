import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";

function slugify(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function exigirAcessoGeral() {
  const usuario = await exigirAdmin();

  if (usuario.perfil !== "ACESSO_GERAL") {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  return null;
}

function numero(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inteiroOpcional(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function inteiroMinimo(value: unknown, fallback = 1, minimo = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(minimo, Math.trunc(parsed));
}

function textoOpcional(value: unknown) {
  const texto = String(value || "").trim();
  return texto || null;
}

function revalidarEmbalagens() {
  revalidatePath("/configuracoes/loja");
  revalidatePath("/configuracoes/loja/embalagens");
  revalidatePath("/produtos");
}

async function gerarSlugClasse(nome: string, slugInformado?: string, id?: string) {
  const base = slugify(slugInformado || nome) || "classe";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.embalagemClasse.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existente || existente.id === id) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

async function gerarSlugModelo(nome: string, slugInformado?: string, id?: string) {
  const base = slugify(slugInformado || nome) || "modelo";
  let slug = base;
  let contador = 2;

  while (true) {
    const existente = await prisma.embalagemModelo.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existente || existente.id === id) {
      return slug;
    }

    slug = `${base}-${contador}`;
    contador += 1;
  }
}

export async function GET() {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) {
    return bloqueio;
  }

  const [classes, modelos, itensAdicionais, categorias, produtos, configuracao] =
    await Promise.all([
      prisma.embalagemClasse.findMany({
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
      prisma.embalagemModelo.findMany({
        orderBy: [{ tipo: "asc" }, { prioridade: "desc" }, { nomeInterno: "asc" }],
        include: {
          componentes: {
            include: {
              itemAdicional: true,
            },
            orderBy: {
              criadoEm: "asc",
            },
          },
          compatibilidades: {
            include: {
              classe: true,
              categoria: true,
              produto: true,
            },
            orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
          },
        },
      }),
      prisma.itemAdicional.findMany({
        where: {
          ativo: true,
          status: {
            not: "NA_LIXEIRA",
          },
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
          custoBase: true,
        },
        orderBy: {
          nome: "asc",
        },
      }),
      prisma.categoriaProduto.findMany({
        where: {
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
        },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
      prisma.produto.findMany({
        where: {
          status: {
            not: "NA_LIXEIRA",
          },
        },
        select: {
          id: true,
          codigoInterno: true,
          nome: true,
        },
        orderBy: {
          nome: "asc",
        },
        take: 200,
      }),
      prisma.embalagemConfiguracao.upsert({
        where: {
          chave: "PADRAO",
        },
        update: {},
        create: {
          chave: "PADRAO",
        },
      }),
    ]);

  return NextResponse.json({
    classes,
    modelos,
    itensAdicionais,
    categorias,
    produtos,
    configuracao,
  });
}

export async function POST(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) {
    return bloqueio;
  }

  try {
    const body = await req.json();
    const entidade = String(body.entidade || "");

    if (entidade === "CLASSE") {
      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome da classe é obrigatório." },
          { status: 400 }
        );
      }

      const classe = await prisma.embalagemClasse.create({
        data: {
          nome,
          slug: await gerarSlugClasse(nome, body.slug),
          descricao: textoOpcional(body.descricao),
          ativo: body.ativo !== false,
          ordem: numero(body.ordem),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ classe });
    }

    if (entidade === "MODELO") {
      const nomeInterno = String(body.nomeInterno || "").trim();

      if (!nomeInterno) {
        return NextResponse.json(
          { error: "Nome interno do modelo é obrigatório." },
          { status: 400 }
        );
      }

      const modelo = await prisma.embalagemModelo.create({
        data: {
          tipo: String(body.tipo || "INTERNA_PADRAO"),
          nomeInterno,
          nomePublico: textoOpcional(body.nomePublico),
          slug: await gerarSlugModelo(nomeInterno, body.slug),
          descricaoPublica: textoOpcional(body.descricaoPublica),
          imagemUrl: textoOpcional(body.imagemUrl),
          ativo: body.ativo !== false,
          exibirNaLoja: Boolean(body.exibirNaLoja),
          prioridade: numero(body.prioridade),
          precoCliente: numero(body.precoCliente),
          substituiEmbalagemPadrao: Boolean(body.substituiEmbalagemPadrao),
          permiteMensagem: Boolean(body.permiteMensagem),
          mensagemLimiteCaracteres: inteiroOpcional(
            body.mensagemLimiteCaracteres
          ),
          mensagemPlaceholder: textoOpcional(body.mensagemPlaceholder),
          capacidadeUnidades: numero(body.capacidadeUnidades, 1),
          capacidadeCaixasInternas: inteiroOpcional(body.capacidadeCaixasInternas),
          permiteMisturarClasses: body.permiteMisturarClasses !== false,
          pesoGramas: numero(body.pesoGramas),
          alturaCm: inteiroOpcional(body.alturaCm),
          larguraCm: inteiroOpcional(body.larguraCm),
          comprimentoCm: inteiroOpcional(body.comprimentoCm),
          custoEstimadoManual:
            body.custoEstimadoManual === "" || body.custoEstimadoManual === null
              ? null
              : numero(body.custoEstimadoManual),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ modelo });
    }

    if (entidade === "COMPONENTE") {
      const componente = await prisma.embalagemModeloComponente.upsert({
        where: {
          embalagemModeloId_itemAdicionalId: {
            embalagemModeloId: String(body.embalagemModeloId),
            itemAdicionalId: String(body.itemAdicionalId),
          },
        },
        update: {
          quantidade: numero(body.quantidade, 1),
          observacao: textoOpcional(body.observacao),
        },
        create: {
          embalagemModeloId: String(body.embalagemModeloId),
          itemAdicionalId: String(body.itemAdicionalId),
          quantidade: numero(body.quantidade, 1),
          observacao: textoOpcional(body.observacao),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ componente });
    }

    if (entidade === "COMPATIBILIDADE") {
      const compatibilidade =
        await prisma.embalagemModeloCompatibilidade.create({
          data: {
            embalagemModeloId: String(body.embalagemModeloId),
            classeId: textoOpcional(body.classeId),
            categoriaId: textoOpcional(body.categoriaId),
            produtoId: textoOpcional(body.produtoId),
            ativo: body.ativo !== false,
            prioridade: numero(body.prioridade),
            capacidadeMaximaItens: inteiroMinimo(body.capacidadeMaximaItens),
          },
        });

      revalidarEmbalagens();
      return NextResponse.json({ compatibilidade });
    }

    return NextResponse.json(
      { error: "Entidade de embalagem inválida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao salvar embalagem:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao salvar embalagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) {
    return bloqueio;
  }

  try {
    const body = await req.json();
    const entidade = String(body.entidade || "");
    const id = String(body.id || "");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    if (entidade === "CLASSE") {
      const nome = String(body.nome || "").trim();
      const classe = await prisma.embalagemClasse.update({
        where: { id },
        data: {
          nome,
          slug: await gerarSlugClasse(nome, body.slug, id),
          descricao: textoOpcional(body.descricao),
          ativo: body.ativo !== false,
          ordem: numero(body.ordem),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ classe });
    }

    if (entidade === "MODELO") {
      const nomeInterno = String(body.nomeInterno || "").trim();
      const modelo = await prisma.embalagemModelo.update({
        where: { id },
        data: {
          tipo: String(body.tipo || "INTERNA_PADRAO"),
          nomeInterno,
          nomePublico: textoOpcional(body.nomePublico),
          slug: await gerarSlugModelo(nomeInterno, body.slug, id),
          descricaoPublica: textoOpcional(body.descricaoPublica),
          imagemUrl: textoOpcional(body.imagemUrl),
          ativo: body.ativo !== false,
          exibirNaLoja: Boolean(body.exibirNaLoja),
          prioridade: numero(body.prioridade),
          precoCliente: numero(body.precoCliente),
          substituiEmbalagemPadrao: Boolean(body.substituiEmbalagemPadrao),
          permiteMensagem: Boolean(body.permiteMensagem),
          mensagemLimiteCaracteres: inteiroOpcional(
            body.mensagemLimiteCaracteres
          ),
          mensagemPlaceholder: textoOpcional(body.mensagemPlaceholder),
          capacidadeUnidades: numero(body.capacidadeUnidades, 1),
          capacidadeCaixasInternas: inteiroOpcional(body.capacidadeCaixasInternas),
          permiteMisturarClasses: body.permiteMisturarClasses !== false,
          pesoGramas: numero(body.pesoGramas),
          alturaCm: inteiroOpcional(body.alturaCm),
          larguraCm: inteiroOpcional(body.larguraCm),
          comprimentoCm: inteiroOpcional(body.comprimentoCm),
          custoEstimadoManual:
            body.custoEstimadoManual === "" || body.custoEstimadoManual === null
              ? null
              : numero(body.custoEstimadoManual),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ modelo });
    }

    if (entidade === "CONFIGURACAO") {
      const configuracao = await prisma.embalagemConfiguracao.update({
        where: { id },
        data: {
          estrategiaSelecao: String(
            body.estrategiaSelecao || "MENOR_CUSTO_TOTAL"
          ),
          permitirMultiplosVolumes: Boolean(body.permitirMultiplosVolumes),
          maxCaixasInternasPorEnvio: inteiroOpcional(
            body.maxCaixasInternasPorEnvio
          ),
        },
      });

      revalidarEmbalagens();
      return NextResponse.json({ configuracao });
    }

    return NextResponse.json(
      { error: "Entidade de embalagem inválida." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao atualizar embalagem:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar embalagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const bloqueio = await exigirAcessoGeral();

  if (bloqueio) {
    return bloqueio;
  }

  try {
    const body = await req.json();
    const entidade = String(body.entidade || "");
    const id = String(body.id || "");

    if (entidade === "COMPONENTE") {
      await prisma.embalagemModeloComponente.delete({ where: { id } });
    } else if (entidade === "COMPATIBILIDADE") {
      await prisma.embalagemModeloCompatibilidade.delete({ where: { id } });
    } else {
      return NextResponse.json(
        { error: "Apenas componentes e compatibilidades podem ser removidos aqui." },
        { status: 400 }
      );
    }

    revalidarEmbalagens();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao remover embalagem:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao remover embalagem.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
