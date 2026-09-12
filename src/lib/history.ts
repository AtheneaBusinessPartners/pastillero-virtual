import type { SupabaseClient } from "@supabase/supabase-js";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export type DoseHistory = { time_of_day: string; medication_name: string; status: string };
export type DayHistory = { total: number; taken: number; status: string; doses: DoseHistory[] };

export async function computeMonthlyHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  householdId: string,
  year: number,
  month: number,
  today: string
): Promise<Record<string, DayHistory>> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDate = dateStr(year, month, 1);
  const lastDate = dateStr(year, month, daysInMonth);

  const { data: medications } = await supabase
    .from("medications")
    .select("id, name, schedules(id, time_of_day, days_of_week)")
    .eq("household_id", householdId);

  type ScheduleRow = { id: string; time_of_day: string; days_of_week: number[] };
  const scheduleList = (medications ?? []).flatMap((m) =>
    ((m.schedules ?? []) as ScheduleRow[]).map((s) => ({ ...s, medicationName: m.name as string }))
  );
  const scheduleIds = scheduleList.map((s) => s.id);

  const { data: logs } = await supabase
    .from("intake_logs")
    .select("*")
    .in("schedule_id", scheduleIds.length > 0 ? scheduleIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("scheduled_date", firstDate)
    .lte("scheduled_date", lastDate);

  const days: Record<string, DayHistory> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateStr(year, month, day);
    if (date > today) continue;

    const weekday = weekdayOf(year, month, day);
    const expected = scheduleList.filter((s) => s.days_of_week.includes(weekday));
    if (expected.length === 0) continue;

    const doses: DoseHistory[] = expected.map((s) => {
      const log = logs?.find((l) => l.schedule_id === s.id && l.scheduled_date === date);
      const status = date === today ? log?.status ?? "pending" : log?.status ?? "missed";
      return { time_of_day: s.time_of_day, medication_name: s.medicationName, status };
    });

    const takenCount = doses.filter((d) => d.status === "taken").length;
    let dayStatus = "incomplete";
    if (date === today) {
      dayStatus = "today";
    } else if (takenCount === doses.length) {
      dayStatus = "complete";
    }

    days[date] = { total: doses.length, taken: takenCount, status: dayStatus, doses };
  }

  return days;
}
