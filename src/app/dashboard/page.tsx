import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNowInTimezone } from "@/lib/time";
import type { SupabaseClient } from "@supabase/supabase-js";

type ScheduleRow = { id: string; days_of_week: number[] };

async function getTodaySummary(
  supabase: SupabaseClient,
  householdId: string,
  timezone: string
) {
  const { date: today, dayOfWeek } = getNowInTimezone(timezone);

  const { data: medications } = await supabase
    .from("medications")
    .select("schedules(id, days_of_week)")
    .eq("household_id", householdId)
    .eq("active", true);

  const scheduleIds = (medications ?? []).flatMap((m) =>
    ((m.schedules ?? []) as ScheduleRow[])
      .filter((s) => s.days_of_week.includes(dayOfWeek))
      .map((s) => s.id)
  );

  if (scheduleIds.length === 0) return { total: 0, taken: 0 };

  const { data: logs } = await supabase
    .from("intake_logs")
    .select("status")
    .in("schedule_id", scheduleIds)
    .eq("scheduled_date", today)
    .eq("status", "taken");

  return { total: scheduleIds.length, taken: logs?.length ?? 0 };
}

export default async function HouseholdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: households } = await supabase
    .from("households")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true });

  const summaries = await Promise.all(
    (households ?? []).map((h) => getTodaySummary(supabase, h.id, h.timezone))
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Mis abuelos</h1>
        <Link
          href="/dashboard/nuevo-hogar"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Añadir otro
        </Link>
      </div>

      {(!households || households.length === 0) && (
        <p className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
          Todavía no has creado ningún perfil.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {households?.map((h, i) => (
          <Link
            key={h.id}
            href={`/dashboard/${h.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{h.name}</h2>
              <p className="text-sm text-slate-500">Código: {h.access_code}</p>
            </div>
            <div className="text-right">
              {summaries[i].total > 0 ? (
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    summaries[i].taken === summaries[i].total
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {summaries[i].taken}/{summaries[i].total} hoy
                </span>
              ) : (
                <span className="text-sm text-slate-400">Sin pastillas hoy</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
