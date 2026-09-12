"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccessCodeEditor({
  householdId,
  initialCode,
}: {
  householdId: string;
  initialCode: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialCode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!/^\d{4,8}$/.test(value)) {
      setError("Usa solo números, entre 4 y 8 cifras.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("households")
      .update({ access_code: value })
      .eq("id", householdId);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("Ese código ya lo está usando otro perfil. Prueba con otro distinto.");
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        <p className="text-3xl font-bold tracking-widest text-blue-700">{initialCode}</p>
        <button
          onClick={() => {
            setValue(initialCode);
            setEditing(true);
          }}
          className="mt-1 text-sm font-medium text-blue-700 underline"
        >
          Cambiar código
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        maxLength={8}
        inputMode="numeric"
        className="w-40 rounded-lg border-2 border-blue-300 px-3 py-2 text-2xl font-bold tracking-widest text-blue-700 focus:border-blue-500 focus:outline-none"
      />
      <div className="mt-2 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="text-sm font-medium text-slate-500"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-blue-800">
        Elige algo fácil de recordar (fecha de nacimiento, código de casa, etc).
      </p>
    </div>
  );
}
