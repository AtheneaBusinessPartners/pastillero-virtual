import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { code, subscription } = await request.json();

  if (!code || !subscription?.endpoint) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("access_code", code.trim())
    .single();

  if (!household) {
    return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      household_id: household.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
