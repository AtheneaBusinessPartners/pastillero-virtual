-- Pastillero Abuelos - esquema inicial

create extension if not exists "pgcrypto";

-- Un "household" (hogar) pertenece a un cuidador autenticado.
-- El abuelo accede sin login usando el access_code de 6 dígitos.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi hogar',
  access_code text not null unique,
  timezone text not null default 'Europe/Madrid',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  color text,
  shape text,
  notes text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  time_of_day text not null, -- 'HH:MM' 24h
  days_of_week int[] not null default '{0,1,2,3,4,5,6}', -- 0=domingo ... 6=sábado
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists intake_logs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'taken', 'skipped')),
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (schedule_id, scheduled_date)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_medications_household on medications(household_id);
create index if not exists idx_schedules_medication on schedules(medication_id);
create index if not exists idx_intake_logs_schedule on intake_logs(schedule_id);
create index if not exists idx_push_subscriptions_household on push_subscriptions(household_id);

-- Row Level Security: solo el cuidador autenticado dueño del hogar puede leer/escribir
-- directamente vía el cliente. El acceso del abuelo (sin login) pasa siempre por las
-- API routes del servidor, que usan la service role key y validan el access_code a mano.

alter table households enable row level security;
alter table medications enable row level security;
alter table schedules enable row level security;
alter table intake_logs enable row level security;
alter table push_subscriptions enable row level security;

create policy "households_owner_all" on households
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "medications_owner_all" on medications
  for all using (household_id in (select id from households where created_by = auth.uid()))
  with check (household_id in (select id from households where created_by = auth.uid()));

create policy "schedules_owner_all" on schedules
  for all using (
    medication_id in (
      select m.id from medications m
      join households h on h.id = m.household_id
      where h.created_by = auth.uid()
    )
  )
  with check (
    medication_id in (
      select m.id from medications m
      join households h on h.id = m.household_id
      where h.created_by = auth.uid()
    )
  );

create policy "intake_logs_owner_all" on intake_logs
  for all using (
    schedule_id in (
      select s.id from schedules s
      join medications m on m.id = s.medication_id
      join households h on h.id = m.household_id
      where h.created_by = auth.uid()
    )
  )
  with check (
    schedule_id in (
      select s.id from schedules s
      join medications m on m.id = s.medication_id
      join households h on h.id = m.household_id
      where h.created_by = auth.uid()
    )
  );

create policy "push_subscriptions_owner_all" on push_subscriptions
  for all using (household_id in (select id from households where created_by = auth.uid()))
  with check (household_id in (select id from households where created_by = auth.uid()));

-- Storage bucket para fotos de pastillas/pastilleros
insert into storage.buckets (id, name, public)
values ('medication-photos', 'medication-photos', true)
on conflict (id) do nothing;

create policy "medication_photos_public_read" on storage.objects
  for select using (bucket_id = 'medication-photos');

create policy "medication_photos_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'medication-photos');

create policy "medication_photos_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'medication-photos');

create policy "medication_photos_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'medication-photos');
