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
  ConteudoVersaoNaoEncontradaError,
  restaurarVersaoConteudo,
} from "@/lib/loja/conteudo/repository.server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const usuario = await exigirAcessoConteudo("executar");
  if (!usuario) return erroConteudo("Você não possui permissão para restaurar versões.", 403);
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
    const versaoId = String(body.versionId ?? "").trim();
    const expectedRevision = Number(body.expectedRevision);
    if (!versaoId || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      return erroConteudo("Versão ou revisão inválida.");
    }

    const result = await restaurarVersaoConteudo({
      pagina,
      versaoId,
      expectedRevision,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ConteudoConflitoRevisaoError) {
      return erroConteudo(error.message, 409);
    }
    if (error instanceof ConteudoVersaoNaoEncontradaError) {
      return erroConteudo(error.message, 404);
    }
    if (error instanceof ConteudoValidacaoError) {
      return erroConteudo(error.message, 422, { issues: error.issues });
    }
    console.error("Erro ao restaurar conteúdo da loja:", error);
    return erroConteudo("Não foi possível restaurar a versão.", 500);
  }
}
