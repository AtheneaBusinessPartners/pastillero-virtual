"use client";

import { use, useCallback, useEffect, useState } from "react";
import HistoryCalendar from "@/components/history-calendar";
import type { DayHistory } from "@/lib/history";

export default function ProgresoPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const { householdId } = use(params);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<Record<string, DayHistory>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/historial?householdId=${householdId}&year=${y}&month=${m}`);
      if (res.ok) {
        const data = await res.json();
        setDays(data.days ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadMonth(year, month);
  }, [year, month, loadMonth]);

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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Progreso</h1>
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
    </div>
  );
}
