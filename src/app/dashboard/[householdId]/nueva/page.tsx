import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MedicationForm from "@/components/medication-form";

export default async function NewMedicationPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const { householdId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("id", householdId)
    .eq("created_by", user.id)
    .single();
  if (!household) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Añadir medicamento</h1>
      <MedicationForm householdId={household.id} />
    </div>
  );
}
