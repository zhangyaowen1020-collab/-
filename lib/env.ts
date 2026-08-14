import { z } from "zod";

const serverEnvironment = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
});

export function parseServerEnv(value: Record<string, string | undefined>) {
  if ("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" in value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must not be public.");
  }
  return serverEnvironment.parse(value);
}

export function serverEnv() {
  return parseServerEnv(process.env);
}
