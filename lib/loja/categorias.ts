import { prisma } from "@/lib/prisma";
import type { CategoriaMenuPublicoItem } from "@/components/loja/MenuPublicoLoja";

export type CategoriaLojaOption = {
  id: string;
  nome: string;
  slug: string;
  categoriaMaeId: string | null;
  descricao?: string | null;
  descricaoSeo?: string | null;
  termosBusca?: string | null;
  imagemUrl?: string | null;
  exibirNoMenu?: boolean;
  ordemMenu?: number;
};

export type CategoriaLojaComCaminho = CategoriaLojaOption & {
  caminho: string;
};

export type CategoriaLojaComFilhos = CategoriaLojaOption & {
  filhos: CategoriaLojaComFilhos[];
};

export function slugifyCategoria(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function montarCaminhoCategoria(
  categoria: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  },
  categorias: {
    id: string;
    nome: string;
    categoriaMaeId: string | null;
  }[]
) {
  const mapa = new Map(categorias.map((item) => [item.id, item]));
  const partes = [categoria.nome];

  let atual = categoria.categoriaMaeId
    ? mapa.get(categoria.categoriaMaeId)
    : null;

  while (atual) {
    partes.unshift(atual.nome);
    atual = atual.categoriaMaeId ? mapa.get(atual.categoriaMaeId) : null;
  }

  return partes.join(" > ");
}

function ordenarCategoriasTree(items: CategoriaLojaComFilhos[]): CategoriaLojaComFilhos[] {
  return [...items]
    .sort((a, b) => {
      const ordemA = Number(a.ordemMenu ?? 0);
      const ordemB = Number(b.ordemMenu ?? 0);

      if (ordemA !== ordemB) return ordemA - ordemB;

      return a.nome.localeCompare(b.nome);
    })
  .map((item): CategoriaLojaComFilhos => ({
    ...item,
    filhos: ordenarCategoriasTree(item.filhos),
  }));
}

export function montarArvoreCategorias(
  categorias: CategoriaLojaOption[]
): CategoriaLojaComFilhos[] {
  const mapa = new Map<string, CategoriaLojaComFilhos>();

  categorias.forEach((categoria) => {
    mapa.set(categoria.id, {
      ...categoria,
      filhos: [],
    });
  });

  const raiz: CategoriaLojaComFilhos[] = [];

  mapa.forEach((categoria) => {
    if (categoria.categoriaMaeId && mapa.has(categoria.categoriaMaeId)) {
      mapa.get(categoria.categoriaMaeId)!.filhos.push(categoria);
      return;
    }

    raiz.push(categoria);
  });

  return ordenarCategoriasTree(raiz);
}

export function coletarIdsCategoriaComFilhas(
  categoriaId: string,
  categorias: CategoriaLojaOption[]
) {
  const ids = new Set<string>();
  const filhosPorPai = new Map<string, CategoriaLojaOption[]>();

  categorias.forEach((categoria) => {
    if (!categoria.categoriaMaeId) return;

    const filhos = filhosPorPai.get(categoria.categoriaMaeId) || [];
    filhos.push(categoria);
    filhosPorPai.set(categoria.categoriaMaeId, filhos);
  });

  function visitar(id: string) {
    ids.add(id);

    const filhos = filhosPorPai.get(id) || [];

    filhos.forEach((filho) => visitar(filho.id));
  }

  visitar(categoriaId);

  return Array.from(ids);
}

export async function buscarCategoriasMenuPublico(): Promise<
  CategoriaMenuPublicoItem[]
> {
  const categorias = await prisma.categoriaProduto.findMany({
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
      produtos: {
        where: {
          produto: {
            ativo: true,
            status: {
              not: "NA_LIXEIRA",
            },
          },
        },
        select: {
          produtoId: true,
        },
      },
    },
    orderBy: [{ ordemMenu: "asc" }, { nome: "asc" }],
  });

  const categoriasPorId = new Map(
    categorias.map((categoria) => [categoria.id, categoria])
  );
  const categoriasComConteudo = new Set<string>();

  categorias.forEach((categoria) => {
    if (categoria.produtos.length === 0) return;

    let atual: typeof categoria | undefined = categoria;
    const visitadas = new Set<string>();

    while (atual && !visitadas.has(atual.id)) {
      visitadas.add(atual.id);
      categoriasComConteudo.add(atual.id);
      atual = atual.categoriaMaeId
        ? categoriasPorId.get(atual.categoriaMaeId)
        : undefined;
    }
  });

  return categorias
    .filter((categoria) => categoriasComConteudo.has(categoria.id))
    .map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    descricao: categoria.descricao,
    imagemUrl: categoria.imagemUrl,
    exibirNoMenu: categoria.exibirNoMenu,
    ordemMenu: categoria.ordemMenu,
  }));
}

export async function buscarCategoriasAtivasComCaminho(): Promise<
  CategoriaLojaComCaminho[]
> {
  const categorias = await prisma.categoriaProduto.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      slug: true,
      categoriaMaeId: true,
      descricao: true,
      descricaoSeo: true,
      termosBusca: true,
      imagemUrl: true,
      exibirNoMenu: true,
      ordemMenu: true,
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return categorias.map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    categoriaMaeId: categoria.categoriaMaeId,
    descricao: categoria.descricao,
    descricaoSeo: categoria.descricaoSeo,
    termosBusca: categoria.termosBusca,
    imagemUrl: categoria.imagemUrl,
    exibirNoMenu: categoria.exibirNoMenu,
    ordemMenu: categoria.ordemMenu,
    caminho: montarCaminhoCategoria(categoria, categorias),
  }));
}

export async function buscarCategoriaPublicaPorSlug(slug: string) {
  const categorias = await prisma.categoriaProduto.findMany({
    where: {
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      slug: true,
      categoriaMaeId: true,
      descricao: true,
      descricaoSeo: true,
      imagemUrl: true,
      exibirNoMenu: true,
      ordemMenu: true,
    },
    orderBy: [{ ordemMenu: "asc" }, { nome: "asc" }],
  });

  const categoria = categorias.find(
    (item) => item.slug === slug || slugifyCategoria(item.nome) === slug
  );

  if (!categoria) {
    return null;
  }

  const idsCategoria = coletarIdsCategoriaComFilhas(categoria.id, categorias);

  const subcategorias = categorias
    .filter((item) => item.categoriaMaeId === categoria.id)
    .sort((a, b) => {
      const ordemA = Number(a.ordemMenu ?? 0);
      const ordemB = Number(b.ordemMenu ?? 0);

      if (ordemA !== ordemB) return ordemA - ordemB;

      return a.nome.localeCompare(b.nome);
    });

  return {
    categoria: {
      ...categoria,
      caminho: montarCaminhoCategoria(categoria, categorias),
    },
    subcategorias,
    idsCategoria,
  };
}
