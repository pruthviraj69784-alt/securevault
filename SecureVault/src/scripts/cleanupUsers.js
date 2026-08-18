const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user.model");
const connectDB = require("../config/database");

async function cleanup() {
    try {
        await connectDB();
        console.log("Cleaning test & sample accounts from MongoDB...");

        // Keep real users and admin0440@gmail.com, delete test/dummy accounts
        const result = await User.deleteMany({
            email: {
                $nin: ["admin0440@gmail.com", "pruthviraj6974@gmail.com", "pruthviraj69784@gmail.com"]
            },
            $or: [
                { email: { $regex: "@example\\.com$" } },
                { email: { $regex: "@test\\.com$" } },
                { email: { $regex: "@securevault\\.io$" } }
            ]
        });

        console.log(`🧹 Removed ${result.deletedCount} test/sample user accounts.`);

        const remainingUsers = await User.find().select("name email role createdAt");
        console.log("✅ Active Real Accounts in Database:");
        remainingUsers.forEach(u => console.log(`  - [${u.role}] ${u.name} (${u.email})`));

        process.exit(0);
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    }
}

cleanup();
