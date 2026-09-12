import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DAY_LABELS, type Medication, type Schedule } from "@/lib/types";
import DeleteMedicationButton from "./delete-medication-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("created_by", user.id)
    .single();

  const { data: medications } = await supabase
    .from("medications")
    .select("*, schedules(*)")
    .eq("household_id", household?.id ?? "")
    .order("created_at", { ascending: true });

  const meds = (medications ?? []) as (Medication & { schedules: Schedule[] })[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Medicamentos</h1>
        <Link
          href="/dashboard/nueva"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          + Añadir pastilla
        </Link>
      </div>

      {meds.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-slate-500">
          Todavía no has añadido ningún medicamento.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {meds.map((med) => (
          <div
            key={med.id}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {med.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={med.photo_url}
                alt={med.name}
                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-3xl">
                💊
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{med.name}</h2>
                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/${med.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Editar
                  </Link>
                  <DeleteMedicationButton medicationId={med.id} />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                {[med.color, med.shape].filter(Boolean).join(" · ") || "Sin detalles"}
              </p>
              {med.notes && <p className="mt-1 text-sm text-slate-600">{med.notes}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                {med.schedules
                  ?.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))
                  .map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {s.time_of_day} ·{" "}
                      {s.days_of_week.length === 7
                        ? "Todos los días"
                        : s.days_of_week.map((d) => DAY_LABELS[d]).join(", ")}
                    </span>
                  ))}
                {(!med.schedules || med.schedules.length === 0) && (
                  <span className="text-xs text-amber-600">Sin horario configurado</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
