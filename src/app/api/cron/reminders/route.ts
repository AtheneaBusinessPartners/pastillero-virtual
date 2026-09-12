import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNowInTimezone } from "@/lib/time";
import { getWebPush } from "@/lib/push";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const webpush = getWebPush();

  const { data: households, error: householdsError } = await supabase
    .from("households")
    .select("id, name, timezone");

  if (householdsError) {
    return NextResponse.json({ error: householdsError.message }, { status: 500 });
  }

  let notified = 0;

  for (const household of households ?? []) {
    const { date: today, time: nowTime, dayOfWeek } = getNowInTimezone(household.timezone);

    const { data: medications } = await supabase
      .from("medications")
      .select("id, name, schedules(id, time_of_day, days_of_week, active)")
      .eq("household_id", household.id)
      .eq("active", true);

    type ScheduleRow = { id: string; time_of_day: string; days_of_week: number[]; active: boolean };

    const dueSchedules = (medications ?? []).flatMap((med) =>
      ((med.schedules ?? []) as ScheduleRow[])
        .filter((s) => s.active && s.time_of_day === nowTime && s.days_of_week.includes(dayOfWeek))
        .map((s) => ({ scheduleId: s.id, medicationName: med.name, time: s.time_of_day }))
    );

    if (dueSchedules.length === 0) continue;

    for (const due of dueSchedules) {
      const { data: existing } = await supabase
        .from("intake_logs")
        .select("id")
        .eq("schedule_id", due.scheduleId)
        .eq("scheduled_date", today)
        .maybeSingle();

      if (!existing) {
        await supabase.from("intake_logs").insert({
          schedule_id: due.scheduleId,
          scheduled_date: today,
          status: "pending",
        });
      }
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("household_id", household.id);

    if (!subscriptions || subscriptions.length === 0) continue;

    const medicationNames = dueSchedules.map((d) => d.medicationName).join(", ");
    const payload = JSON.stringify({
      title: "💊 Hora de la pastilla",
      body: `Toca tomar: ${medicationNames}`,
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        notified++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notified });
}
