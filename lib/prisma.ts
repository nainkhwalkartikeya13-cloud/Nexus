import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Allow self-signed certificates from Aiven and similar providers.
// The @prisma/adapter-pg driver performs its own TLS validation that
// rejects Aiven's certificate chain. This env var tells Node's TLS
// layer to accept it.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma v7: Use @prisma/adapter-pg with an explicit pg.Pool.
 * We parse the DATABASE_URL and build pool config manually so that:
 * - `channel_binding` param (incompatible with node-pg) is stripped
 * - SSL is enabled automatically for remote hosts (e.g. Neon)
 * - Local connections work without SSL
 */
function createPrismaClient(): PrismaClient {
  const connString = process.env.DATABASE_URL!;

  let poolConfig: pg.PoolConfig;
  try {
    const url = new URL(connString);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    poolConfig = {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 3, // Drastically limit connections for Aiven free tier connection budget
      idleTimeoutMillis: 30000, // Close idle connections promptly
      connectionTimeoutMillis: 15000,
    };
  } catch {
    // Fallback: pass the raw connection string
    poolConfig = { connectionString: connString, max: 3, idleTimeoutMillis: 30000 };
  }

  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always attach to global, even in production, to prevent Next.js standalone server
// multi-worker restarts from exhausting connections during dynamic routing module loads.
globalForPrisma.prisma = prisma;
