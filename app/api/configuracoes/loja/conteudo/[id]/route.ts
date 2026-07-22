import { NextResponse } from "next/server";
import {
  erroConteudo,
  exigirAcessoConteudo,
  payloadDentroDoLimite,
  payloadJsonDentroDoLimite,
  validarOrigemMutacao,
} from "@/lib/loja/conteudo/api-auth.server";
import {
  buscarPaginaConteudoBase,
  ConteudoConflitoRevisaoError,
  ConteudoValidacaoError,
  montarEstadoEditorConteudo,
  salvarRascunhoConteudo,
} from "@/lib/loja/conteudo/repository.server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const usuario = await exigirAcessoConteudo("ver");
  if (!usuario) return erroConteudo("Acesso não permitido.", 403);

  const { id } = await context.params;
  const pagina = await buscarPaginaConteudoBase(id);
  if (!pagina) return erroConteudo("Página não encontrada.", 404);

  return NextResponse.json(
    {
      ok: true,
      pagina: {
        id: pagina.id,
        titulo: pagina.titulo,
        slug: pagina.slug,
        tipo: pagina.tipo,
        ativo: pagina.ativo,
        statusPublicacao: pagina.statusPublicacao,
      },
      estado: await montarEstadoEditorConteudo(pagina),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const usuario = await exigirAcessoConteudo("editar");
  if (!usuario) return erroConteudo("Acesso não permitido.", 403);
  if (!validarOrigemMutacao(request)) return erroConteudo("Origem da requisição inválida.", 403);
  if (!payloadDentroDoLimite(request)) return erroConteudo("Conteúdo excede o limite permitido.", 413);

  const { id } = await context.params;
  const pagina = await buscarPaginaConteudoBase(id);
  if (!pagina) return erroConteudo("Página não encontrada.", 404);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return erroConteudo("JSON inválido.");
    if (!payloadJsonDentroDoLimite(body)) {
      return erroConteudo("Conteúdo excede o limite permitido.", 413);
    }
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return erroConteudo("Revisão do rascunho inválida.");
    }

    const result = await salvarRascunhoConteudo({
      pagina,
      input: body.content,
      expectedRevision,
      resumo: typeof body.summary === "string" ? body.summary : undefined,
      usuario: { id: usuario.id, nome: usuario.nome },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ConteudoConflitoRevisaoError) {
      return erroConteudo(error.message, 409);
    }
    if (error instanceof ConteudoValidacaoError) {
      return erroConteudo(error.message, 422, { issues: error.issues });
    }

    console.error("Erro ao salvar conteúdo da loja:", error);
    return erroConteudo("Não foi possível salvar o rascunho.", 500);
  }
}
