import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Functionality may be limited.",
  );
}

// Supabase client with anon key when env vars are provided
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
        },
      })
    : ({} as unknown as ReturnType<typeof createClient>);

// NOTE: The Supabase database has proper RLS policies that allow the anon client to:
// - SELECT, INSERT, UPDATE, and DELETE records from liquidium_tokens
//
// If admin operations that bypass RLS are needed in the future, you can create an admin client:
// export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
//   ? createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL,
//       process.env.SUPABASE_SERVICE_ROLE_KEY,
//       {
//         auth: {
//           persistSession: false,
//         },
//       }
//     )
//   : null;
