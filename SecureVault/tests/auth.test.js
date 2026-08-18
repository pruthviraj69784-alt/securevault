const request  = require("supertest");
const app       = require("../src/app");
const mongoose  = require("mongoose");
const connectDB = require("../src/config/database");

const emailQueue = require("../src/queues/email.queue");
const fileQueue = require("../src/queues/file.queue");

const testEmail = `test-${Date.now()}@example.com`;

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await Promise.all([
        fileQueue.close(),
        emailQueue.close()
    ]);
    await mongoose.connection.close();
});

describe("Register User", () => {
    test("Should register successfully", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                name:     "Test User",
                email:    testEmail,
                password: "Password123"
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
    });
});

describe("Login", () => {
    test("Should return a JWT token on login", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email:    testEmail,
                password: "Password123"
            });

        const token = res.body.data?.token || res.body.token;
        expect(token).toBeDefined();
    });
});
