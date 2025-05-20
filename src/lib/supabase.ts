import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Supabase client with anon key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
    },
  },
);

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
