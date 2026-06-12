import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client (anon key). Used for reading public data
// (bookings, user_profiles) directly from client components.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
