const request  = require("supertest");
const app       = require("../src/app");
const path      = require("path");
const fs        = require("fs");
const mongoose  = require("mongoose");
const connectDB = require("../src/config/database");

const emailQueue = require("../src/queues/email.queue");
const fileQueue = require("../src/queues/file.queue");

let token;
let fileId;
const testEmail = `test-file-${Date.now()}@example.com`;
const eicarPath = path.join(__dirname, "eicar.txt");

beforeAll(async () => {
    await connectDB();

    // Create Eicar test malware file dynamically
    fs.writeFileSync(
        eicarPath,
        "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    );

    // Register and login to obtain a valid JWT token
    await request(app)
        .post("/api/auth/register")
        .send({
            name:     "Test User File",
            email:    testEmail,
            password: "Password123"
        });

    const res = await request(app)
        .post("/api/auth/login")
        .send({
            email:    testEmail,
            password: "Password123"
        });

    token = res.body.data?.token || res.body.token;
});

afterAll(async () => {
    try {
        fs.unlinkSync(eicarPath);
    } catch (err) {}
    await Promise.all([
        fileQueue.close(),
        emailQueue.close()
    ]);
    await mongoose.connection.close();
});

describe("File Upload — Version 1", () => {
    test("Should upload a new file and return Version 1", async () => {
        const res = await request(app)
            .post("/api/files/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("file", path.join(__dirname, "sample.pdf"));

        expect(res.statusCode).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.data.currentVersion).toBe(1);

        // Save fileId for subsequent version tests
        fileId = res.body.data._id;
    });
});

describe("File Upload — Version 2 (same filename)", () => {
    test("Should bump to Version 2 on re-upload of same filename", async () => {
        const res = await request(app)
            .post("/api/files/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("file", path.join(__dirname, "sample.pdf"));

        expect(res.statusCode).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.data.currentVersion).toBe(2);
    });
});

describe("File Upload — Virus Detection", () => {
    test("Should reject file containing Eicar malware signature with 400 Virus Detected", async () => {
        const res = await request(app)
            .post("/api/files/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("file", eicarPath);

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Virus Detected");
    });
});

describe("List Versions", () => {
    test("Should return all versions for the file", async () => {
        if (!fileId) return; // skip if upload failed

        const res = await request(app)
            .get(`/api/files/${fileId}/versions`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.versions.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.currentVersion).toBeGreaterThanOrEqual(1);
    });
});

describe("My Files", () => {
    test("Should return the authenticated user's file list", async () => {
        const res = await request(app)
            .get("/api/files/my-files")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

describe("Zero-Knowledge Encryption", () => {
    test("Should upload zero-knowledge file and record client IV & hash", async () => {
        const res = await request(app)
            .post("/api/files/upload")
            .set("Authorization", `Bearer ${token}`)
            .field("isZeroKnowledge", "true")
            .field("iv", "test-client-iv-123")
            .field("hash", "test-client-hash-123")
            .attach("file", path.join(__dirname, "sample.pdf"));

        expect(res.statusCode).toBe(202);
        expect(res.body.success).toBe(true);
        expect(res.body.data.version.isZeroKnowledge).toBe(true);
        expect(res.body.data.version.iv).toBe("test-client-iv-123");
        expect(res.body.data.version.hash).toBe("test-client-hash-123");
    });
});

