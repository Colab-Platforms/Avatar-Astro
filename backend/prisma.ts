import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// DB_POOL_MAX is optional (default: the driver default). The test suite sets it to 1 for its throwaway database.
const poolMax = Number(process.env.DB_POOL_MAX);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ...(Number.isInteger(poolMax) && poolMax > 0 ? { max: poolMax } : {}),
});

export const prisma = new PrismaClient({ adapter });

export default prisma;
