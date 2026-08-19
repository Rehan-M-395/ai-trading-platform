import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool: PgPool } = pg;

function connectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ??
    process.env.DIRECT_POSTGRES_URL ??
    process.env.SUPABASE_DB_URL
  );
}

let poolInstance: pg.Pool | null = null;

/**
 * PostgreSQL connection pool
 */
export function getPool(): pg.Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const uri = connectionString();

  if (!uri) {
    throw new Error(
      "DATABASE_URL is missing. Please set your PostgreSQL connection URI in .env"
    );
  }

  const useSsl =
    uri.includes("supabase.co") ||
    uri.includes("pooler.supabase.com") ||
    process.env.DATABASE_SSL === "true";

  poolInstance = new PgPool({
    connectionString: uri,

    ssl: useSsl
      ? {
        rejectUnauthorized: false,
      }
      : undefined,

    connectionTimeoutMillis: 10000,

    idleTimeoutMillis: 30000,
  });

  poolInstance.on("connect", () => {
    console.log("PostgreSQL connected successfully");
  });

  poolInstance.on("error", (err) => {
    console.error("PG POOL ERROR:", err);
  });

  return poolInstance;
}

/**
 * Test database connection
 */
export async function testPgConnection() {
  try {
    const pool = getPool();

    const result = await pool.query("SELECT NOW()");

    console.log("DATABASE CONNECTED");
    console.log(result.rows);
  } catch (err) {
    console.error("DATABASE CONNECTION ERROR:");
    console.error(err);
  }
}