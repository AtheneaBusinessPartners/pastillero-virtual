@AGENTS.md

# Mis Pastillas — contexto del proyecto

App de recordatorio de medicación para personas mayores. Un cuidador (login por
email/contraseña vía Supabase Auth) configura medicamentos, fotos, horarios y stock
por perfil; la persona mayor (sin cuenta, solo un código de 6-8 dígitos) ve una
pantalla simple con avisos (push + alarma en pantalla) y marca cada pastilla como
tomada.

**Repo**: `https://github.com/AtheneaBusinessPartners/pastillero-virtual` (org repo).
**Deploy**: Vercel, autodeploy en cada push a `main`. Plan Hobby → sin cron nativo de
Vercel (no soporta más de 1 vez/día); el aviso automático de cada minuto lo dispara un
cron externo (cron-job.org) llamando a `/api/cron/reminders` con
`Authorization: Bearer <CRON_SECRET>`.

**Arquitectura clave**:
- `/paciente/*` y sus API routes (`/api/paciente/*`) NO usan Supabase Auth — se
  identifican por código de acceso, validado a mano con la `service_role key`
  (bypassa RLS). `/dashboard/*` sí usa sesión de Supabase Auth + RLS normal.
- Un cuidador puede tener varios perfiles/hogares:
  `/dashboard` lista perfiles → `/dashboard/[householdId]/*` es la gestión de uno.
- Historial compartido: `src/lib/history.ts` (cálculo) +
  `src/components/history-calendar.tsx` (UI), usado por paciente y cuidador.
- Control de stock por medicamento: **solo lo ve el cuidador**, nunca el paciente
  (decisión explícita). Se descuenta 1 unidad al marcar una dosis como tomada.

**Migraciones SQL** en `supabase/migrations/`, se ejecutan a mano en el SQL Editor de
Supabase, en orden, cada vez que se añade una nueva (`0001_init.sql`, `0002_stock.sql`,
...). Nunca editar una migración ya aplicada — añadir una nueva.

**Secretos**: claves VAPID y `CRON_SECRET` están en `.env.local` (no versionado) y
como variables de entorno en Vercel.

**Limitación conocida del entorno**: `git push` a este repo es bloqueado a veces por
el clasificador de seguridad de modo automático de Claude Code, incluso con
confirmación del usuario. Si pasa, reintentar 1-2 veces; si sigue bloqueado, pedir al
usuario que haga el push él mismo (terminal o GitHub Desktop).

**Ideas de mejora pendientes** (discutidas, no implementadas): aviso al cuidador si el
abuelo no toma la pastilla a tiempo, varios cuidadores por perfil, zona horaria
editable desde el panel (ahora fija en `Europe/Madrid` en la base de datos), resumen
semanal exportable, lectura en voz alta de la alarma.
