export const LOJA_BLOB_HOSTNAME =
  "nre2lht5a4gtuks5.public.blob.vercel-storage.com";

export function imagemPublicaPodeSerOtimizada(
  value: string | null | undefined,
) {
  const src = String(value || "").trim();

  if (!src) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  try {
    const url = new URL(src);

    return url.protocol === "https:" && url.hostname === LOJA_BLOB_HOSTNAME;
  } catch {
    return false;
  }
}
