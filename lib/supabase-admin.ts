import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const adminEnvironment = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().startsWith("sb_secret_"),
});

type AdminEnvironment = z.input<typeof adminEnvironment>;

/**
 * A private, server-only client. Never import this module from a Client Component.
 */
export function createSupabaseAdmin(
  environment: AdminEnvironment,
): SupabaseClient {
  const config = adminEnvironment.parse(environment);

  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
