"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function randomAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function NewHouseholdPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre, por ejemplo el de la persona.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión no válida, vuelve a iniciar sesión.");
      setSaving(false);
      return;
    }

    let attempts = 0;
    let insertedId: string | null = null;
    let lastError: string | null = null;

    while (attempts < 5 && !insertedId) {
      const { data, error: insertError } = await supabase
        .from("households")
        .insert({ name: name.trim(), access_code: randomAccessCode(), created_by: user.id })
        .select()
        .single();

      if (!insertError && data) {
        insertedId = data.id;
      } else if (insertError?.code === "23505") {
        attempts++;
        continue; // código duplicado por azar, reintenta con otro
      } else {
        lastError = insertError?.message ?? "No se pudo crear el perfil.";
        break;
      }
    }

    if (!insertedId) {
      setError(lastError ?? "No se pudo generar un código único, inténtalo de nuevo.");
      setSaving(false);
      return;
    }

    router.push(`/dashboard/${insertedId}`);
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Añadir otro perfil</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre (ej. &quot;Abuelo Manolo&quot;)
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Abuelo Manolo"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Creando..." : "Crear perfil"}
        </button>
      </form>
    </div>
  );
}
