"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "pastillas_access_code";
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

type Dose = { time_of_day: string; medication_name: string; status: string };
type DayInfo = { total: number; taken: number; status: string; doses: Dose[] };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HistorialPage() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<Record<string, DayInfo>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAccessCode(localStorage.getItem(STORAGE_KEY));
  }, []);

  const loadMonth = useCallback(async (code: string, y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paciente/historial?code=${encodeURIComponent(code)}&year=${y}&month=${m}`);
      if (res.ok) {
        const data = await res.json();
        setDays(data.days ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessCode) loadMonth(accessCode, year, month);
  }, [accessCode, year, month, loadMonth]);

  if (accessCode === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-6 text-xl text-slate-600">Primero tienes que introducir tu código.</p>
        <Link href="/paciente" className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white">
          Ir a mis pastillas
        </Link>
      </main>
    );
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = lunes

  function goPrevMonth() {
    setSelectedDate(null);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (isCurrentMonth) return;
    setSelectedDate(null);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedInfo = selectedDate ? days[selectedDate] : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/paciente" className="text-lg font-medium text-blue-700">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
        <div className="w-16" />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <button
          onClick={goPrevMonth}
          className="rounded-lg px-4 py-2 text-2xl font-bold text-blue-700 hover:bg-blue-50"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-xl font-semibold text-slate-900">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={goNextMonth}
          disabled={isCurrentMonth}
          className="rounded-lg px-4 py-2 text-2xl font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-30"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-sm font-semibold text-slate-500">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const date = `${year}-${pad(month)}-${pad(day)}`;
          const info = days[date];
          const isToday = isCurrentMonth && day === now.getDate();

          let dotColor = "";
          if (info?.status === "complete") dotColor = "bg-green-500";
          else if (info?.status === "incomplete") dotColor = "bg-red-500";
          else if (info?.status === "today") dotColor = "bg-blue-500";

          return (
            <button
              key={date}
              onClick={() => info && setSelectedDate(date)}
              disabled={!info}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-lg ${
                isToday ? "ring-2 ring-blue-500" : ""
              } ${info ? "bg-white hover:bg-slate-50" : "text-slate-300"} ${
                selectedDate === date ? "bg-blue-100" : ""
              }`}
            >
              <span className={info ? "font-semibold text-slate-900" : ""}>{day}</span>
              {dotColor && <span className={`mt-1 h-2 w-2 rounded-full ${dotColor}`} />}
            </button>
          );
        })}
      </div>

      {loading && <p className="mt-4 text-center text-slate-400">Cargando...</p>}

      <div className="mt-6 flex gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500" /> Todo tomado</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-500" /> Faltó alguna</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500" /> Hoy</span>
      </div>

      {selectedInfo && selectedDate && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <div className="flex flex-col gap-2">
            {selectedInfo.doses.map((dose, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{dose.time_of_day} · {dose.medication_name}</p>
                </div>
                {dose.status === "taken" ? (
                  <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-semibold text-white">✓ Tomada</span>
                ) : dose.status === "pending" ? (
                  <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold text-white">Pendiente</span>
                ) : (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">No tomada</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
