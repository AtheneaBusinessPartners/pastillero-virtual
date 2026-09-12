# Mis Pastillas

App de recordatorio de medicación para personas mayores. Un cuidador configura los
medicamentos, fotos y horarios desde su panel; la persona mayor abre una pantalla muy
sencilla en su móvil/tablet que le avisa (con sonido y notificación) a la hora de cada
pastilla.

Stack: **Next.js (App Router) + Supabase (auth, base de datos, storage) + Vercel
(hosting + cron)**.

## 1. Crear el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Cuando esté listo, abre **SQL Editor** → pega todo el contenido de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
   Esto crea las tablas, la seguridad a nivel de fila (RLS) y el bucket de storage para
   las fotos.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (¡secreta, no la expongas nunca
     en el navegador!)

## 2. Configurar variables de entorno en local

Copia `.env.local.example` a `.env.local` (ya existe un `.env.local` con las claves
VAPID y el `CRON_SECRET` generados) y rellena las tres variables de Supabase.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 3. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Primera version de Mis Pastillas"
```

Crea un repositorio vacío en GitHub y luego:

```bash
git remote add origin https://github.com/TU-USUARIO/pastillero-abuelos.git
git branch -M main
git push -u origin main
```

## 4. Desplegar en Vercel

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo de
   GitHub.
2. En **Environment Variables** añade las mismas variables que en `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `CRON_SECRET`.
3. Deploy.

### Sobre el cron de avisos

El archivo `vercel.json` define un cron que llama a `/api/cron/reminders` **cada
minuto** para comprobar qué pastillas tocan ahora y enviar la notificación push. En el
plan gratuito (Hobby) de Vercel los cron jobs pueden tener restricciones de frecuencia
mínima. Si al desplegar Vercel no acepta `* * * * *`, dos alternativas:

- Sube al plan Pro (permite cualquier frecuencia), o
- Usa un servicio externo gratuito como [cron-job.org](https://cron-job.org) que llame
  cada minuto a `https://TU-APP.vercel.app/api/cron/reminders` con el header
  `Authorization: Bearer TU_CRON_SECRET`.

## 5. Cómo se usa

- **Cuidador**: entra en `/signup`, crea su cuenta, y en `/dashboard` añade cada
  medicamento (nombre, color, forma, foto, notas) y sus horarios. La app genera un
  **código de 6 dígitos** para ese hogar, visible arriba del panel.
- **Persona mayor**: abre `/paciente` en su móvil o tablet, introduce el código una
  vez (se guarda en el dispositivo) y pulsa "Activar avisos" para permitir
  notificaciones. A partir de ahí verá sus pastillas de hoy y recibirá:
  - Una **notificación push** aunque tenga la app cerrada.
  - Una **alarma a pantalla completa con sonido** si la tiene abierta en ese momento.
  - Un botón grande "Ya la tomé" para marcarla y que el cuidador vea que se tomó.

### Instalar como app en el móvil del abuelo

En Chrome/Android o Safari/iOS, al abrir `/paciente` se puede usar "Añadir a pantalla
de inicio" para que quede como un icono más, sin tener que abrir el navegador.

## Estructura del proyecto

```
src/app/dashboard        Panel del cuidador (protegido por login)
src/app/paciente         Vista de la persona mayor (acceso por código, sin login)
src/app/api/paciente     Endpoints que usa la vista del paciente
src/app/api/push         Alta de suscripciones push
src/app/api/cron         Job que se ejecuta cada minuto y envía los avisos
supabase/migrations      Esquema SQL de la base de datos
public/sw.js             Service worker (recibe las notificaciones push)
```
