const prisma = require("./prisma");

const connectDB = async () => {
    try {
        await prisma.$connect();

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