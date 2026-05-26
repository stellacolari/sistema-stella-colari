import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const categoriaSelect = {
  id: true,
  nome: true,
  slug: true,
  categoriaMaeId: true,
  descricao: true,
  imagemUrl: true,
  exibirNoMenu: true,
  ordemMenu: true,
};

function parseBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value === null) {
    return fallback;
  }

  return String(value) === "true";
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

async function salvarImagemCategoria(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const extensaoOriginal = path.extname(file.name || "").toLowerCase();

  const extensao =
    extensaoOriginal && extensaoOriginal.length <= 8
      ? extensaoOriginal
      : ".jpg";

  const nomeArquivo = `${randomUUID()}${extensao}`;
  const pastaDestino = path.join(
    process.cwd(),
    "public",
    "uploads",
    "categorias"
  );

  await mkdir(pastaDestino, { recursive: true });

  const caminhoDestino = path.join(pastaDestino, nomeArquivo);

  await writeFile(caminhoDestino, buffer);

  return `/uploads/categorias/${nomeArquivo}`;
}

async function categoriaMaeEhDescendente(
  categoriaMaeId: string,
  categoriaAtualId: string
) {
  let atual = await prisma.categoriaProduto.findUnique({
    where: {
      id: categoriaMaeId,
    },
    select: {
      id: true,
      categoriaMaeId: true,
    },
  });

  while (atual) {
    if (atual.id === categoriaAtualId) {
      return true;
    }

    if (!atual.categoriaMaeId) {
      return false;
    }

    atual = await prisma.categoriaProduto.findUnique({
      where: {
        id: atual.categoriaMaeId,
      },
      select: {
        id: true,
        categoriaMaeId: true,
      },
    });
  }

  return false;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const categoriaExistente = await prisma.categoriaProduto.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        imagemUrl: true,
      },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    const nome = String(formData.get("nome") || "").trim();
    const descricao = String(formData.get("descricao") || "").trim();
    const imagemUrlInformada = String(formData.get("imagemUrl") || "").trim();
    const categoriaMaeIdRaw = String(
      formData.get("categoriaMaeId") || ""
    ).trim();

    const categoriaMaeId = categoriaMaeIdRaw || null;

    if (!nome) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    if (categoriaMaeId === id) {
      return NextResponse.json(
        { error: "A categoria não pode ser mãe dela mesma." },
        { status: 400 }
      );
    }

    if (categoriaMaeId) {
      const categoriaMae = await prisma.categoriaProduto.findUnique({
        where: { id: categoriaMaeId },
        select: { id: true },
      });

      if (!categoriaMae) {
        return NextResponse.json(
          { error: "Categoria mãe não encontrada." },
          { status: 404 }
        );
      }

      const maeEhDescendente = await categoriaMaeEhDescendente(
        categoriaMaeId,
        id
      );

      if (maeEhDescendente) {
        return NextResponse.json(
          {
            error:
              "A categoria mãe não pode ser uma subcategoria da própria categoria.",
          },
          { status: 400 }
        );
      }
    }

    const imagem = formData.get("imagem");

    let imagemUrlFinal = imagemUrlInformada || null;

    if (imagem instanceof File && imagem.size > 0) {
      imagemUrlFinal = await salvarImagemCategoria(imagem);
    }

    const categoria = await prisma.categoriaProduto.update({
      where: { id },
      data: {
        nome,
        descricao: descricao || null,
        imagemUrl: imagemUrlFinal,
        categoriaMaeId,
        exibirNoMenu: parseBoolean(formData.get("exibirNoMenu"), true),
        ordemMenu: parseNumber(formData.get("ordemMenu"), 0),
      },
      select: categoriaSelect,
    });

    if (categoriaExistente.nome !== nome) {
    await prisma.produto.updateMany({
      where: {
        categoria: categoria.nome,
      },
      data: {
        categoria: nome,
      },
    });
    }

    return NextResponse.json({ categoria });
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar categoria.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const categoria = await prisma.categoriaProduto.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 }
      );
    }

    const subcategorias = await prisma.categoriaProduto.count({
      where: {
        categoriaMaeId: id,
      },
    });

    if (subcategorias > 0) {
      return NextResponse.json(
        {
          error:
            "Esta categoria possui subcategorias. Exclua ou mova as subcategorias antes.",
        },
        { status: 400 }
      );
    }

    const produtosComoPrincipal = await prisma.produto.count({
      where: {
        categoria: categoria.nome,
      },
    });

    if (produtosComoPrincipal > 0) {
      return NextResponse.json(
        {
          error:
            "Esta categoria está sendo usada como categoria principal de produtos.",
        },
        { status: 400 }
      );
    }

    const produtosRelacionados = await prisma.produtoCategoria.count({
      where: {
        categoriaId: id,
      },
    });

    if (produtosRelacionados > 0) {
      return NextResponse.json(
        {
          error:
            "Esta categoria está vinculada a produtos. Remova o vínculo antes de excluir.",
        },
        { status: 400 }
      );
    }

    await prisma.categoriaProduto.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
      categoriaId: id,
    });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir categoria.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}