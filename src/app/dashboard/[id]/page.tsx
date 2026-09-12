import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MedicationForm from "@/components/medication-form";

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  if (!household) redirect("/dashboard");

  const { data: medication } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .eq("household_id", household.id)
    .single();

  if (!medication) notFound();

  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .eq("medication_id", id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Editar {medication.name}</h1>
      <MedicationForm
        householdId={household.id}
        medication={medication}
        initialSchedules={schedules ?? []}
      />
    </div>
  );
}
