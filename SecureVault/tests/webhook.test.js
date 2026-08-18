const request  = require("supertest");
const app       = require("../src/app");
const mongoose  = require("mongoose");
const connectDB = require("../src/config/database");

const emailQueue = require("../src/queues/email.queue");
const fileQueue = require("../src/queues/file.queue");

let token;
const testEmail = `test-webhook-${Date.now()}@example.com`;

beforeAll(async () => {
    await connectDB();

    await request(app)
        .post("/api/auth/register")
        .send({ name: "Webhook User", email: testEmail, password: "Password123" });

    const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "Password123" });

    token = res.body.data?.token || res.body.token;
}, 30000);

afterAll(async () => {
    await Promise.all([
        fileQueue.close(),
        emailQueue.close()
    ]);
    await mongoose.connection.close();
}, 15000);

describe("Webhook Registration", () => {
    test("Should register a webhook URL and return 201", async () => {
        const res = await request(app)
            .post("/api/webhooks")
            .set("Authorization", `Bearer ${token}`)
            .send({
                url:    "https://example.com/hook",
                events: ["FILE_SHARED"]
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.url).toBe("https://example.com/hook");
        expect(res.body.data.isActive).toBe(true);
    });

    test("Should reject invalid URL format with 400", async () => {
        const res = await request(app)
            .post("/api/webhooks")
            .set("Authorization", `Bearer ${token}`)
            .send({
                url:    "invalid-url",
                events: ["FILE_SHARED"]
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("Should reject invalid event names with 400", async () => {
        const res = await request(app)
            .post("/api/webhooks")
            .set("Authorization", `Bearer ${token}`)
            .send({
                url:    "https://example.com/hook",
                events: ["INVALID_EVENT"]
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe("Webhook Listing", () => {
    test("Should return a list of registered webhooks", async () => {
        const res = await request(app)
            .get("/api/webhooks")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
});

describe("Webhook Deletion", () => {
    test("Should delete a webhook by ID", async () => {
        // Register one to delete
        const createRes = await request(app)
            .post("/api/webhooks")
            .set("Authorization", `Bearer ${token}`)
            .send({ url: "https://example.com/to-delete", events: ["FILE_SHARED"] });

        const id = createRes.body.data._id;

        const deleteRes = await request(app)
            .delete(`/api/webhooks/${id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(deleteRes.statusCode).toBe(200);
        expect(deleteRes.body.success).toBe(true);
    });
});
