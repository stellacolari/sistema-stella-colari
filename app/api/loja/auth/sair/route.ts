import { NextResponse } from "next/server";

const COOKIE_CLIENTE_ID = "stella_cliente_id";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_CLIENTE_ID, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}