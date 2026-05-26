import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Login com Google ainda não configurado. Configure OAuth com GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
    },
    { status: 501 }
  );
}