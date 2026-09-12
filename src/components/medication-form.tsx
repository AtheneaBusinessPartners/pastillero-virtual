"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DAY_LABELS, type Medication, type Schedule } from "@/lib/types";

type ScheduleDraft = {
  id?: string;
  time_of_day: string;
  days_of_week: number[];
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const COLOR_OPTIONS = [
  "Blanca",
  "Amarilla",
  "Rosa",
  "Azul",
  "Roja",
  "Naranja",
  "Verde",
  "Marrón",
];

const SHAPE_OPTIONS = ["Redonda", "Ovalada", "Cápsula", "Rectangular", "Sobre / polvo"];

export default function MedicationForm({
  householdId,
  medication,
  initialSchedules,
}: {
  householdId: string;
  medication?: Medication;
  initialSchedules?: Schedule[];
}) {
  const router = useRouter();
  const isEditing = Boolean(medication);

  const [name, setName] = useState(medication?.name ?? "");
  const [color, setColor] = useState(medication?.color ?? "");
  const [shape, setShape] = useState(medication?.shape ?? "");
  const [notes, setNotes] = useState(medication?.notes ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(medication?.photo_url ?? null);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(
    initialSchedules?.map((s) => ({
      id: s.id,
      time_of_day: s.time_of_day,
      days_of_week: s.days_of_week,
    })) ?? [{ time_of_day: "09:00", days_of_week: ALL_DAYS }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function addSchedule() {
    setSchedules((prev) => [...prev, { time_of_day: "09:00", days_of_week: ALL_DAYS }]);
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateScheduleTime(index: number, time: string) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, time_of_day: time } : s)));
  }

  function toggleDay(index: number, day: number) {
    setSchedules((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const has = s.days_of_week.includes(day);
        const days = has ? s.days_of_week.filter((d) => d !== day) : [...s.days_of_week, day];
        return { ...s, days_of_week: days.sort() };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Ponle un nombre al medicamento.");
      return;
    }
    if (schedules.length === 0) {
      setError("Añade al menos un horario.");
      return;
    }
    if (schedules.some((s) => s.days_of_week.length === 0)) {
      setError("Cada horario necesita al menos un día seleccionado.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    let photoUrl = medication?.photo_url ?? null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("medication-photos")
        .upload(path, photoFile, { upsert: true });

      if (uploadError) {
        setError(`No se pudo subir la foto: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("medication-photos").getPublicUrl(path);
      photoUrl = publicUrl.publicUrl;
    }

    const payload = {
      household_id: householdId,
      name: name.trim(),
      color: color || null,
      shape: shape || null,
      notes: notes || null,
      photo_url: photoUrl,
    };

    let medicationId = medication?.id;

    if (isEditing && medicationId) {
      const { error: updateError } = await supabase
        .from("medications")
        .update(payload)
        .eq("id", medicationId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Estrategia simple: borrar horarios existentes y volver a crearlos.
      await supabase.from("schedules").delete().eq("medication_id", medicationId);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("medications")
        .insert(payload)
        .select()
        .single();
      if (insertError || !inserted) {
        setError(insertError?.message ?? "No se pudo crear el medicamento.");
        setSaving(false);
        return;
      }
      medicationId = inserted.id;
    }

    const { error: scheduleError } = await supabase.from("schedules").insert(
      schedules.map((s) => ({
        medication_id: medicationId,
        time_of_day: s.time_of_day,
        days_of_week: s.days_of_week,
      }))
    );

    if (scheduleError) {
      setError(scheduleError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nombre del medicamento
        </label>
        <input
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Enalapril 10mg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            <option value="">Sin especificar</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Forma</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
            value={shape}
            onChange={(e) => setShape(e.target.value)}
          >
            <option value="">Sin especificar</option>
            {SHAPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Foto de la pastilla o del pastillero
        </label>
        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Vista previa"
            className="mt-3 h-32 w-32 rounded-lg object-cover"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Notas (ej. &quot;tomar con comida&quot;)
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Horarios</label>
          <button
            type="button"
            onClick={addSchedule}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            + Añadir horario
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {schedules.map((s, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-3">
                <input
                  type="time"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  value={s.time_of_day}
                  onChange={(e) => updateScheduleTime(index, e.target.value)}
                />
                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSchedule(index)}
                    className="ml-auto text-sm font-medium text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(index, day)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      s.days_of_week.includes(day)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Añadir medicamento"}
      </button>
    </form>
  );
}
