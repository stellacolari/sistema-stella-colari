import { NextResponse } from "next/server";
import { limparSessaoAdmin } from "@/lib/auth/admin";

export async function POST() {
  await limparSessaoAdmin();

  return NextResponse.json({
    ok: true,
    redirectTo: "/login",
  });
}
