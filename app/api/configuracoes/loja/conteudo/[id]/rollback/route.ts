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
  rollbackConteudoParaLegado,
} from "@/lib/loja/conteudo/repository.server";
import { revalidarConteudoLoja } from "@/lib/loja/conteudo/revalidate.server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const usuario = await exigirAcessoConteudo("executar");
  if (!usuario) return erroConteudo("Você não possui permissão para executar rollback.", 403);
  if (!validarOrigemMutacao(request)) return erroConteudo("Origem da requisição inválida.", 403);
  if (!payloadDentroDoLimite(request)) return erroConteudo("Conteúdo excede o limite permitido.", 413);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return erroConteudo("JSON inválido.");
  if (!payloadJsonDentroDoLimite(body)) return erroConteudo("Conteúdo excede o limite permitido.", 413);

  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    return erroConteudo("Revisão inválida.");
  }

  const { id } = await context.params;
  const pagina = await buscarPaginaConteudoBase(id);
  if (!pagina) return erroConteudo("Página não encontrada.", 404);

  try {
    const result = await rollbackConteudoParaLegado({
      pagina,
      expectedRevision,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
    const cache = revalidarConteudoLoja(pagina);
    return NextResponse.json({
      ok: true,
      ...result,
      cacheRevalidado: cache.ok,
      avisoCache: cache.ok
        ? null
        : "O rollback foi concluído, mas a invalidação de cache ficou pendente.",
    });
  } catch (error) {
    if (error instanceof ConteudoConflitoRevisaoError) {
      return erroConteudo(error.message, 409);
    }
    if (error instanceof ConteudoValidacaoError) {
      return erroConteudo(error.message, 422, { issues: error.issues });
    }
    console.error("Erro ao executar rollback de conteúdo:", error);
    return erroConteudo("Não foi possível executar o rollback.", 500);
  }
}
