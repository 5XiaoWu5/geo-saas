import { PrismaClient } from "@prisma/client/edge";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const fallbackDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/geopilot_ai";

if (!process.env.DATABASE_URL) {
  console.error("[AUTH DATABASE] DATABASE_URL is not configured. Cloudflare Pages production auth cannot query users or sessions without a PostgreSQL connection string.");
}

function createPrismaClient() {
  const adapter = new PrismaNeonHTTP(process.env.DATABASE_URL ?? fallbackDatabaseUrl, {});
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
