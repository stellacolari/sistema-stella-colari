import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["CATEGORIA", "CAMPANHA", "LINK", "PAGINA"];
const PAGINAS_ESPECIAIS_VALIDAS = ["", "DESCONTOS", "TODAS_CATEGORIAS"];

function criarSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body.nome || "").trim();
    const tipo = String(body.tipo || "").trim();
    const linkUrl = String(body.linkUrl || "").trim();
    const categoria = String(body.categoria || "").trim();
    const paginaEspecial = String(body.paginaEspecial || "").trim();
    const categoriasSelecionadas = normalizarCategoriasSelecionadas(
      body.categoriasSelecionadas
    );
    const destaque = Boolean(body.destaque);
    const corDestaque = normalizarCor(body.corDestaque);
    const ordem = Number(body.ordem || 0);
    const ativo = Boolean(body.ativo);
    const dataInicio = getDateOrNull(body.dataInicio);
    const dataFim = getDateOrNull(body.dataFim);

    if (!nome) {
      return NextResponse.json(
        { error: "Nome do item de menu é obrigatório." },
        { status: 400 }
      );
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo de menu inválido." },
        { status: 400 }
      );
    }

    if (!PAGINAS_ESPECIAIS_VALIDAS.includes(paginaEspecial)) {
      return NextResponse.json(
        { error: "Página especial inválida." },
        { status: 400 }
      );
    }

    const baseSlug = criarSlug(nome);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Não foi possível gerar o slug do menu." },
        { status: 400 }
      );
    }

    let slug = baseSlug;
    let contador = 1;

    while (await prisma.menuLoja.findUnique({ where: { slug } })) {
      contador += 1;
      slug = `${baseSlug}-${contador}`;
    }

    const menu = await prisma.menuLoja.create({
      data: {
        nome,
        slug,
        tipo,
        linkUrl: linkUrl || null,
        categoria: categoria || null,
        paginaEspecial: paginaEspecial || null,
        categoriasSelecionadas: categoriasSelecionadas || null,
        destaque,
        corDestaque: destaque ? corDestaque || "#2e7b99" : null,
        ordem: Number.isFinite(ordem) ? ordem : 0,
        ativo,
        dataInicio,
        dataFim,
      },
    });

    return NextResponse.json({ ok: true, menu });
  } catch (error) {
    console.error("Erro ao criar menu da loja:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao criar menu da loja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}