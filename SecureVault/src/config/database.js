const prisma = require("./prisma");

const connectDB = async() => {
    try {
        const timeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS || 2000);
        const connectPromise = prisma.$connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("PostgreSQL connection timed out")), timeoutMs);
        });

        await Promise.race([connectPromise, timeoutPromise]);

        if (process.env.NODE_ENV !== "test") {
            console.log("✅ PostgreSQL Connected via Prisma");
        }

        return prisma;
    } catch (error) {
        if (process.env.NODE_ENV !== "test") {
            console.error("❌ PostgreSQL Connection Failed:", error.message);
        }

        return null;
    }
};

module.exports = connectDB;