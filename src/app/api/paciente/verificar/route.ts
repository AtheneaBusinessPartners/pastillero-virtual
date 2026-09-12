import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, timezone")
    .eq("access_code", code.trim())
    .single();

  if (error || !household) {
    return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ household });
}
