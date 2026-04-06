import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables",
  );
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

export default supabase;
