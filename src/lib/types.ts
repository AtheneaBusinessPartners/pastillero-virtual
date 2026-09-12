export type Household = {
  id: string;
  name: string;
  access_code: string;
  timezone: string;
  created_by: string;
  created_at: string;
};

export type Medication = {
  id: string;
  household_id: string;
  name: string;
  color: string | null;
  shape: string | null;
  notes: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
};

export type Schedule = {
  id: string;
  medication_id: string;
  time_of_day: string; // 'HH:MM'
  days_of_week: number[]; // 0=domingo ... 6=sábado
  active: boolean;
  created_at: string;
};

export type IntakeLog = {
  id: string;
  schedule_id: string;
  scheduled_date: string; // 'YYYY-MM-DD'
  status: "pending" | "taken" | "skipped";
  taken_at: string | null;
  created_at: string;
};

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
