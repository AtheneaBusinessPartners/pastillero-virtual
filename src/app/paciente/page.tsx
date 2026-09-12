"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { startAlarmSound, stopAlarmSound } from "@/lib/alarm-sound";
import { subscribeToPush } from "@/lib/push-client";

const STORAGE_KEY = "pastillas_access_code";

type Dose = {
  schedule_id: string;
  time_of_day: string;
  medication: {
    id: string;
    name: string;
    color: string | null;
    shape: string | null;
    notes: string | null;
    photo_url: string | null;
  };
  status: "pending" | "taken" | "skipped";
};

function currentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function PacientePage() {
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [householdName, setHouseholdName] = useState<string>("");
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const [alarmDose, setAlarmDose] = useState<Dose | null>(null);
  const alarmedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAccessCode(saved);
  }, []);

  const loadAgenda = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/paciente/agenda?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setLoadError("No se pudo cargar la información. Comprueba el código.");
        return;
      }
      const data = await res.json();
      setHouseholdName(data.household.name);
      setDoses(data.doses);
      setLoadError(null);
    } catch {
      setLoadError("Sin conexión. Reintentando...");
    }
  }, []);

  useEffect(() => {
    if (!accessCode) return;
    loadAgenda(accessCode);
    const interval = setInterval(() => loadAgenda(accessCode), 20000);
    return () => clearInterval(interval);
  }, [accessCode, loadAgenda]);

  // Comprueba cada 10s si toca disparar la alarma en pantalla para alguna dosis pendiente.
  useEffect(() => {
    if (!accessCode) return;
    const interval = setInterval(() => {
      const now = currentHHMM();
      const today = new Date().toISOString().slice(0, 10);
      for (const dose of doses) {
        const key = `${dose.schedule_id}-${today}`;
        if (
          dose.status === "pending" &&
          dose.time_of_day <= now &&
          !alarmedKeys.current.has(key)
        ) {
          alarmedKeys.current.add(key);
          setAlarmDose(dose);
          startAlarmSound();
          break;
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [doses, accessCode]);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/paciente/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      if (!res.ok) {
        setCodeError("Código no encontrado. Pídeselo a tu cuidador.");
        setVerifying(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, codeInput.trim());
      setAccessCode(codeInput.trim());
    } catch {
      setCodeError("No hay conexión a internet.");
    }
    setVerifying(false);
  }

  async function markTaken(dose: Dose, status: "taken" | "skipped" = "taken") {
    if (!accessCode) return;
    setDoses((prev) =>
      prev.map((d) => (d.schedule_id === dose.schedule_id ? { ...d, status } : d))
    );
    if (alarmDose?.schedule_id === dose.schedule_id) {
      stopAlarmSound();
      setAlarmDose(null);
    }
    await fetch("/api/paciente/tomar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: accessCode, schedule_id: dose.schedule_id, status }),
    });
  }

  function snoozeAlarm(dose: Dose) {
    stopAlarmSound();
    setAlarmDose(null);
    const today = new Date().toISOString().slice(0, 10);
    const key = `${dose.schedule_id}-${today}`;
    setTimeout(() => alarmedKeys.current.delete(key), 10 * 60 * 1000);
  }

  async function handleEnablePush() {
    const ok = accessCode ? await subscribeToPush(accessCode) : false;
    setPushEnabled(ok);
  }

  function handleChangeCode() {
    localStorage.removeItem(STORAGE_KEY);
    setAccessCode(null);
    setCodeInput("");
    setDoses([]);
  }

  if (!accessCode) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">Introduce tu código</h1>
        <form onSubmit={handleVerifyCode} className="flex w-full max-w-xs flex-col gap-4">
          <input
            inputMode="numeric"
            maxLength={6}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
            className="rounded-xl border-2 border-slate-300 px-4 py-4 text-center text-3xl font-bold tracking-widest text-slate-900 focus:border-blue-500 focus:outline-none"
            placeholder="000000"
          />
          {codeError && <p className="text-center text-red-600">{codeError}</p>}
          <button
            type="submit"
            disabled={verifying || codeInput.length < 6}
            className="rounded-xl bg-blue-600 px-6 py-4 text-xl font-semibold text-white disabled:opacity-50"
          >
            {verifying ? "Comprobando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-8 max-w-xs text-center text-slate-500">
          Pide este código de 6 dígitos a la persona que gestiona tus medicamentos.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">👋 {householdName}</h1>
        <button onClick={handleChangeCode} className="text-sm text-slate-400 underline">
          Cambiar código
        </button>
      </div>

      <Link
        href="/paciente/historial"
        className="mb-6 flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-700 hover:bg-slate-50"
      >
        📅 Ver historial de días anteriores
      </Link>

      {!pushEnabled && (
        <button
          onClick={handleEnablePush}
          className="mb-6 rounded-xl border-2 border-blue-600 px-4 py-3 text-lg font-semibold text-blue-700"
        >
          🔔 Activar avisos en este dispositivo
        </button>
      )}

      {loadError && <p className="mb-4 text-center text-amber-600">{loadError}</p>}

      {doses.length === 0 && !loadError && (
        <p className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-xl text-slate-500">
          No hay pastillas programadas para hoy.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {doses.map((dose) => (
          <div
            key={dose.schedule_id}
            className={`flex items-center gap-4 rounded-2xl border-2 p-4 shadow-sm ${
              dose.status === "taken"
                ? "border-green-200 bg-green-50"
                : "border-slate-200 bg-white"
            }`}
          >
            {dose.medication.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dose.medication.photo_url}
                alt={dose.medication.name}
                className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-4xl">
                💊
              </div>
            )}

            <div className="flex-1">
              <p className="text-2xl font-bold text-slate-900">{dose.time_of_day}</p>
              <p className="text-xl text-slate-800">{dose.medication.name}</p>
              <p className="text-slate-500">
                {[dose.medication.color, dose.medication.shape].filter(Boolean).join(" · ")}
              </p>
            </div>

            {dose.status === "taken" ? (
              <span className="rounded-full bg-green-600 px-4 py-2 text-lg font-semibold text-white">
                ✓ Tomada
              </span>
            ) : (
              <button
                onClick={() => markTaken(dose)}
                className="rounded-xl bg-green-600 px-5 py-3 text-lg font-semibold text-white hover:bg-green-700"
              >
                Ya la tomé
              </button>
            )}
          </div>
        ))}
      </div>

      {alarmDose && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-700 px-6 text-center text-white">
          <p className="mb-4 text-6xl">⏰</p>
          <h2 className="mb-2 text-3xl font-bold">¡Es la hora!</h2>
          <p className="mb-8 text-2xl">
            Toca tomar: <span className="font-bold">{alarmDose.medication.name}</span>
          </p>
          {alarmDose.medication.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={alarmDose.medication.photo_url}
              alt={alarmDose.medication.name}
              className="mb-8 h-40 w-40 rounded-2xl object-cover"
            />
          )}
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={() => markTaken(alarmDose)}
              className="rounded-xl bg-white px-6 py-4 text-xl font-bold text-blue-700"
            >
              Ya la tomé
            </button>
            <button
              onClick={() => snoozeAlarm(alarmDose)}
              className="rounded-xl border-2 border-white px-6 py-4 text-lg font-semibold text-white"
            >
              Recordar en 10 minutos
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
