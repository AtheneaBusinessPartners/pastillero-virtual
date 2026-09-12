import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("created_by", user.id)
    .single();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-bold text-slate-900">
            💊 Mis Pastillas
          </Link>
          <LogoutButton />
        </div>
      </header>

      {household && (
        <div className="mx-auto mt-6 max-w-3xl px-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm text-blue-900">
              Código de acceso para el dispositivo de tu familiar
            </p>
            <p className="text-3xl font-bold tracking-widest text-blue-700">
              {household.access_code}
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Entra en <span className="font-mono">/paciente</span> desde su móvil o tablet e
              introduce este código una sola vez.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
