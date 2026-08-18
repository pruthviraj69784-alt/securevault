const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = require("../config/prisma");

async function seed() {
    try {
        const adminEmail = "admin0440@gmail.com";
        const adminPassword = "Admin0440";
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                name: "System Administrator",
                password: hashedPassword,
                role: "ADMIN"
            },
            create: {
                name: "System Administrator",
                email: adminEmail,
                password: hashedPassword,
                role: "ADMIN"
            }
        });

        console.log(`✅ Admin account seeded in PostgreSQL: ${admin.email} / ${adminPassword}`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
        process.exit(1);
    }
}

seed();
