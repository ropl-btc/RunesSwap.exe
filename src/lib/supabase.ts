import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Functionality may be limited.",
  );
  supabase = new Proxy(
    {},
    {
      get() {
        throw new Error("Supabase client is not configured");
      },
    },
  ) as SupabaseClient;
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true },
  });
}

export { supabase };
export const hasSupabase = !!supabaseUrl && !!supabaseAnonKey;
