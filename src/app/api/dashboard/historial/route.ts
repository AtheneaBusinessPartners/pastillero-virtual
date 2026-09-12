import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNowInTimezone } from "@/lib/time";
import { computeMonthlyHistory } from "@/lib/history";

export async function GET(request: NextRequest) {
  const householdId = request.nextUrl.searchParams.get("householdId");
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10);
  const month = parseInt(request.nextUrl.searchParams.get("month") ?? "", 10);

  if (!householdId || !year || !month) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // RLS ya restringe esto al dueño, pero comprobamos para devolver un 404 claro.
  const { data: household } = await supabase
    .from("households")
    .select("id, timezone")
    .eq("id", householdId)
    .eq("created_by", user.id)
    .single();

  if (!household) {
    return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 });
  }

  const { date: today } = getNowInTimezone(household.timezone);
  const days = await computeMonthlyHistory(supabase, household.id, year, month, today);

  return NextResponse.json({ days });
}
