import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const SCHEMA_VERSION = "20261008_v2";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  schemaVersion?: string;
};

// 개발 환경에서 schema 갱신 시 인스턴스 재생성
if (globalForPrisma.schemaVersion !== SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.schemaVersion = SCHEMA_VERSION;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.schemaVersion = SCHEMA_VERSION;
}
