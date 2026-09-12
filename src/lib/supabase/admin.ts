import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service role key: solo se usa en API routes del servidor.
// Nunca importar este archivo desde código que se ejecute en el navegador.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
