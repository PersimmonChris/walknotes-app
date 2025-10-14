import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "../env";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseAdminClient?: AdminClient;
};

function createAdminClient(): AdminClient {
  const env = getServerEnv();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAdminClient(): AdminClient {
  if (!globalForSupabase.__supabaseAdminClient) {
    globalForSupabase.__supabaseAdminClient = createAdminClient();
  }

  return globalForSupabase.__supabaseAdminClient;
}
