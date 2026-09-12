import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNowInTimezone } from "@/lib/time";

export async function POST(request: NextRequest) {
  const { code, schedule_id, status } = await request.json();

  if (!code || !schedule_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: household } = await supabase
    .from("households")
    .select("id, timezone")
    .eq("access_code", code.trim())
    .single();
  if (!household) {
    return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
  }

  // Verifica que el horario pertenece a este hogar antes de escribir.
  const { data: schedule } = await supabase
    .from("schedules")
    .select("id, medication_id, medications!inner(household_id)")
    .eq("id", schedule_id)
    .single();

  const belongsToHousehold =
    schedule &&
    (Array.isArray(schedule.medications)
      ? schedule.medications[0]?.household_id
      : (schedule.medications as unknown as { household_id: string })?.household_id) ===
      household.id;

  if (!belongsToHousehold) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { date: today } = getNowInTimezone(household.timezone);
  const newStatus = status === "skipped" ? "skipped" : "taken";

  const { data: existingLog } = await supabase
    .from("intake_logs")
    .select("status")
    .eq("schedule_id", schedule_id)
    .eq("scheduled_date", today)
    .maybeSingle();

  const { error } = await supabase.from("intake_logs").upsert(
    {
      schedule_id,
      scheduled_date: today,
      status: newStatus,
      taken_at: new Date().toISOString(),
    },
    { onConflict: "schedule_id,scheduled_date" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Descuenta una unidad de stock solo la primera vez que se marca como tomada.
  if (newStatus === "taken" && existingLog?.status !== "taken") {
    const { data: medication } = await supabase
      .from("medications")
      .select("stock_quantity")
      .eq("id", schedule.medication_id)
      .single();

    if (medication?.stock_quantity != null && medication.stock_quantity > 0) {
      await supabase
        .from("medications")
        .update({ stock_quantity: medication.stock_quantity - 1 })
        .eq("id", schedule.medication_id);
    }
  }

  return NextResponse.json({ ok: true });
}
