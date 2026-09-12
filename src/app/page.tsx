import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold text-slate-900">💊 Mis Pastillas</h1>
      <p className="mb-10 max-w-md text-lg text-slate-600">
        Recordatorios de medicación sencillos para personas mayores, gestionados por su
        cuidador.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-4">
        <Link
          href="/login"
          className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Soy el cuidador
        </Link>
        <Link
          href="/paciente"
          className="rounded-xl border-2 border-blue-600 px-6 py-4 text-lg font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          Ver mis pastillas
        </Link>
      </div>
    </main>
  );
}
