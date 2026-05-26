import { prisma } from "../lib/prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const produtos = await prisma.produto.findMany({
    select: {
      id: true,
      categoria: true,
    },
  });

  for (const produto of produtos) {
    const nomeCategoria = String(produto.categoria || "").trim();

    if (!nomeCategoria) continue;

    const slug = slugify(nomeCategoria);

    const categoria = await prisma.categoriaProduto.upsert({
      where: { slug },
      update: {
        nome: nomeCategoria,
        ativo: true,
      },
      create: {
        nome: nomeCategoria,
        slug,
        ativo: true,
      },
    });

    const relacaoExistente = await prisma.produtoCategoria.findUnique({
      where: {
        produtoId_categoriaId: {
          produtoId: produto.id,
          categoriaId: categoria.id,
        },
      },
    });

    if (!relacaoExistente) {
      await prisma.produtoCategoria.create({
        data: {
          produtoId: produto.id,
          categoriaId: categoria.id,
          principal: true,
        },
      });
    }
  }

  console.log("Categorias migradas com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });