"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteMedicationButton({ medicationId }: { medicationId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("¿Seguro que quieres eliminar este medicamento?")) return;
    const supabase = createClient();
    await supabase.from("medications").delete().eq("id", medicationId);
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:underline">
      Eliminar
    </button>
  );
}
