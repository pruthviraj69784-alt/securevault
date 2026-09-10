const bcrypt = require("bcrypt");
const prisma = require("../src/config/prisma");

async function seedAdmin() {
    try {
        const email = "admin0440@gmail.com";
        const passwordPlain = "Admin@1234";
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log(`User ${email} already exists, updating role to ADMIN...`);
            const updated = await prisma.user.update({
                where: { email },
                data: {
                    role: "ADMIN",
                    password: hashedPassword
                }
            });
            console.log("✅ Admin updated successfully:", updated.email);
        } else {
            console.log(`Creating admin user ${email}...`);
            const created = await prisma.user.create({
                data: {
                    name: "System Admin",
                    email,
                    password: hashedPassword,
                    role: "ADMIN",
                    devices: [],
                    notificationPreferences: {}
                }
            });
            console.log("✅ Admin created successfully:", created.email);
        }

        console.log(`\n========================================`);
        console.log(`Admin Credentials:`);
        console.log(`Email:    ${email}`);
        console.log(`Password: ${passwordPlain}`);
        console.log(`Role:     ADMIN`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error("❌ Failed to seed admin:", err);
    } finally {
        await prisma.$disconnect();
    }
}

seedAdmin();
