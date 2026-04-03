import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

function getRequiredEnv(primaryKey: string, fallbackKey: string): string {
  const value = process.env[primaryKey] ?? process.env[fallbackKey];
  if (!value) {
    throw new Error(
      `Missing env: set ${primaryKey} (or ${fallbackKey} as fallback).`,
    );
  }
  return value;
}

const supabaseUrl = getRequiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnv(
  "SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
