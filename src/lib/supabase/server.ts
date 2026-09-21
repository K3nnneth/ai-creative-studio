import { createClient } from "@supabase/supabase-js";

export const DEMO_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

function createAdminClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let adminClient: ReturnType<typeof createAdminClient> | undefined;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.");
  }

  adminClient = createAdminClient(url, secretKey);

  return adminClient;
}
