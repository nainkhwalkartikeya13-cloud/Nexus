import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma v7: Use @prisma/adapter-pg with an explicit pg.Pool.
 * We parse the DATABASE_URL and build pool config manually so that:
 * - `channel_binding` param (incompatible with node-pg) is stripped
 * - SSL is enabled automatically for remote hosts (e.g. Neon, Aiven)
 * - Local connections work without SSL
 *
 * NOTE: Aiven uses self-signed CA certificates. Prisma v7's driver-adapter
 * TLS layer doesn't honour node-pg's `rejectUnauthorized: false`, so we
 * must also set the process-level flag to allow those certificates.
 */
function createPrismaClient(): PrismaClient {
  const connString = process.env.DATABASE_URL!;

  let poolConfig: pg.PoolConfig;
  try {
    const url = new URL(connString);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

    if (!isLocal) {
      // Allow Aiven / self-signed CA certs at the Node.js process level
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    poolConfig = {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
    };
  } catch {
    // Fallback: pass the raw connection string
    poolConfig = { connectionString: connString };
  }

  const pool = new pg.Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
