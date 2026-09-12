"use client";

import type { DayHistory } from "@/lib/history";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HistoryCalendar({
  year,
  month,
  days,
  loading,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number; // 1-12
  days: Record<string, DayHistory>;
  loading: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = lunes

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedInfo = selectedDate ? days[selectedDate] : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <button
          onClick={onPrevMonth}
          className="rounded-lg px-4 py-2 text-2xl font-bold text-blue-700 hover:bg-blue-50"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-xl font-semibold text-slate-900">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={onNextMonth}
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
              onClick={() => info && onSelectDate(date)}
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

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Todo tomado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-red-500" /> Faltó alguna
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-blue-500" /> Hoy
        </span>
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
                <p className="font-semibold text-slate-900">
                  {dose.time_of_day} · {dose.medication_name}
                </p>
                {dose.status === "taken" ? (
                  <span className="rounded-full bg-green-600 px-3 py-1 text-sm font-semibold text-white">
                    ✓ Tomada
                  </span>
                ) : dose.status === "pending" ? (
                  <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold text-white">
                    Pendiente
                  </span>
                ) : (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                    No tomada
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
