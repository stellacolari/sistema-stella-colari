import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["CATEGORIA", "CAMPANHA", "LINK", "PAGINA"];
const PAGINAS_ESPECIAIS_VALIDAS = ["", "DESCONTOS", "TODAS_CATEGORIAS"];

function getDateOrNull(value: unknown) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizarCor(value: unknown) {
  const cor = String(value || "").trim();

  if (!cor) return null;

  if (/^#[0-9A-Fa-f]{6}$/.test(cor)) {
    return cor;
  }

  return "#2e7b99";
}

function normalizarCategoriasSelecionadas(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("|");
  }

  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("|");
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data: {
      nome?: string;
      tipo?: string;
      linkUrl?: string | null;
      categoria?: string | null;
      paginaEspecial?: string | null;
      categoriasSelecionadas?: string | null;
      destaque?: boolean;
      corDestaque?: string | null;
      ordem?: number;
      ativo?: boolean;
      dataInicio?: Date | null;
      dataFim?: Date | null;
    } = {};

    if ("nome" in body) {
      const nome = String(body.nome || "").trim();

      if (!nome) {
        return NextResponse.json(
          { error: "Nome do menu é obrigatório." },
          { status: 400 }
        );
      }

      data.nome = nome;
    }

    if ("tipo" in body) {
      const tipo = String(body.tipo || "").trim();

      if (!TIPOS_VALIDOS.includes(tipo)) {
        return NextResponse.json(
          { error: "Tipo de menu inválido." },
          { status: 400 }
        );
      }

      data.tipo = tipo;
    }

    if ("linkUrl" in body) {
      data.linkUrl = String(body.linkUrl || "").trim() || null;
    }

    if ("categoria" in body) {
      data.categoria = String(body.categoria || "").trim() || null;
    }

    if ("paginaEspecial" in body) {
      const paginaEspecial = String(body.paginaEspecial || "").trim();

      if (!PAGINAS_ESPECIAIS_VALIDAS.includes(paginaEspecial)) {
        return NextResponse.json(
          { error: "Página especial inválida." },
          { status: 400 }
        );
      }

      data.paginaEspecial = paginaEspecial || null;
    }

    if ("categoriasSelecionadas" in body) {
      data.categoriasSelecionadas =
        normalizarCategoriasSelecionadas(body.categoriasSelecionadas) || null;
    }

    if ("destaque" in body) {
      data.destaque = Boolean(body.destaque);
    }

    if ("corDestaque" in body) {
      data.corDestaque = normalizarCor(body.corDestaque);
    }

    if ("ordem" in body) {
      const ordem = Number(body.ordem);
      data.ordem = Number.isFinite(ordem) ? ordem : 0;
    }

    if ("ativo" in body) {
      data.ativo = Boolean(body.ativo);
    }

    if ("dataInicio" in body) {
      data.dataInicio = getDateOrNull(body.dataInicio);
    }

    if ("dataFim" in body) {
      data.dataFim = getDateOrNull(body.dataFim);
    }

    const menu = await prisma.menuLoja.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, menu });
  } catch (error) {
    console.error("Erro ao atualizar menu da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar menu.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await prisma.menuLoja.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir menu da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir menu.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}