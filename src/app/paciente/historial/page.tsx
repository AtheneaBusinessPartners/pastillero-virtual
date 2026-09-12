"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HistoryCalendar from "@/components/history-calendar";
import type { DayHistory } from "@/lib/history";

const STORAGE_KEY = "pastillas_access_code";

export default function HistorialPage() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [days, setDays] = useState<Record<string, DayHistory>>({});
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
    setSelectedDate(null);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/paciente" className="text-lg font-medium text-blue-700">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Historial</h1>
        <div className="w-16" />
      </div>

      <HistoryCalendar
        year={year}
        month={month}
        days={days}
        loading={loading}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
      />
    </main>
  );
}
