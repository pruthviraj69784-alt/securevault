const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const connectDB = require("../src/config/database");
const User = require("../src/models/user.model");
const Audit = require("../src/models/audit.model");

const emailQueue = require("../src/queues/email.queue");
const fileQueue = require("../src/queues/file.queue");

const testEmail = `audit-admin-${Date.now()}@example.com`;
let token;

beforeAll(async() => {
    await connectDB();

    await request(app)
        .post("/api/auth/register")
        .send({
            name: "Audit Admin User",
            email: testEmail,
            password: "Password123"
        });

    const adminUser = await User.findOneAndUpdate(
        { email: testEmail },
        { role: "ADMIN" },
        { new: true }
    );
    await Audit.create({
        user: adminUser._id,
        action: "TEST_AUDIT",
        status: "SUCCESS",
        ip: "127.0.0.1"
    });

    const res = await request(app)
        .post("/api/auth/login")
        .send({
            email: testEmail,
            password: "Password123"
        });

    token = res.body.data?.token || res.body.token;
});

afterAll(async() => {
    await Promise.all([
        fileQueue.close(),
        emailQueue.close()
    ]);
    await mongoose.connection.close();
});

describe("Audit API", () => {
    test("should return paginated audit logs with ipAddress data", async() => {
        const res = await request(app)
            .get("/api/audit?page=1")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.logs)).toBe(true);
        expect(typeof res.body.data.total).toBe("number");
        expect(res.body.data.logs[0]?.ipAddress).toBeDefined();
    });
});

describe("Admin API", () => {
    test("should return admin metrics payload", async() => {
        const res = await request(app)
            .get("/api/admin/metrics")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.totalUsers).toBe("number");
        expect(Array.isArray(res.body.data.uploadsByDay)).toBe(true);
    });
});
