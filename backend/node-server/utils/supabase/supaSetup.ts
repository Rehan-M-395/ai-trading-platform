import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

function getRequiredEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing env: set one of ${keys.join(", ")}.`);
}

const supabaseUrl = getRequiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = getRequiredEnv(
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_DEFAULT_KEY",
);

export const supabase = createClient(supabaseUrl, supabaseKey);
