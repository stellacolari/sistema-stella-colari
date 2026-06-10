"use server";

import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/auth/admin";
import { regraAplicaACategoria } from "@/lib/regras-categoria";
import { unlink } from "fs/promises";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const LIMITE_IMAGEM_BASE64_MB = 6;
const LIMITE_IMAGEM_BASE64_BYTES = LIMITE_IMAGEM_BASE64_MB * 1024 * 1024;

type GaleriaProdutoPayloadItem = {
  id?: string;
  imagemUrl?: string;
  dataUrl?: string;
  ordem?: number;
};

type KitComponentePayloadItem = {
  componenteProdutoId?: string;
  quantidade?: number;
};
type ProdutoVariacaoPayload = {
  nome?: string;
  obrigatoria?: boolean;
  opcoes?: ProdutoVariacaoOpcaoPayload[];
};

type ProdutoVariacaoOpcaoPayload = {
  id?: string;
  nome?: string;
  imagemUrl?: string | null;
  precoAdicional?: number;
  custoAdicional?: number;
  ativo?: boolean;
  ordem?: number;
};
function gerarCodigoInterno(numero: number) {
  return `S${String(numero).padStart(6, "0")}`;
}

function numeroFormulario(value: FormDataEntryValue | string | null) {
  const texto = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!texto) return 0;

  const numero = Number(texto);
  return Number.isNaN(numero) ? 0 : numero;
}

function checkboxAtivo(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function idOpcional(value: FormDataEntryValue | null) {
  const texto = String(value || "").trim();
  return texto || null;
}

function numeroOpcionalFormulario(value: FormDataEntryValue | string | null) {
  const texto = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!texto) return null;

  const numero = Number(texto);
  return Number.isNaN(numero) ? null : numero;
}

function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function isImagemNovaBase64(value: string | null | undefined) {
  return Boolean(value && value.trim().startsWith("data:image/"));
}

function getPromocaoSegura({
  descontoAtivo,
  precoPromocionalRaw,
  precoVenda,
}: {
  descontoAtivo: boolean;
  precoPromocionalRaw: string;
  precoVenda: number;
}) {
  if (!descontoAtivo) {
    return {
      descontoAtivo: false,
      precoPromocional: null,
    };
  }

  const precoPromocional = numeroFormulario(precoPromocionalRaw);

  if (precoPromocional <= 0) {
    return {
      descontoAtivo: false,
      precoPromocional: null,
    };
  }

  if (precoPromocional >= precoVenda) {
    throw new Error("O preço promocional deve ser menor que o preço de venda.");
  }

  return {
    descontoAtivo: true,
    precoPromocional,
  };
}

function lerGaleriaProduto(formData: FormData) {
  const raw = String(formData.get("galeriaProduto") || "[]");

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .slice(0, 4)
      .map((item): GaleriaProdutoPayloadItem => {
        return {
          id: typeof item.id === "string" ? item.id : undefined,
          imagemUrl:
            typeof item.imagemUrl === "string" ? item.imagemUrl : undefined,
          dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : undefined,
          ordem: Number.isFinite(Number(item.ordem)) ? Number(item.ordem) : 0,
        };
      })
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  } catch {
    return [];
  }
}

function lerCategoriasIds(formData: FormData) {
  const categoriaPrincipalId = String(
    formData.get("categoriaPrincipalId") || ""
  ).trim();

  const raw = String(formData.get("categoriasIds") || "[]");

  let categoriasIds: string[] = [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      categoriasIds = parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
  } catch {
    categoriasIds = [];
  }

  const ids = new Set<string>();

  if (categoriaPrincipalId) {
    ids.add(categoriaPrincipalId);
  }

  categoriasIds.forEach((id) => ids.add(id));

  return {
    categoriaPrincipalId,
    categoriasIds: Array.from(ids),
  };
}
function lerVariacoesProduto(formData: FormData): ProdutoVariacaoPayload[] {
  const raw = String(formData.get("variacoesProduto") || "[]");

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((variacaoRaw): ProdutoVariacaoPayload => {
        const variacao = variacaoRaw as {
          nome?: unknown;
          obrigatoria?: unknown;
          opcoes?: unknown;
        };

        const nome = String(variacao.nome ?? "").trim();

        const opcoesRaw: unknown[] = Array.isArray(variacao.opcoes)
          ? variacao.opcoes
          : [];

        const opcoes = opcoesRaw
          .map((opcaoRaw, index): ProdutoVariacaoOpcaoPayload => {
            const opcao = opcaoRaw as {
              id?: unknown;
              nome?: unknown;
              imagemUrl?: unknown;
              precoAdicional?: unknown;
              custoAdicional?: unknown;
              ativo?: unknown;
              ordem?: unknown;
            };

            return {
              id: typeof opcao.id === "string" ? opcao.id : undefined,
              nome: String(opcao.nome ?? "").trim(),
              imagemUrl:
                typeof opcao.imagemUrl === "string" && opcao.imagemUrl.trim()
                  ? opcao.imagemUrl.trim()
                  : null,
              precoAdicional: Number(opcao.precoAdicional || 0),
              custoAdicional: Number(opcao.custoAdicional || 0),
              ativo: opcao.ativo !== false,
              ordem: Number.isFinite(Number(opcao.ordem))
                ? Number(opcao.ordem)
                : index,
            };
          })
          .filter((opcao): opcao is ProdutoVariacaoOpcaoPayload => {
            return Boolean(opcao.nome);
          });

        return {
          nome,
          obrigatoria: variacao.obrigatoria !== false,
          opcoes,
        };
      })
      .filter((variacao): variacao is ProdutoVariacaoPayload => {
        return Boolean(variacao.nome && variacao.opcoes?.length);
      });
  } catch {
    return [];
  }
}
function lerKitComponentes(formData: FormData) {
  const raw = String(formData.get("kitComponentes") || "[]");

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): KitComponentePayloadItem => {
        return {
          componenteProdutoId:
            typeof item.componenteProdutoId === "string"
              ? item.componenteProdutoId
              : undefined,
          quantidade: Number.isFinite(Number(item.quantidade))
            ? Number(item.quantidade)
            : 0,
        };
      })
      .filter(
        (item) =>
          item.componenteProdutoId && item.quantidade && item.quantidade > 0
      );
  } catch {
    return [];
  }
}

function lerEmbalagemProduto(formData: FormData) {
  return {
    embalagemClasseId: idOpcional(formData.get("embalagemClasseId")),
    embalagemUnidades:
      numeroOpcionalFormulario(formData.get("embalagemUnidades")) ?? 1,
    embalagemCompartilhavel: checkboxAtivo(
      formData.get("embalagemCompartilhavel")
    ),
    embalagemIndividualObrigatoria: checkboxAtivo(
      formData.get("embalagemIndividualObrigatoria")
    ),
    embalagemModeloPreferencialId: idOpcional(
      formData.get("embalagemModeloPreferencialId")
    ),
    permiteEmbalagemPresente: checkboxAtivo(
      formData.get("permiteEmbalagemPresente")
    ),
    embalagemPresentePadraoId: idOpcional(
      formData.get("embalagemPresentePadraoId")
    ),
    pesoGramas: numeroOpcionalFormulario(formData.get("pesoGramas")),
    alturaCm: numeroOpcionalFormulario(formData.get("alturaCm")),
    larguraCm: numeroOpcionalFormulario(formData.get("larguraCm")),
    comprimentoCm: numeroOpcionalFormulario(formData.get("comprimentoCm")),
  };
}

async function calcularCustoBaseProduto({
  tipoProduto,
  custoBaseDigitado,
  componentes,
}: {
  tipoProduto: string;
  custoBaseDigitado: number;
  componentes: KitComponentePayloadItem[];
}) {
  if (tipoProduto !== "KIT") {
    return custoBaseDigitado;
  }

  if (componentes.length === 0) {
    throw new Error("Produto do tipo kit precisa ter ao menos um componente.");
  }

  const idsComponentes = Array.from(
    new Set(
      componentes
        .map((item) => item.componenteProdutoId)
        .filter(Boolean) as string[]
    )
  );

  const produtosComponentes = await prisma.produto.findMany({
    where: {
      id: {
        in: idsComponentes,
      },
    },
    select: {
      id: true,
      custoBase: true,
      tipoProduto: true,
      status: true,
    },
  });

  if (produtosComponentes.length !== idsComponentes.length) {
    throw new Error("Um ou mais componentes do kit não foram encontrados.");
  }

  const componenteKit = produtosComponentes.find(
    (produto) => produto.tipoProduto === "KIT"
  );

  if (componenteKit) {
    throw new Error(
      "Não use um kit dentro de outro kit. Escolha produtos unitários."
    );
  }

  const componenteNaLixeira = produtosComponentes.find(
    (produto) => produto.status === "NA_LIXEIRA"
  );

  if (componenteNaLixeira) {
    throw new Error("Não é possível usar produto da lixeira como componente.");
  }

  const mapaCustos = new Map(
    produtosComponentes.map((produto) => [produto.id, Number(produto.custoBase)])
  );

  const custoCalculado = componentes.reduce((total, componente) => {
    const componenteId = componente.componenteProdutoId as string;
    const quantidade = Number(componente.quantidade || 1);
    const custoComponente = mapaCustos.get(componenteId) || 0;

    return total + custoComponente * quantidade;
  }, 0);

  if (custoCalculado <= 0) {
    throw new Error("O custo calculado do kit precisa ser maior que zero.");
  }

  return custoCalculado;
}

async function calcularCustoAdicionaisCategoria(categoriaNome: string) {
  const categoria = String(categoriaNome || "").trim();

  if (!categoria) {
    return 0;
  }

  const regras = await prisma.regraCategoria.findMany({
    include: {
      itemAdicional: {
        select: {
          id: true,
          custoBase: true,
          ativo: true,
          status: true,
        },
      },
    },
  });

  const custoAdicionais = regras.reduce((total, regra) => {
    if (!regraAplicaACategoria(regra, categoria)) {
      return total;
    }

    const itemAtivo =
      regra.itemAdicional.ativo && regra.itemAdicional.status !== "NA_LIXEIRA";

    if (!itemAtivo) {
      return total;
    }

    const quantidade = Number(regra.quantidade || 0);
    const custoUnitario = Number(regra.itemAdicional.custoBase || 0);

    return total + quantidade * custoUnitario;
  }, 0);

  return arredondarMoeda(custoAdicionais);
}

async function calcularPrecoVendaFinal({
  custoBase,
  margemAplicada,
  categoriaNome,
}: {
  custoBase: number;
  margemAplicada: number;
  categoriaNome: string;
}) {
  const custo = Number(custoBase || 0);
  const margem = Number(margemAplicada || 0);
  const custoAdicionais = await calcularCustoAdicionaisCategoria(categoriaNome);

  return arredondarMoeda(custo * margem + custoAdicionais);
}

async function salvarImagemBase64(
  dataUrl: string,
  codigoInterno: string,
  sufixo: string
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("Imagem inválida.");
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Formato da imagem inválido.");
  }

  const mimeType = match[1];
  const base64 = match[2];

  const extensaoPorMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extensao = extensaoPorMime[mimeType] || "jpg";

  const codigoSeguro = codigoInterno
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const sufixoSeguro = sufixo
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const nomeArquivo = `produtos/${codigoSeguro}-${sufixoSeguro}-${Date.now()}.${extensao}`;

const buffer = Buffer.from(base64, "base64");

if (buffer.length > LIMITE_IMAGEM_BASE64_BYTES) {
  throw new Error(
    `A imagem processada ficou muito grande. Ajuste o corte ou comprima a imagem antes de salvar. Limite: ${LIMITE_IMAGEM_BASE64_MB} MB.`
  );
}

const blob = await put(nomeArquivo, buffer, {
  access: "public",
  contentType: mimeType,
  addRandomSuffix: true,
});

  return blob.url;
}

async function removerImagemAntiga(imagemUrl?: string | null) {
  if (!imagemUrl) {
    return;
  }

  try {
    if (imagemUrl.includes("blob.vercel-storage.com")) {
      await del(imagemUrl);
      return;
    }

    if (imagemUrl.startsWith("/uploads/")) {
      const caminhoLocal = `${process.cwd()}/public${imagemUrl}`;
      await unlink(caminhoLocal).catch(() => {});
    }
  } catch (error) {
    console.warn("Não foi possível remover a imagem do produto:", error);
  }
}

async function sincronizarGaleriaProduto({
  produtoId,
  codigoInterno,
  galeria,
}: {
  produtoId: string;
  codigoInterno: string;
  galeria: GaleriaProdutoPayloadItem[];
}) {
  const imagensAtuais = await prisma.produtoImagem.findMany({
    where: {
      produtoId,
    },
    orderBy: {
      ordem: "asc",
    },
  });

  const imagensAtuaisMap = new Map(
    imagensAtuais.map((imagem) => [imagem.id, imagem])
  );

  const idsMantidos = new Set<string>();
  const imagensFinais: { id?: string; imagemUrl: string; ordem: number }[] = [];

for (const [index, item] of galeria.entries()) {
  if (isImagemNovaBase64(item.dataUrl)) {
    const imagemUrl = await salvarImagemBase64(
      item.dataUrl!,
      codigoInterno,
      `galeria-${index + 1}`
    );

    const criada = await prisma.produtoImagem.create({
      data: {
        produtoId,
        imagemUrl,
        ordem: index,
      },
    });

    idsMantidos.add(criada.id);

    imagensFinais.push({
      id: criada.id,
      imagemUrl: criada.imagemUrl,
      ordem: criada.ordem,
    });

    continue;
  }

  if (item.id && imagensAtuaisMap.has(item.id)) {
    const imagemAtual = imagensAtuaisMap.get(item.id)!;

    idsMantidos.add(item.id);

    await prisma.produtoImagem.update({
      where: {
        id: item.id,
      },
      data: {
        ordem: index,
      },
    });

    imagensFinais.push({
      id: item.id,
      imagemUrl: imagemAtual.imagemUrl,
      ordem: index,
    });

    continue;
  }

    if (item.imagemUrl) {
      const criada = await prisma.produtoImagem.create({
        data: {
          produtoId,
          imagemUrl: item.imagemUrl,
          ordem: index,
        },
      });

      idsMantidos.add(criada.id);

      imagensFinais.push({
        id: criada.id,
        imagemUrl: criada.imagemUrl,
        ordem: criada.ordem,
      });
    }
  }

  const imagensRemovidas = imagensAtuais.filter(
    (imagem) => !idsMantidos.has(imagem.id)
  );

  for (const imagem of imagensRemovidas) {
    await prisma.produtoImagem.delete({
      where: {
        id: imagem.id,
      },
    });

    await removerImagemAntiga(imagem.imagemUrl);
  }

  const ordenadas = imagensFinais.sort((a, b) => a.ordem - b.ordem);
  const imagemPrincipal = ordenadas[0]?.imagemUrl ?? null;
  const imagemHover = ordenadas[1]?.imagemUrl ?? null;

  await prisma.produto.update({
    where: {
      id: produtoId,
    },
    data: {
      imagemUrl: imagemPrincipal,
      imagemHoverUrl: imagemHover,
    },
  });
}

async function sincronizarCategoriasProduto({
  produtoId,
  categoriaPrincipalId,
  categoriasIds,
}: {
  produtoId: string;
  categoriaPrincipalId: string;
  categoriasIds: string[];
}) {
  if (!categoriaPrincipalId) {
    throw new Error("Categoria principal é obrigatória.");
  }

  const categorias = await prisma.categoriaProduto.findMany({
    where: {
      id: {
        in: Array.from(new Set([categoriaPrincipalId, ...categoriasIds])),
      },
    },
    select: {
      id: true,
      nome: true,
    },
  });

  const categoriaPrincipal = categorias.find(
    (categoria) => categoria.id === categoriaPrincipalId
  );

  if (!categoriaPrincipal) {
    throw new Error("Categoria principal não encontrada.");
  }

  await prisma.produto.update({
    where: {
      id: produtoId,
    },
    data: {
      categoria: categoriaPrincipal.nome,
    },
  });

  await prisma.produtoCategoria.deleteMany({
    where: {
      produtoId,
    },
  });

  await prisma.produtoCategoria.createMany({
    data: categorias.map((categoria) => ({
      produtoId,
      categoriaId: categoria.id,
      principal: categoria.id === categoriaPrincipalId,
    })),
    skipDuplicates: true,
  });

  return categoriaPrincipal.nome;
}
async function sincronizarVariacoesProduto({
  produtoId,
  variacoes,
}: {
  produtoId: string;
  variacoes: ProdutoVariacaoPayload[];
}) {
  await prisma.produtoVariacao.deleteMany({
    where: {
      produtoId,
    },
  });

  if (variacoes.length === 0) {
    return;
  }

  for (const [index, variacao] of variacoes.entries()) {
    const variacaoCriada = await prisma.produtoVariacao.create({
      data: {
        produtoId,
        nome: variacao.nome as string,
        obrigatoria: variacao.obrigatoria !== false,
        ativo: true,
        ordem: index,
      },
    });

    const opcoes = variacao.opcoes || [];

    if (opcoes.length > 0) {
      await prisma.produtoVariacaoOpcao.createMany({
        data: opcoes.map((opcao, opcaoIndex) => ({
          variacaoId: variacaoCriada.id,
          nome: opcao.nome as string,
          imagemUrl: opcao.imagemUrl || null,
          precoAdicional: Number(opcao.precoAdicional || 0),
          custoAdicional: Number(opcao.custoAdicional || 0),
          ativo: opcao.ativo !== false,
          ordem: Number.isFinite(Number(opcao.ordem))
            ? Number(opcao.ordem)
            : opcaoIndex,
        })),
      });
    }
  }
}
async function sincronizarComponentesKit({
  produtoId,
  tipoProduto,
  componentes,
}: {
  produtoId: string;
  tipoProduto: string;
  componentes: KitComponentePayloadItem[];
}) {
  await prisma.produtoKitComponente.deleteMany({
    where: {
      kitProdutoId: produtoId,
    },
  });

  if (tipoProduto !== "KIT") {
    return;
  }

  if (componentes.length === 0) {
    throw new Error("Produto do tipo kit precisa ter ao menos um componente.");
  }

  const idsComponentes = Array.from(
    new Set(
      componentes
        .map((item) => item.componenteProdutoId)
        .filter(Boolean) as string[]
    )
  );

  if (idsComponentes.includes(produtoId)) {
    throw new Error("Um kit não pode usar ele mesmo como componente.");
  }

  await prisma.produtoKitComponente.createMany({
    data: componentes.map((item) => ({
      kitProdutoId: produtoId,
      componenteProdutoId: item.componenteProdutoId as string,
      quantidade: Number(item.quantidade || 1),
    })),
    skipDuplicates: true,
  });
}

async function buscarCategoriaPrincipalObrigatoria(categoriaPrincipalId: string) {
  const categoriaPrincipal = await prisma.categoriaProduto.findUnique({
    where: {
      id: categoriaPrincipalId,
    },
    select: {
      nome: true,
    },
  });

  if (!categoriaPrincipal) {
    throw new Error("Categoria principal não encontrada.");
  }

  return categoriaPrincipal;
}

export async function criarProduto(formData: FormData) {
  const usuario = await exigirAdmin();
  const podeEditarEmbalagem = usuario.perfil === "ACESSO_GERAL";
  const nome = String(formData.get("nome") || "").trim();
  const codigoFornecedor = String(formData.get("codigoFornecedor") || "").trim();
  const linkCompra = String(formData.get("linkCompra") || "").trim();
  const custoBaseDigitado = numeroFormulario(formData.get("custoBase"));
  const margemAplicada = numeroFormulario(formData.get("margemAplicada"));
  const fornecedorPadrao = String(formData.get("fornecedorPadrao") || "").trim();
  const descricaoLoja = String(formData.get("descricaoLoja") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const galeriaProduto = lerGaleriaProduto(formData);
  const variacoesProduto = lerVariacoesProduto(formData);
  const { categoriaPrincipalId, categoriasIds } = lerCategoriasIds(formData);
  const tipoProduto = String(formData.get("tipoProduto") || "UNITARIO").trim();
  const tipoProdutoFinal = tipoProduto === "KIT" ? "KIT" : "UNITARIO";
  const kitComponentes = lerKitComponentes(formData);
  const embalagemProduto = podeEditarEmbalagem
    ? lerEmbalagemProduto(formData)
    : {};

  const descontoAtivoSolicitado = checkboxAtivo(formData.get("descontoAtivo"));
  const precoPromocionalRaw = String(
    formData.get("precoPromocional") || ""
  ).trim();

  if (!nome) throw new Error("Nome do produto é obrigatório.");
  if (!categoriaPrincipalId) throw new Error("Categoria principal é obrigatória.");
  if (!fornecedorPadrao) throw new Error("Fornecedor padrão é obrigatório.");

  if (tipoProdutoFinal !== "KIT" && custoBaseDigitado <= 0) {
    throw new Error("Custo base deve ser maior que zero.");
  }

  if (margemAplicada <= 0) {
    throw new Error("Margem aplicada deve ser maior que zero.");
  }

  if (tipoProdutoFinal === "KIT" && kitComponentes.length === 0) {
    throw new Error("Produto do tipo kit precisa ter ao menos um componente.");
  }

  const [custoBaseFinal, categoriaPrincipal] = await Promise.all([
    calcularCustoBaseProduto({
      tipoProduto: tipoProdutoFinal,
      custoBaseDigitado,
      componentes: kitComponentes,
    }),
    buscarCategoriaPrincipalObrigatoria(categoriaPrincipalId),
  ]);

  const ultimoProduto = await prisma.produto.findFirst({
    orderBy: { criadoEm: "desc" },
    select: { codigoInterno: true },
  });

  let proximoNumero = 1;

  if (ultimoProduto?.codigoInterno) {
    const numeroAtual = Number(ultimoProduto.codigoInterno.replace("S", ""));
    if (!Number.isNaN(numeroAtual)) {
      proximoNumero = numeroAtual + 1;
    }
  }

  const codigoInterno = gerarCodigoInterno(proximoNumero);

  const precoVenda = await calcularPrecoVendaFinal({
    custoBase: custoBaseFinal,
    margemAplicada,
    categoriaNome: categoriaPrincipal.nome,
  });

  const promocao = getPromocaoSegura({
    descontoAtivo: descontoAtivoSolicitado,
    precoPromocionalRaw,
    precoVenda,
  });

  const produto = await prisma.produto.create({
    data: {
      codigoInterno,
      codigoFornecedor: codigoFornecedor || null,
      nome,
      imagemUrl: null,
      imagemHoverUrl: null,
      linkCompra: linkCompra || null,
      custoBase: custoBaseFinal,
      margemAplicada,
      precoVenda,
      descontoAtivo: promocao.descontoAtivo,
      precoPromocional: promocao.precoPromocional,
      descricaoLoja: descricaoLoja || null,
      categoria: categoriaPrincipal.nome,
      fornecedorPadrao,
      observacoes: observacoes || null,
      tipoProduto: tipoProdutoFinal,
      ...embalagemProduto,
    },
  });

  await sincronizarCategoriasProduto({
    produtoId: produto.id,
    categoriaPrincipalId,
    categoriasIds,
  });
  await sincronizarComponentesKit({
    produtoId: produto.id,
    tipoProduto: tipoProdutoFinal,
    componentes: kitComponentes,
  });

  await sincronizarVariacoesProduto({
    produtoId: produto.id,
    variacoes: variacoesProduto,
  });

  await sincronizarGaleriaProduto({
    produtoId: produto.id,
    codigoInterno,
    galeria: galeriaProduto,
  });

  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
  redirect("/produtos");
}

export async function atualizarProduto(id: string, formData: FormData) {
  const usuario = await exigirAdmin();
  const podeEditarEmbalagem = usuario.perfil === "ACESSO_GERAL";
  const nome = String(formData.get("nome") || "").trim();
  const codigoFornecedor = String(formData.get("codigoFornecedor") || "").trim();
  const linkCompra = String(formData.get("linkCompra") || "").trim();
  const custoBaseDigitado = numeroFormulario(formData.get("custoBase"));
  const margemAplicada = numeroFormulario(formData.get("margemAplicada"));
  const fornecedorPadrao = String(formData.get("fornecedorPadrao") || "").trim();
  const descricaoLoja = String(formData.get("descricaoLoja") || "").trim();
  const observacoes = String(formData.get("observacoes") || "").trim();
  const galeriaProduto = lerGaleriaProduto(formData);
  const variacoesProduto = lerVariacoesProduto(formData);
  const { categoriaPrincipalId, categoriasIds } = lerCategoriasIds(formData);
  const tipoProduto = String(formData.get("tipoProduto") || "UNITARIO").trim();
  const tipoProdutoFinal = tipoProduto === "KIT" ? "KIT" : "UNITARIO";
  const kitComponentes = lerKitComponentes(formData);
  const embalagemProduto = podeEditarEmbalagem
    ? lerEmbalagemProduto(formData)
    : {};

  const descontoAtivoSolicitado = checkboxAtivo(formData.get("descontoAtivo"));
  const precoPromocionalRaw = String(
    formData.get("precoPromocional") || ""
  ).trim();

  if (!nome) throw new Error("Nome do produto é obrigatório.");
  if (!categoriaPrincipalId) throw new Error("Categoria principal é obrigatória.");
  if (!fornecedorPadrao) throw new Error("Fornecedor padrão é obrigatório.");

  if (tipoProdutoFinal !== "KIT" && custoBaseDigitado <= 0) {
    throw new Error("Custo base deve ser maior que zero.");
  }

  if (margemAplicada <= 0) {
    throw new Error("Margem aplicada deve ser maior que zero.");
  }

  if (tipoProdutoFinal === "KIT" && kitComponentes.length === 0) {
    throw new Error("Produto do tipo kit precisa ter ao menos um componente.");
  }

  const produtoAtual = await prisma.produto.findUnique({
    where: { id },
    select: {
      codigoInterno: true,
    },
  });

  if (!produtoAtual) {
    throw new Error("Produto não encontrado.");
  }

  const [custoBaseFinal, categoriaPrincipal] = await Promise.all([
    calcularCustoBaseProduto({
      tipoProduto: tipoProdutoFinal,
      custoBaseDigitado,
      componentes: kitComponentes,
    }),
    buscarCategoriaPrincipalObrigatoria(categoriaPrincipalId),
  ]);

  const precoVenda = await calcularPrecoVendaFinal({
    custoBase: custoBaseFinal,
    margemAplicada,
    categoriaNome: categoriaPrincipal.nome,
  });

  const promocao = getPromocaoSegura({
    descontoAtivo: descontoAtivoSolicitado,
    precoPromocionalRaw,
    precoVenda,
  });

  await prisma.produto.update({
    where: { id },
    data: {
      codigoFornecedor: codigoFornecedor || null,
      nome,
      linkCompra: linkCompra || null,
      custoBase: custoBaseFinal,
      margemAplicada,
      precoVenda,
      descontoAtivo: promocao.descontoAtivo,
      precoPromocional: promocao.precoPromocional,
      descricaoLoja: descricaoLoja || null,
      categoria: categoriaPrincipal.nome,
      fornecedorPadrao,
      observacoes: observacoes || null,
      tipoProduto: tipoProdutoFinal,
      ...embalagemProduto,
    },
  });

  await sincronizarCategoriasProduto({
    produtoId: id,
    categoriaPrincipalId,
    categoriasIds,
  });
  await sincronizarComponentesKit({
    produtoId: id,
    tipoProduto: tipoProdutoFinal,
    componentes: kitComponentes,
  });

  await sincronizarVariacoesProduto({
    produtoId: id,
    variacoes: variacoesProduto,
  });

  await sincronizarGaleriaProduto({
    produtoId: id,
    codigoInterno: produtoAtual.codigoInterno,
    galeria: galeriaProduto,
  });

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${id}`);
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
  redirect("/produtos");
}

export async function alternarStatusProduto(id: string, ativoAtual: boolean) {
  await prisma.produto.update({
    where: { id },
    data: {
      ativo: !ativoAtual,
    },
  });

  revalidatePath("/produtos");
  revalidatePath("/loja");
  revalidatePath("/loja/descontos");
}
