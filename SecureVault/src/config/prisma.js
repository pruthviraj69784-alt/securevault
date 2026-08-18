const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;

let prisma;

if (!connectionString) {
    console.warn("⚠️  DATABASE_URL not set — Prisma/PostgreSQL disabled");
    // Create a stub that won't crash requires but will fail on actual queries
    prisma = new PrismaClient();
} else {
    const globalForPrisma = global;

    if (globalForPrisma.__prisma) {
        prisma = globalForPrisma.__prisma;
    } else {
        try {
            const pool = new Pool({ connectionString });
            const adapter = new PrismaPg(pool);
            prisma = new PrismaClient({ adapter });

            if (process.env.NODE_ENV !== "production") {
                globalForPrisma.__prisma = prisma;
            }
        } catch (err) {
            console.error("❌ Prisma init failed:", err.message);
            prisma = new PrismaClient();
        }
    }
}

module.exports = prisma;
