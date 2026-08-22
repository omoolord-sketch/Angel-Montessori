require("dotenv").config();

function createUnavailablePrisma(message) {
  const errorFactory = () => new Error(message);
  const throwingCallable = new Proxy(function unavailablePrismaClient() {}, {
    apply() {
      throw errorFactory();
    },
    get(_target, prop) {
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }

      if (prop === "$transaction") {
        return async () => {
          throw errorFactory();
        };
      }

      return throwingCallable;
    },
  });

  return throwingCallable;
}

const databaseUrl = String(process.env.DATABASE_URL || "").trim();

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. Prisma-backed features will be unavailable until it is configured.");
  module.exports = createUnavailablePrisma(
    "DATABASE_URL is required before Prisma-backed features can be used."
  );
} else {
  const { PrismaClient } = require("./generated/prisma");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  module.exports = prisma;
}
