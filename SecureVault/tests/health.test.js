const request  = require("supertest");
const app       = require("../src/app");
const mongoose  = require("mongoose");
const connectDB = require("../src/config/database");

const emailQueue = require("../src/queues/email.queue");
const fileQueue = require("../src/queues/file.queue");

beforeAll(async () => {
    await connectDB();
}, 30000);

afterAll(async () => {
    await Promise.all([
        fileQueue.close(),
        emailQueue.close()
    ]);
    await mongoose.connection.close();
}, 15000);

describe("Health API", () => {
    test("GET /health returns 200 and healthy status", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe("Monitoring — /api/health", () => {
    test("Should return rich health check with DB status and uptime", async () => {
        const res = await request(app).get("/api/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("UP");
        expect(res.body.checks.database.status).toBe("UP");
        expect(res.body.uptime).toBeDefined();
        expect(res.body.memory).toBeDefined();
    });
});

describe("Monitoring — /api/metrics", () => {
    test("Should return in-memory request metrics", async () => {
        const res = await request(app).get("/api/metrics");
        expect(res.statusCode).toBe(200);
        expect(typeof res.body.requests.total).toBe("number");
        expect(res.body.uptime).toBeDefined();
        expect(res.body.memory).toBeDefined();
    });
});
