import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccessCodeEditor from "@/components/access-code-editor";

export default async function HouseholdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    .select("*")
    .eq("id", householdId)
    .eq("created_by", user.id)
    .single();

  if (!household) notFound();

  return (
    <div>
      <Link href="/dashboard" className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Todos los perfiles
      </Link>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <h1 className="mb-2 text-xl font-bold text-slate-900">{household.name}</h1>
        <p className="text-sm text-blue-900">Código de acceso para su dispositivo</p>
        <AccessCodeEditor householdId={household.id} initialCode={household.access_code} />
        <p className="mt-2 text-sm text-blue-800">
          Que entre en <span className="font-mono">/paciente</span> desde su móvil o tablet e
          introduzca este código una sola vez.
        </p>
      </div>

      <nav className="mb-6 flex gap-2 border-b border-slate-200">
        <Link
          href={`/dashboard/${household.id}`}
          className="rounded-t-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Medicamentos
        </Link>
        <Link
          href={`/dashboard/${household.id}/progreso`}
          className="rounded-t-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Progreso
        </Link>
      </nav>

      {children}
    </div>
  );
}
